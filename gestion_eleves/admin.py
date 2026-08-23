from django.contrib import admin
from django.utils.html import format_html
from django import forms
from django.core.exceptions import ValidationError
from django.contrib import messages
from .models import (
    AnneeAcademique, Faculte, Portail, Filiere,
    UniteEnseignement, Matiere, Etudiant, Note,
    ResultatSemestre, ParametresUCCB, CompteEtudiant
)


# ═══════════════════════════════════════════════════════════════
# FORMULAIRES AVEC FILTRES DYNAMIQUES
# ═══════════════════════════════════════════════════════════════

class EtudiantAdminForm(forms.ModelForm):
    class Meta:
        model = Etudiant
        fields = '__all__'
        widgets = {
            'date_naissance': forms.DateInput(
                attrs={'type': 'date', 'placeholder': 'AAAA-MM-JJ'},
                format='%Y-%m-%d'
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        faculte_id = None

        if self.data.get('faculte'):
            try:
                faculte_id = int(self.data['faculte'])
            except (ValueError, TypeError):
                pass
        elif self.instance and self.instance.pk and self.instance.faculte_id:
            faculte_id = self.instance.faculte_id

        if faculte_id:
            self.fields['portail'].queryset = (
                Portail.objects
                .filter(faculte_id=faculte_id)
                .select_related('faculte')
            )
            self.fields['filiere'].queryset = (
                Filiere.objects
                .filter(faculte_id=faculte_id)
                .select_related('faculte')
            )
        else:
            self.fields['portail'].queryset = (
                Portail.objects.select_related('faculte').all()
            )
            self.fields['filiere'].queryset = (
                Filiere.objects.select_related('faculte').all()
            )

        self.fields['portail'].help_text = (
            "⚠️ S1 et S2 uniquement — choisissez un portail de la même faculté"
        )
        self.fields['filiere'].help_text = (
            "⚠️ S3 et au-delà uniquement — choisissez une filière de la même faculté"
        )
        self.fields['portail'].required = False
        self.fields['filiere'].required = False

    def clean(self):
        cd = super().clean()
        sem = cd.get('semestre', 'S1')
        n = int(sem[1:]) if sem else 1
        p = cd.get('portail')
        f = cd.get('filiere')
        fac = cd.get('faculte')

        if n <= 2:
            if f:
                self.add_error('filiere', "S1/S2 : laissez le champ Filière vide.")
            if not p:
                self.add_error('portail', "S1/S2 : un Portail est obligatoire.")
            if p and fac and p.faculte_id != fac.id:
                self.add_error('portail', f"Ce portail appartient à '{p.faculte}', pas à la faculté sélectionnée.")
        else:
            if p:
                self.add_error('portail', "S3+ : laissez le champ Portail vide.")
            if not f:
                self.add_error('filiere', "S3+ : une Filière est obligatoire.")
            if f and fac and f.faculte_id != fac.id:
                self.add_error('filiere', f"Cette filière appartient à '{f.faculte}', pas à la faculté sélectionnée.")
        return cd


class UEAdminForm(forms.ModelForm):
    class Meta:
        model = UniteEnseignement
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        sem = cleaned_data.get('semestre', '')
        portail = cleaned_data.get('portail')
        filiere = cleaned_data.get('filiere')

        if portail and filiere:
            raise forms.ValidationError(
                "Une UE ne peut pas avoir à la fois un Portail et une Filière. Choisissez l'un ou l'autre."
            )

        if sem in ['S1', 'S2']:
            if filiere:
                self.add_error('filiere', "S1/S2 : pas de filière pour une UE.")
            if not portail:
                self.add_error('portail', "S1/S2 : portail obligatoire.")
        elif sem:
            if portail:
                self.add_error('portail', "S3+ : pas de portail pour une UE.")
            if not filiere:
                self.add_error('filiere', "S3+ : filière obligatoire.")

        return cleaned_data


# ═══════════════════════════════════════════════════════════════
# ADMIN ÉTUDIANT
# ═══════════════════════════════════════════════════════════════

class MediaAdmin(admin.ModelAdmin):
    """Pour Django 5.x : Media class pour JS dynamique."""
    class Media:
        js = ('gestion_eleves/js/admin_etudiant.js',)


@admin.register(Etudiant)
class EtudiantAdmin(MediaAdmin):
    form = EtudiantAdminForm
    list_display = (
        'mat_badge', 'nom_complet', 'email', 'genre_icon',
        'nationalite', 'fac_badge', 'parcours_badge',
        'sem_badge', 'cycle', 'statut', 'en_regle', 'docs_liens'
    )
    list_filter = ('annee_academique', 'faculte', 'semestre', 'genre', 'cycle', 'statut', 'en_regle')
    list_editable = ('statut', 'en_regle')
    search_fields = ('matricule', 'nom', 'prenom', 'email')
    readonly_fields = ('matricule', 'cycle')
    ordering = ('nom', 'prenom')

    def get_form(self, request, obj=None, **kwargs):
        Form = super().get_form(request, obj, **kwargs)
        fac_id = obj.faculte_id if (obj and obj.faculte_id) else None

        if fac_id:
            portails_qs = Portail.objects.filter(faculte_id=fac_id).select_related('faculte')
            filieres_qs = Filiere.objects.filter(faculte_id=fac_id).select_related('faculte')
        else:
            portails_qs = Portail.objects.select_related('faculte').all()
            filieres_qs = Filiere.objects.select_related('faculte').all()

        class FormAvecOptions(Form):
            def __init__(self, *args, **kw):
                super().__init__(*args, **kw)
                self.fields['portail'].queryset = portails_qs
                self.fields['filiere'].queryset = filieres_qs

        return FormAvecOptions

    fieldsets = (
        ("🪪  IDENTITÉ PERSONNELLE", {
            'fields': (
                ('nom', 'prenom'),
                ('genre', 'date_naissance'),
                ('nationalite', 'email'),
                'telephone',
            )
        }),
        ("🎓  CURSUS ACADÉMIQUE", {
            'fields': (
                'annee_academique',
                'faculte',
                'semestre',
                ('portail', 'filiere'),
                ('matricule', 'cycle'),
            ),
            'description': (
                "⚠️ S1/S2 → Portail obligatoire, Filière vide. "
                "S3+ → Filière obligatoire, Portail vide."
            )
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'faculte', 'annee_academique', 'portail', 'filiere'
        )

    actions = ['archiver_resultats_action']

    @admin.action(description="📊 Calculer & Archiver les résultats du semestre")
    def archiver_resultats_action(self, request, queryset):
        from .engine import calculer_matrice
        semestres = queryset.values_list('semestre', flat=True).distinct()
        facs = queryset.values_list('faculte_id', flat=True).distinct()
        for sem in semestres:
            for fac_id in facs:
                calculer_matrice(fac_id, sem, save_results=True)
        self.message_user(request, "Résultats calculés et archivés.", messages.SUCCESS)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    # ── Affichage ──────────────────────────────────────────
    def mat_badge(self, o):
        return format_html('<code style="color:#c0392b;font-size:11px;">{}</code>', o.matricule)
    mat_badge.short_description = "Matricule"

    def nom_complet(self, o):
        return format_html('<b>{}</b> {}', o.nom.upper(), o.prenom)
    nom_complet.short_description = "Nom & Prénom"

    def genre_icon(self, o):
        return "👩" if o.genre == 'F' else "👨"
    genre_icon.short_description = "Genre"

    def fac_badge(self, o):
        return format_html(
            '<span style="background:#0a1628;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">{}</span>',
            o.faculte.code if o.faculte else "—"
        )
    fac_badge.short_description = "Faculté"

    def parcours_badge(self, o):
        p = o.get_parcours()
        c = "#1a3a7c" if o.semestre in ['S1', 'S2'] else "#6d28d9"
        return format_html('<span style="color:{};font-weight:600;font-size:12px;">{}</span>', c, p)
    parcours_badge.short_description = "Portail / Filière"

    def sem_badge(self, o):
        return format_html(
            '<span style="background:#27ae60;color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;">{}</span>',
            o.semestre
        )
    sem_badge.short_description = "Semestre"

    def docs_liens(self, o):
        return format_html(
            '<a href="/attestation/{}/" target="_blank" '
            'style="background:#1a3a7c;color:#fff;padding:2px 7px;border-radius:3px;text-decoration:none;margin-right:3px;">📜 Attest.</a>'
            '<a href="/releve/{}/" target="_blank" '
            'style="background:#27ae60;color:#fff;padding:2px 7px;border-radius:3px;text-decoration:none;">📊 Relevé</a>',
            o.id, o.id
        )
    docs_liens.short_description = "Documents"


# ═══════════════════════════════════════════════════════════════
# ADMIN NOTE
# ═══════════════════════════════════════════════════════════════

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'mat_str', 'semestre', 'note_devoir',
                    'note_session', 'sr_display', 'moy_color', 'est_absent')
    list_filter = ('semestre', 'est_absent', 'matiere__ue__portail__faculte')
    search_fields = ('etudiant__nom', 'etudiant__matricule', 'matiere__nom')
    readonly_fields = ('moyenne_stockee',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'etudiant', 'matiere', 'matiere__ue'
        )

    def mat_str(self, o):
        return f"{o.matiere.nom} ({o.matiere.ue.code_ue})"
    mat_str.short_description = "Matière"

    def sr_display(self, o):
        return o.note_sr if o.note_sr is not None else "—"
    sr_display.short_description = "Rattrapage"

    def moy_color(self, o):
        m = float(o.moyenne_stockee)
        c = "#27ae60" if m >= 10 else ("#e67e22" if m >= 6 else "#e74c3c")
        return format_html('<b style="color:{};">{:.2f}</b>', c, m)
    moy_color.short_description = "Moyenne"


# ═══════════════════════════════════════════════════════════════
# ADMIN UE & MATIÈRE
# ═══════════════════════════════════════════════════════════════

@admin.register(UniteEnseignement)
class UEAdmin(admin.ModelAdmin):
    form = UEAdminForm
    list_display = ('code_ue', 'nom', 'semestre', 'cred_total', 'rattachement', 'fac_display')
    list_filter = ('semestre', 'portail__faculte', 'filiere__faculte')
    search_fields = ('code_ue', 'nom')

    def cred_total(self, o):
        return f"{o.credits_total} cr."
    cred_total.short_description = "Crédits"

    def rattachement(self, o):
        if o.portail:
            return format_html('🏫 <b>{}</b>', o.portail.nom)
        if o.filiere:
            return format_html('🎯 <b>{}</b>', o.filiere.nom)
        return "—"
    rattachement.short_description = "Rattachement"

    def fac_display(self, o):
        if o.portail:
            return o.portail.faculte.code
        if o.filiere and o.filiere.faculte:
            return o.filiere.faculte.code
        return "—"
    fac_display.short_description = "Faculté"

    class Media:
        js = ('gestion_eleves/admin/ue_toggle.js',)


@admin.register(Matiere)
class MatiereAdmin(admin.ModelAdmin):
    list_display = ('code_display', 'nom', 'ue_display', 'sem_display', 'credits')
    list_filter = ('ue__semestre', 'ue__portail__faculte')
    search_fields = ('nom', 'ue__code_ue', 'ue__nom')

    def code_display(self, o):
        return format_html(
            '<code style="background:#ecf0f1;padding:2px 6px;border-radius:3px;">{}</code>',
            o.code
        )
    code_display.short_description = "Code UE"

    def ue_display(self, o):
        return f"[{o.ue.code_ue}] {o.ue.nom}"
    ue_display.short_description = "UE"

    def sem_display(self, o):
        return o.ue.semestre
    sem_display.short_description = "Semestre"


# ═══════════════════════════════════════════════════════════════
# ADMIN FACULTÉ, PORTAIL, FILIÈRE
# ═══════════════════════════════════════════════════════════════

@admin.register(Faculte)
class FaculteAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'logo_thumb', 'info_doyen', 'info_vice_doyen')
    search_fields = ('nom', 'code')

    def logo_thumb(self, o):
        if o.logo:
            return format_html('<img src="{}" style="height:36px;border-radius:4px;">', o.logo.url)
        return "—"
    logo_thumb.short_description = "Logo"

    def info_doyen(self, o):
        return f"{o.titre_doyen()} : {o.nom_doyen or '—'}"
    info_doyen.short_description = "Doyen(ne)"

    def info_vice_doyen(self, o):
        return f"{o.titre_vice_doyen()} : {o.nom_vice_doyen or '—'}"
    info_vice_doyen.short_description = "Vice-Doyen(ne)"


@admin.register(Portail)
class PortailAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'faculte', 'nb_ues', 'nb_filieres', 'nb_etudiants')
    list_filter = ('faculte',)
    search_fields = ('nom', 'code', 'faculte__nom')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('faculte').prefetch_related('filieres')

    def nb_ues(self, o):
        return o.unites.count()
    nb_ues.short_description = "Nombre d'UEs"

    def nb_filieres(self, o):
        return o.filieres.count()
    nb_filieres.short_description = "Filières liées"

    def nb_etudiants(self, o):
        return Etudiant.objects.filter(portail=o).count()
    nb_etudiants.short_description = "Étudiants"


@admin.register(Filiere)
class FiliereAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'fac_code', 'get_portails', 'nb_etudiants')
    list_filter = ('faculte', 'portails')
    search_fields = ('nom', 'code', 'faculte__nom')
    filter_horizontal = ('portails',)  # Double boîte de sélection pratique pour la relation N-N

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('faculte').prefetch_related('portails')

    def fac_code(self, o):
        return o.faculte.code if o.faculte else "—"
    fac_code.short_description = "Faculté"

    def get_portails(self, o):
        portails = o.portails.all()
        if not portails:
            return "—"
        return format_html(", ".join([f'<span style="background:#f1f5f9;padding:2px 6px;border-radius:3px;">{p.code}</span>' for p in portails]))
    get_portails.short_description = "Portails d'accès"

    def nb_etudiants(self, o):
        return Etudiant.objects.filter(filiere=o).count()
    nb_etudiants.short_description = "Étudiants"


