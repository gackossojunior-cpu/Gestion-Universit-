from datetime import date
from django.db import models
from django.core.validators import (
    MinValueValidator, MaxValueValidator,
    RegexValidator, EmailValidator
)
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save
from django.dispatch import receiver

# ── Validateurs ───────────────────────────────────────────────
nom_validator = RegexValidator(
    r'^[a-zA-ZÀ-ÿ\s\-]+$',
    "Lettres, espaces et tirets uniquement."
)

SEMESTRES = [(f'S{i}', f'Semestre {i}') for i in range(1, 11)]


# ═══════════════════════════════════════════════════════════════
# 1. ORGANISATION
# ═══════════════════════════════════════════════════════════════

class AnneeAcademique(models.Model):
    nom = models.CharField(
        max_length=9, unique=True,
        help_text="Format obligatoire : 2025-2026",
        validators=[RegexValidator(r'^\d{4}-\d{4}$', "Format : AAAA-AAAA")]
    )
    est_active = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Année Académique"
        verbose_name_plural = "Années Académiques"
        ordering = ['-nom']

    def save(self, *args, **kwargs):
        # Une seule année active à la fois
        if self.est_active:
            AnneeAcademique.objects.exclude(pk=self.pk).update(est_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom


class Faculte(models.Model):
    GENRE = [('M', 'Masculin'), ('F', 'Féminin')]

    nom = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, help_text="Ex: FST")
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    genre_doyen = models.CharField(max_length=1, choices=GENRE, default='M')
    nom_doyen = models.CharField(max_length=100, blank=True, null=True)
    genre_vice_doyen = models.CharField(max_length=1, choices=GENRE, default='M')
    nom_vice_doyen = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        verbose_name = "Faculté"
        verbose_name_plural = "Facultés"
        ordering = ['nom']

    def titre_doyen(self):
        return "La Doyenne" if self.genre_doyen == 'F' else "Le Doyen"

    def titre_vice_doyen(self):
        return "La Vice-Doyenne" if self.genre_vice_doyen == 'F' else "Le Vice-Doyen"

    def signataire_pv(self):
        """Signataire de la matrice A3 = Doyen/Doyenne."""
        return self.titre_doyen(), (self.nom_doyen or '—')

    def __str__(self):
        return f"{self.nom} ({self.code})"


class ParametresUCCB(models.Model):
    nom_secretaire = models.CharField(max_length=200, verbose_name="Nom du Secrétaire Universitaire")
    genre_secretaire = models.CharField(
        max_length=1, choices=[('M', 'Masculin'), ('F', 'Féminin')], default='M'
    )
    ville_signature = models.CharField(max_length=100, default="Liambou")

    class Meta:
        verbose_name = "Paramètres Généraux UCCB"
        verbose_name_plural = "Paramètres Généraux UCCB"

    def titre_secretaire(self):
        if self.genre_secretaire == 'F':
            return "La Secrétaire Universitaire"
        return "Le Secrétaire Universitaire"

    def __str__(self):
        return "Paramètres Généraux UCCB"


class Portail(models.Model):
    """Tronc commun S1-S2. Ex: MIP, BCG, PCG pour la FST."""
    faculte = models.ForeignKey(Faculte, on_delete=models.CASCADE, related_name='portails')
    nom = models.CharField(max_length=100)
    code = models.CharField(max_length=10, help_text="Ex: MIP, BCG, PCG")

    class Meta:
        verbose_name = "Portail (Tronc Commun)"
        verbose_name_plural = "Portails (Troncs Communs)"
        unique_together = [('faculte', 'code')]
        ordering = ['faculte', 'nom']

    def __str__(self):
        return f"{self.nom} — {self.faculte.code}"


class Filiere(models.Model):
    """Spécialisation S3+. Rattachée directement à une Faculté et liée aux Portails d'accès."""
    faculte = models.ForeignKey(
        Faculte, on_delete=models.CASCADE, related_name='filieres',
        help_text="Faculté de cette filière", null=True, blank=True
    )
    nom = models.CharField(max_length=100)
    code = models.CharField(max_length=10, help_text="Ex: INFO, BIO, PHYS")
    portails = models.ManyToManyField(
        Portail,
        related_name='filieres',
        blank=True,
        help_text="Portails (S1-S2) donnant accès à cette filière"
    )

    class Meta:
        verbose_name = "Filière"
        verbose_name_plural = "Filières"
        unique_together = [('faculte', 'code')]
        ordering = ['faculte', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.faculte.code if self.faculte else '—'})"


# ═══════════════════════════════════════════════════════════════
# 2. ENSEIGNEMENT
# ═══════════════════════════════════════════════════════════════

class UniteEnseignement(models.Model):
    nom = models.CharField(max_length=100)
    code_ue = models.CharField(max_length=20, unique=True)
    semestre = models.CharField(max_length=3, choices=SEMESTRES)
    portail = models.ForeignKey(
        Portail, on_delete=models.CASCADE, null=True, blank=True,
        related_name='unites', help_text="Obligatoire pour S1-S2"
    )
    filiere = models.ForeignKey(
        Filiere, on_delete=models.CASCADE, null=True, blank=True,
        related_name='unites', help_text="Obligatoire pour S3+"
    )

    class Meta:
        verbose_name = "Unité d'Enseignement (UE)"
        verbose_name_plural = "Unités d'Enseignement (UE)"
        ordering = ['semestre', 'code_ue']

    @property
    def credits_total(self):
        return sum(m.credits for m in self.matieres.all())

    def clean(self):
        if self.semestre in ['S1', 'S2']:
            if not self.portail:
                raise ValidationError("S1/S2 : l'UE doit être liée à un Portail.")
            if self.filiere:
                raise ValidationError("S1/S2 : l'UE ne peut PAS être liée à une Filière.")
        else:
            if not self.filiere:
                raise ValidationError("S3+ : l'UE doit être liée à une Filière.")
            if self.portail:
                raise ValidationError("S3+ : l'UE ne peut PAS être liée à un Portail.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.code_ue}] {self.nom} ({self.semestre})"


class Matiere(models.Model):
    ue = models.ForeignKey(UniteEnseignement, on_delete=models.CASCADE, related_name='matieres')
    nom = models.CharField(max_length=100)
    credits = models.IntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Entre 1 et 10 crédits"
    )

    class Meta:
        verbose_name = "Matière"
        verbose_name_plural = "Matières"
        ordering = ['ue', 'nom']

    @property
    def code(self):
        return self.ue.code_ue

    def __str__(self):
        return f"{self.ue.code_ue} — {self.nom} ({self.credits} cr.)"


# ═══════════════════════════════════════════════════════════════
# 3. ÉTUDIANTS
# ═══════════════════════════════════════════════════════════════

def valider_date_naissance(valeur):
    aujourd_hui = date.today()
    age = aujourd_hui.year - valeur.year - (
            (aujourd_hui.month, aujourd_hui.day) < (valeur.month, valeur.day)
    )
    if age < 10:
        raise ValidationError(
            f"Date de naissance invalide : l'étudiant aurait {age} an(s). "
            "Un étudiant doit avoir au moins 10 ans."
        )
    if age > 80:
        raise ValidationError(
            f"Date de naissance invalide : {age} ans est trop élevé."
        )
    if valeur > aujourd_hui:
        raise ValidationError("La date de naissance ne peut pas être dans le futur.")