# ═══════════════════════════════════════════════════════════════
# ADMIN RÉSULTATS & PARAMÈTRES
# ═══════════════════════════════════════════════════════════════

@admin.register(ResultatSemestre)
class ResultatAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'semestre', 'annee', 'moy_disp', 'cred_disp', 'dec_disp', 'mention')
    list_filter = ('semestre', 'annee', 'decision')
    search_fields = ('etudiant__nom', 'etudiant__matricule')
    readonly_fields = (
        'etudiant', 'semestre', 'annee', 'moyenne_generale',
        'credits_obtenus', 'credits_totaux', 'decision', 'mention'
    )

    def has_add_permission(self, request):
        return False

    def moy_disp(self, o):
        m = float(o.moyenne_generale)
        c = "#27ae60" if m >= 10 else "#e74c3c"
        return format_html('<b style="color:{};">{:.2f}/20</b>', c, m)
    moy_disp.short_description = "Moyenne"

    def cred_disp(self, o):
        return f"{o.credits_obtenus}/{o.credits_totaux}"
    cred_disp.short_description = "Crédits"

    def dec_disp(self, o):
        c = "#27ae60" if o.decision == "ADMIS" else "#e74c3c"
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;border-radius:10px;">{}</span>',
            c, o.decision
        )
    dec_disp.short_description = "Décision"