class Etudiant(models.Model):
    GENRE = [('M', 'Masculin'), ('F', 'Féminin')]

    # ── Identité ─────────────────────────────────────────────
    nom = models.CharField(max_length=100, validators=[nom_validator])
    prenom = models.CharField(max_length=100, validators=[nom_validator])
    genre = models.CharField(max_length=1, choices=GENRE)
    date_naissance = models.DateField(validators=[valider_date_naissance])
    nationalite = models.CharField(max_length=50, default="Congolaise")
    email = models.EmailField(unique=True, validators=[EmailValidator()])
    telephone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Numéro de téléphone"
    )

    # ── Cursus ───────────────────────────────────────────────
    matricule = models.CharField(max_length=35, unique=True, editable=False, blank=True)
    annee_academique = models.ForeignKey(AnneeAcademique, on_delete=models.PROTECT)
    faculte = models.ForeignKey(Faculte, on_delete=models.PROTECT)
    portail = models.ForeignKey(
        Portail, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="S1 et S2 uniquement"
    )
    filiere = models.ForeignKey(
        Filiere, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="S3 et au-delà uniquement"
    )
    semestre = models.CharField(max_length=3, choices=SEMESTRES, default='S1')
    cycle = models.CharField(max_length=20, editable=False, blank=True)

    # ── Statut Financier & Académique ────────────────────────
    en_regle = models.BooleanField(
        default=True,
        verbose_name="En règle financièrement",
        help_text="Décocher si l'étudiant a des impayés. Géré par le secrétariat ou le module finance."
    )

    STATUT_CHOICES = [
        ('actif', 'Actif — étudiant en cours'),
        ('diplome', 'Diplômé — a terminé son cycle'),
        ('abandonne', 'Abandonné — a quitté sans terminer'),
    ]
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='actif',
        verbose_name="Statut de l'étudiant",
        help_text="Actif = visible dans les classes. Diplômé/Abandonné = conserve son compte et ses relevés."
    )

    class Meta:
        verbose_name = "Étudiant"
        verbose_name_plural = "Étudiants"
        ordering = ['nom', 'prenom']

    def get_age(self):
        if not self.date_naissance:
            return 0
        t = date.today()
        return t.year - self.date_naissance.year - (
                (t.month, t.day) < (self.date_naissance.month, self.date_naissance.day)
        )

    def get_parcours(self):
        if self.semestre in ['S1', 'S2']:
            return self.portail.nom if self.portail else "Tronc Commun"
        return self.filiere.nom if self.filiere else "Spécialisation"

    def get_titre(self):
        return "Monsieur" if self.genre == 'M' else "Madame"

    def get_qualite(self):
        return "étudiant" if self.genre == 'M' else "étudiante"

    def _compute_cycle(self):
        n = int(self.semestre[1:])
        if n <= 2:  return "Licence 1"
        if n <= 4:  return "Licence 2"
        if n <= 6:  return "Licence 3"
        return "Master"

    def _generate_matricule(self):
        annee = str(self.annee_academique.nom)[2:4]
        fac = self.faculte.code.upper().replace(' ', '')[:3] if self.faculte else 'UNK'
        nom3 = self.nom.upper().replace(' ', '').replace('-', '')[:3].ljust(3, 'X')
        pre2 = self.prenom.upper().replace(' ', '').replace('-', '')[:2].ljust(2, 'X')

        last_etudiant = Etudiant.objects.order_by('-id').first()
        num = (last_etudiant.id + 1) if last_etudiant else 1
        return f"UCCB{annee}{fac}{nom3}{pre2}{num:05d}"

    def clean(self):
        n = int(self.semestre[1:]) if self.semestre else 1

        if n <= 2:
            if self.filiere:
                raise ValidationError({'filiere': "Un étudiant en S1/S2 ne peut pas avoir de filière."})
            if not self.portail:
                raise ValidationError({'portail': "Un étudiant en S1/S2 doit avoir un portail."})
            if self.portail and self.faculte_id and self.portail.faculte_id != self.faculte_id:
                raise ValidationError({'portail': "Ce portail n'appartient pas à la faculté sélectionnée."})
        else:
            if self.portail:
                raise ValidationError({'portail': "Un étudiant en S3+ ne peut pas avoir de portail."})
            if not self.filiere:
                raise ValidationError({'filiere': "Un étudiant en S3+ doit avoir une filière."})
            if self.filiere and self.faculte_id and self.filiere.faculte_id != self.faculte_id:
                raise ValidationError({'filiere': "Cette filière n'appartient pas à la faculté sélectionnée."})

    def save(self, *args, **kwargs):
        n = int(self.semestre[1:]) if self.semestre else 1
        if n <= 2:
            self.filiere = None
        else:
            self.portail = None
        self.cycle = self._compute_cycle()
        if not self.matricule:
            self.matricule = self._generate_matricule()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.matricule} — {self.nom.upper()} {self.prenom}"


# ═══════════════════════════════════════════════════════════════
# 4. COMPTE ÉTUDIANT & NOTES
# ═══════════════════════════════════════════════════════════════

class CompteEtudiant(models.Model):
    """Compte de connexion lié à un étudiant (email + mot de passe hashé)."""
    etudiant = models.OneToOneField(
        Etudiant, on_delete=models.CASCADE,
        related_name='compte_etudiant', verbose_name="Étudiant"
    )
    mot_de_passe = models.CharField(
        max_length=128, verbose_name="Mot de passe (hashé)"
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    actif = models.BooleanField(
        default=True,
        verbose_name="Compte actif",
        help_text="Désactiver pour bloquer l'accès sans supprimer le compte."
    )

    class Meta:
        verbose_name = "Compte Étudiant"
        verbose_name_plural = "Comptes Étudiants"

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.mot_de_passe = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.mot_de_passe)

    def __str__(self):
        return f"Compte de {self.etudiant}"


class Note(models.Model):
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='notes')
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='notes')
    semestre = models.CharField(max_length=3, choices=SEMESTRES)
    note_devoir = models.DecimalField(
        max_digits=4, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)]
    )
    note_session = models.DecimalField(
        max_digits=4, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)]
    )
    note_sr = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        verbose_name="Rattrapage (SR)"
    )
    moyenne_stockee = models.DecimalField(max_digits=4, decimal_places=2, default=0, editable=False)
    est_absent = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Note"
        verbose_name_plural = "Notes"
        unique_together = [('etudiant', 'matiere', 'semestre')]
        ordering = ['etudiant', 'semestre', 'matiere']

    def calculer(self):
        if self.est_absent:
            return 0.0
        d, s = float(self.note_devoir), float(self.note_session)
        m_normale = (d + s) / 2
        if self.note_sr is not None:
            sr = float(self.note_sr)
            m_sr = (d + 2 * sr) / 3
            return round(max(m_normale, m_sr), 2)
        return round(m_normale, 2)

    def save(self, *args, **kwargs):
        self.moyenne_stockee = self.calculer()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.etudiant.matricule} | {self.matiere.nom} | {self.semestre} → {self.moyenne_stockee}"


class ResultatSemestre(models.Model):
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='resultats')
    semestre = models.CharField(max_length=3, choices=SEMESTRES)
    annee = models.ForeignKey(AnneeAcademique, on_delete=models.CASCADE)
    moyenne_generale = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    credits_obtenus = models.IntegerField(default=0)
    credits_totaux = models.IntegerField(default=0)
    decision = models.CharField(max_length=20, default="AJOURNÉ")
    mention = models.CharField(max_length=20, default="NÉANT")
    est_archive = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Résultat de Semestre"
        verbose_name_plural = "Résultats de Semestre"
        unique_together = [('etudiant', 'semestre', 'annee')]
        ordering = ['etudiant', 'semestre']

    def __str__(self):
        return f"{self.etudiant.matricule} | {self.semestre} | {self.decision} ({self.moyenne_generale})"


# ═══════════════════════════════════════════════════════════════
# 5. SIGNAL — Inscription automatique aux matières
# ═══════════════════════════════════════════════════════════════

@receiver(post_save, sender=Etudiant)
def inscrire_aux_matieres(sender, instance, **kwargs):
    """
    Inscrit automatiquement l'étudiant aux matières de son semestre/parcours actuel.
    Fonctionne à la création ET lors du passage au semestre supérieur.
    """
    if instance.semestre in ['S1', 'S2'] and instance.portail:
        ues = UniteEnseignement.objects.filter(
            portail=instance.portail, semestre=instance.semestre
        )
    elif instance.semestre not in ['S1', 'S2'] and instance.filiere:
        ues = UniteEnseignement.objects.filter(
            filiere=instance.filiere, semestre=instance.semestre
        )
    else:
        return

    for ue in ues:
        for mat in ue.matieres.all():
            Note.objects.get_or_create(
                etudiant=instance,
                matiere=mat,
                semestre=instance.semestre
            )