@admin.register(ParametresUCCB)
class ParamsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not ParametresUCCB.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AnneeAcademique)
class AnneeAdmin(admin.ModelAdmin):
    list_display = ('nom', 'est_active')
    list_editable = ('est_active',)


@admin.register(CompteEtudiant)
class CompteEtudiantAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'get_nom', 'get_faculte', 'actif', 'date_creation')
    list_editable = ('actif',)
    list_filter = ('actif', 'etudiant__faculte')
    search_fields = ('etudiant__nom', 'etudiant__prenom', 'etudiant__matricule')
    readonly_fields = ('date_creation', 'mot_de_passe')
    ordering = ('etudiant__nom',)
    fieldsets = (
        ("Étudiant", {'fields': ('etudiant',)}),
        ("Accès", {'fields': ('actif', 'date_creation')}),
        ("Sécurité", {'fields': ('mot_de_passe',), 'classes': ('collapse',)}),
    )

    @admin.display(ordering='etudiant__nom', description='Nom complet')
    def get_nom(self, obj):
        return f"{obj.etudiant.nom} {obj.etudiant.prenom}" if obj.etudiant else "—"

    @admin.display(ordering='etudiant__faculte', description='Faculté')
    def get_faculte(self, obj):
        return obj.etudiant.faculte if obj.etudiant else "—"