# ═══════════════════════════════════════════════════════════════
# 6. RESSOURCES HUMAINES (Espace RH)
# ═══════════════════════════════════════════════════════════════
# NOTE POUR L'ÉQUIPE : le modèle Enseignant ci-dessous est une base
# FONCTIONNELLE pour que l'Espace RH marche dès maintenant. La création
# réelle des enseignants se fera côté Espace Faculté (en cours de
# développement par un collègue) — il devra probablement adapter/étendre
# ce modèle (ex: lier un compte de connexion, ajouter le suivi des
# modules/crédits enseignés côté Faculté). Côté RH on n'a volontairement
# PAS besoin des crédits/modules : juste faculté, filière (= département),
# statut, et les semestres d'intervention dans l'année académique en cours.

class Enseignant(models.Model):
    """Enseignant de l'université — enregistré et géré par l'Espace RH
    (comme n'importe quel autre travailleur). L'Espace Faculté consomme
    ces données en lecture (via InterventionEnseignant) pour savoir qui
    intervient sur quel semestre, mais ne crée plus d'enseignant lui-même.
    """
    GENRE = [('M', 'Masculin'), ('F', 'Féminin')]
    STATUT_CHOICES = [
        ('vacataire', 'Vacataire'),
        ('permanent', 'Permanent'),
    ]

    matricule = models.CharField(max_length=20, unique=True, editable=False, blank=True)

    # ── Identité ────────────────────────────────────────────
    nom = models.CharField(max_length=100, validators=[nom_validator])
    prenom = models.CharField(max_length=100, validators=[nom_validator])
    genre = models.CharField(max_length=1, choices=GENRE, default='M')
    date_naissance = models.DateField(null=True, blank=True)
    lieu_naissance = models.CharField(max_length=100, blank=True, null=True)
    nationalite = models.CharField(max_length=60, default='Congolaise', blank=True)

    # ── Coordonnées ─────────────────────────────────────────
    email = models.EmailField(unique=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    adresse = models.CharField(max_length=200, blank=True, null=True)
    rib = models.CharField(
        max_length=50, blank=True, null=True,
        verbose_name="RIB (coordonnées bancaires)",
        help_text="Pour le versement du salaire / des vacations par l'Espace Finance"
    )

    # ── Sécurité sociale & parcours ─────────────────────────
    numero_secu = models.CharField(
        max_length=40, blank=True, null=True,
        verbose_name="Numéro de sécurité sociale / CNSS"
    )
    diplome = models.CharField(
        max_length=100, blank=True, null=True,
        verbose_name="Diplôme le plus élevé"
    )

    # ── Rattachement académique ──────────────────────────────
    # Pour un PERMANENT : faculté/filière = son département d'attache
    # (obligatoire). Pour un VACATAIRE : ces deux champs sont vides — ses
    # interventions (potentiellement dans plusieurs facultés/filières,
    # semestre par semestre) vivent dans AffectationVacataire ci-dessous.
    faculte = models.ForeignKey(
        Faculte, on_delete=models.PROTECT, related_name='enseignants',
        null=True, blank=True
    )
    filiere = models.ForeignKey(
        Filiere, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='enseignants',
        help_text="Département de rattachement (une filière = un département)"
    )
    annee_academique = models.ForeignKey(
        AnneeAcademique, on_delete=models.PROTECT, related_name='enseignants',
        help_text="Année académique de référence de cet enseignant"
    )
    chef_departement = models.BooleanField(
        default=False, verbose_name="Chef de filière / département"
    )

    # ── Contrat & rémunération ───────────────────────────────
    # Vacataire : payé aux heures (taux_horaire), pas de salaire fixe.
    # Permanent : salaire mensuel fixe, pas de taux horaire.
    # La validation (un seul des deux renseigné selon le statut) se fait
    # côté API (api_rh.py), pas ici, pour renvoyer un message clair.
    statut = models.CharField(max_length=12, choices=STATUT_CHOICES, default='vacataire')
    date_debut_contrat = models.DateField(null=True, blank=True)
    date_fin_contrat = models.DateField(
        null=True, blank=True,
        help_text="Laisser vide pour un permanent (CDI). Obligatoire pour un vacataire."
    )
    taux_horaire = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Montant par heure de cours (vacataire uniquement)"
    )
    salaire_mensuel = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Salaire mensuel fixe (permanent uniquement)"
    )

    actif = models.BooleanField(
        default=True,
        help_text="Intervient activement au sein de l'année académique en cours"
    )
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Enseignant"
        verbose_name_plural = "Enseignants"
        ordering = ['nom', 'prenom']

    def get_titre(self):
        return "Monsieur" if self.genre == 'M' else "Madame"

    def contrat_expire(self):
        """True si un contrat de vacataire est arrivé à échéance —
        utilisé côté RH pour signaler visuellement les renouvellements
        à faire, sans jamais désactiver l'enseignant automatiquement."""
        from datetime import date
        return bool(self.date_fin_contrat and self.date_fin_contrat < date.today())

    def _generate_matricule(self):
        last = Enseignant.objects.order_by('-id').first()
        num = (last.id + 1) if last else 1
        return f"UCCB-ENS-{num:05d}"

    def save(self, *args, **kwargs):
        if not self.matricule:
            self.matricule = self._generate_matricule()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.matricule} — {self.nom.upper()} {self.prenom} ({self.get_statut_display()})"


class InterventionEnseignant(models.Model):
    """Trace les semestres où un enseignant intervient, pour une année
    académique donnée — permet à l'Espace RH d'afficher 'intervient en
    S1, S3...' pour l'année en cours sans dupliquer la logique de
    modules/crédits qui reste gérée côté Espace Faculté."""
    enseignant = models.ForeignKey(
        Enseignant, on_delete=models.CASCADE, related_name='interventions'
    )
    annee_academique = models.ForeignKey(AnneeAcademique, on_delete=models.CASCADE)
    semestre = models.CharField(max_length=3, choices=SEMESTRES)

    class Meta:
        verbose_name = "Intervention Enseignant"
        verbose_name_plural = "Interventions Enseignants"
        unique_together = [('enseignant', 'annee_academique', 'semestre')]
        ordering = ['semestre']

    def __str__(self):
        return f"{self.enseignant} — {self.semestre} ({self.annee_academique})"


class AffectationVacataire(models.Model):
    """
    Une ligne = une intervention d'un enseignant VACATAIRE, pour un
    semestre donné, dans une faculté, et sur UNE SEULE portée précise :
    soit un portail (tronc commun S1-S2), soit une filière (S3+), soit
    ni l'un ni l'autre (cours transversal à toute la faculté, ex: anglais).
    Un même vacataire peut avoir plusieurs affectations : plusieurs
    facultés, plusieurs portails/filières, plusieurs semestres.

    C'est la "fiche d'engagement" / état prévisionnel du volume horaire
    que la Faculté utilise pour vérifier, une fois le semestre terminé,
    que le volume a bien été fait avant de transmettre l'info à la Finance
    pour le paiement.
    """
    enseignant = models.ForeignKey(
        Enseignant, on_delete=models.CASCADE, related_name='affectations',
        limit_choices_to={'statut': 'vacataire'}
    )
    faculte = models.ForeignKey(Faculte, on_delete=models.CASCADE, related_name='affectations_vacataires')
    portail = models.ForeignKey(
        Portail, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='affectations_vacataires',
        help_text="Tronc commun S1-S2 (laisser vide si filière ou toute la faculté)"
    )
    filiere = models.ForeignKey(
        Filiere, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='affectations_vacataires',
        help_text="Laisser vide si l'intervention concerne toute la faculté (ex: cours transversal)"
    )
    semestre = models.CharField(max_length=3, choices=SEMESTRES)
    volume_horaire_prevu = models.DecimalField(
        max_digits=6, decimal_places=1,
        help_text="Nombre d'heures prévues (fiche d'engagement) pour ce semestre"
    )
    volume_confirme_faculte = models.BooleanField(
        default=False,
        help_text="Coché par la Faculté une fois les heures effectivement réalisées — sert de feu vert pour la Finance"
    )
    date_confirmation = models.DateTimeField(null=True, blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Affectation Vacataire"
        verbose_name_plural = "Affectations Vacataires"
        ordering = ['semestre']

    def __str__(self):
        cible = self.filiere.nom if self.filiere else (self.portail.nom if self.portail else f"toute la {self.faculte.nom}")
        return f"{self.enseignant} — {cible} — {self.semestre}"


class HistoriqueVolumeHoraire(models.Model):
    """Trace chaque modification du volume horaire d'une affectation
    (ex : cours reporté, professeur malade, heures rajoutées) — pour
    garder une preuve de pourquoi la fiche d'engagement a changé."""
    affectation = models.ForeignKey(
        AffectationVacataire, on_delete=models.CASCADE, related_name='historique'
    )
    ancien_volume = models.DecimalField(max_digits=6, decimal_places=1)
    nouveau_volume = models.DecimalField(max_digits=6, decimal_places=1)
    motif = models.CharField(max_length=255, blank=True)
    date_modification = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Historique Volume Horaire"
        verbose_name_plural = "Historiques Volume Horaire"
        ordering = ['-date_modification']

    def __str__(self):
        return f"{self.affectation} : {self.ancien_volume}h → {self.nouveau_volume}h"


class Personnel(models.Model):
    """Personnel non-enseignant de l'université (ménage, gardiennage,
    cuisine, etc.). Sert de référence pour l'Espace Finance (géré par un
    autre collègue) qui pourra s'appuyer sur le matricule pour la paie."""
    GENRE = [('M', 'Masculin'), ('F', 'Féminin')]

    FONCTION_CHOICES = [
        ('menage', 'Agent de ménage'),
        ('gardien', 'Gardien / Agent de sécurité'),
        ('cuisinier', 'Cuisinier'),
        ('chauffeur', 'Chauffeur'),
        ('technicien', 'Technicien de maintenance'),
        ('autre', 'Autre'),
    ]
    STATUT_CHOICES = [
        ('actif', 'Actif'),
        ('inactif', 'Inactif'),
    ]

    nom = models.CharField(max_length=100, validators=[nom_validator])
    prenom = models.CharField(max_length=100, validators=[nom_validator])
    genre = models.CharField(max_length=1, choices=GENRE, default='M')
    telephone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    fonction = models.CharField(max_length=20, choices=FONCTION_CHOICES)
    fonction_autre = models.CharField(
        max_length=100, blank=True, null=True,
        help_text="Précision si 'Autre' est sélectionné"
    )
    lieu_travail = models.CharField(
        max_length=150,
        help_text="Ex: Faculté des Sciences, Résidence universitaire, Administration centrale..."
    )
    faculte_rattachement = models.ForeignKey(
        Faculte, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='personnel',
        help_text="Si rattaché à une faculté en particulier (facultatif)"
    )

    date_embauche = models.DateField()
    salaire_mensuel = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Salaire mensuel — transmis à l'Espace Finance pour la paie"
    )
    rib = models.CharField(
        max_length=50, blank=True, null=True,
        verbose_name="RIB (coordonnées bancaires)",
        help_text="Pour le versement du salaire par l'Espace Finance"
    )
    matricule = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='actif')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Personnel"
        verbose_name_plural = "Personnel"
        ordering = ['nom', 'prenom']

    def get_fonction_display_full(self):
        if self.fonction == 'autre' and self.fonction_autre:
            return self.fonction_autre
        return self.get_fonction_display()

    def _generate_matricule(self):
        last = Personnel.objects.order_by('-id').first()
        num = (last.id + 1) if last else 1
        return f"UCCB-PERS-{num:05d}"

    def save(self, *args, **kwargs):
        if not self.matricule:
            self.matricule = self._generate_matricule()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.matricule} — {self.nom.upper()} {self.prenom}"