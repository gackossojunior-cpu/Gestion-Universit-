from django.db import models
from django.core.validators import (
    MinValueValidator, MaxValueValidator,
    RegexValidator, EmailValidator
)
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import date

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
        verbose_name        = "Année Académique"
        verbose_name_plural = "Années Académiques"
        ordering            = ['-nom']

    def save(self, *args, **kwargs):
        # Une seule année active à la fois
        if self.est_active:
            AnneeAcademique.objects.exclude(pk=self.pk).update(est_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom


class Faculte(models.Model):
    GENRE = [('M', 'Masculin'), ('F', 'Féminin')]

    nom              = models.CharField(max_length=100, unique=True)
    code             = models.CharField(max_length=10,  unique=True, help_text="Ex: FST")
    logo             = models.ImageField(upload_to='logos/', blank=True, null=True)
    genre_doyen      = models.CharField(max_length=1, choices=GENRE, default='M')
    nom_doyen        = models.CharField(max_length=100, blank=True, null=True)
    genre_vice_doyen = models.CharField(max_length=1, choices=GENRE, default='M')
    nom_vice_doyen   = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        verbose_name        = "Faculté"
        verbose_name_plural = "Facultés"
        ordering            = ['nom']

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
    nom_secretaire   = models.CharField(max_length=200, verbose_name="Nom du Secrétaire Universitaire")
    genre_secretaire = models.CharField(
        max_length=1, choices=[('M', 'Masculin'), ('F', 'Féminin')], default='M'
    )
    ville_signature  = models.CharField(max_length=100, default="Liambou")

    class Meta:
        verbose_name        = "Paramètres Généraux UCCB"
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
    nom     = models.CharField(max_length=100)
    code    = models.CharField(max_length=10, help_text="Ex: MIP, BCG, PCG")

    class Meta:
        verbose_name        = "Portail (Tronc Commun)"
        verbose_name_plural = "Portails (Troncs Communs)"
        unique_together     = [('faculte', 'code')]
        ordering            = ['faculte', 'nom']

    def __str__(self):
        return f"{self.nom} — {self.faculte.code}"


class Filiere(models.Model):
    """Spécialisation S3+. Rattachée à UN portail d'origine."""
    portail = models.ForeignKey(
        Portail, on_delete=models.CASCADE, related_name='filieres',
        help_text="Portail parent de cette filière"
    )
    nom  = models.CharField(max_length=100)
    code = models.CharField(max_length=10, help_text="Ex: INFO, BIO, PHYS")

    class Meta:
        verbose_name        = "Filière"
        verbose_name_plural = "Filières"
        unique_together     = [('portail', 'code')]
        ordering            = ['portail', 'nom']

    @property
    def faculte(self):
        return self.portail.faculte

    def __str__(self):
        return f"{self.nom} ({self.portail.faculte.code} / {self.portail.code})"


# ═══════════════════════════════════════════════════════════════
# 2. ENSEIGNEMENT
# ═══════════════════════════════════════════════════════════════

class UniteEnseignement(models.Model):
    nom      = models.CharField(max_length=100)
    code_ue  = models.CharField(max_length=20, unique=True)
    semestre = models.CharField(max_length=3, choices=SEMESTRES)
    portail  = models.ForeignKey(
        Portail, on_delete=models.CASCADE, null=True, blank=True,
        related_name='unites', help_text="Obligatoire pour S1-S2"
    )
    filiere  = models.ForeignKey(
        Filiere, on_delete=models.CASCADE, null=True, blank=True,
        related_name='unites', help_text="Obligatoire pour S3+"
    )

    class Meta:
        verbose_name        = "Unité d'Enseignement (UE)"
        verbose_name_plural = "Unités d'Enseignement (UE)"
        ordering            = ['semestre', 'code_ue']

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
    ue      = models.ForeignKey(UniteEnseignement, on_delete=models.CASCADE, related_name='matieres')
    nom     = models.CharField(max_length=100)
    credits = models.IntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Entre 1 et 10 crédits"
    )

    class Meta:
        verbose_name        = "Matière"
        verbose_name_plural = "Matières"
        ordering            = ['ue', 'nom']

    @property
    def code(self):
        """Le code matière est toujours celui de son UE."""
        return self.ue.code_ue

    def __str__(self):
        return f"{self.ue.code_ue} — {self.nom} ({self.credits} cr.)"


# ═══════════════════════════════════════════════════════════════
# 3. ÉTUDIANTS
# ═══════════════════════════════════════════════════════════════

def valider_date_naissance(valeur):
    """La date de naissance doit être entre 10 et 80 ans avant aujourd'hui."""
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
    nom            = models.CharField(max_length=100, validators=[nom_validator])
    prenom         = models.CharField(max_length=100, validators=[nom_validator])
    genre          = models.CharField(max_length=1, choices=GENRE)
    date_naissance = models.DateField(validators=[valider_date_naissance])
    nationalite    = models.CharField(max_length=50, default="Congolaise")
    email          = models.EmailField(unique=True, validators=[EmailValidator()])

    # ── Cursus ───────────────────────────────────────────────
    matricule        = models.CharField(max_length=35, unique=True, editable=False, blank=True)
    annee_academique = models.ForeignKey(AnneeAcademique, on_delete=models.PROTECT)
    faculte          = models.ForeignKey(Faculte, on_delete=models.PROTECT)
    portail          = models.ForeignKey(
        Portail, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="S1 et S2 uniquement"
    )
    filiere          = models.ForeignKey(
        Filiere, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="S3 et au-delà uniquement"
    )
    semestre         = models.CharField(max_length=3, choices=SEMESTRES, default='S1')
    cycle            = models.CharField(max_length=20, editable=False, blank=True)

    # ── Finance ─────────────────────────────────────────────
    en_regle         = models.BooleanField(
        default=True,
        help_text="L'étudiant est en règle financièrement (géré par la finance)"
    )

    # ── Financier ────────────────────────────────────────────
    en_regle = models.BooleanField(
        default=True,
        verbose_name="En règle financièrement",
        help_text="Décocher si l'étudiant a des impayés. Géré par le secrétariat ou le module finance."
    )

    STATUT_CHOICES = [
        ('actif',     'Actif — étudiant en cours'),
        ('diplome',   'Diplômé — a terminé son cycle'),
        ('abandonne', 'Abandonné — a quitté sans terminer'),
    ]
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='actif',
        verbose_name="Statut de l'étudiant",
        help_text="Actif = visible dans les classes. Diplômé/Abandonné = conserve son compte et ses relevés mais n'apparaît plus dans les promotions."
    )

    class Meta:
        verbose_name        = "Étudiant"
        verbose_name_plural = "Étudiants"
        ordering            = ['nom', 'prenom']

    # ── Propriétés utilitaires ───────────────────────────────
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
        nom3  = self.nom.upper().replace(' ', '').replace('-', '')[:3].ljust(3, 'X')
        pre2  = self.prenom.upper().replace(' ', '').replace('-', '')[:2].ljust(2, 'X')
        num   = Etudiant.objects.count() + 1
        return f"UCCB{annee}{nom3}{pre2}{num:05d}"

    # ── Validation métier ────────────────────────────────────
    def clean(self):
        n = int(self.semestre[1:]) if self.semestre else 1

        if n <= 2:
            if self.filiere:
                raise ValidationError({
                    'filiere': "Un étudiant en S1/S2 ne peut pas avoir de filière."
                })
            if not self.portail:
                raise ValidationError({
                    'portail': "Un étudiant en S1/S2 doit avoir un portail."
                })
            if self.portail and self.faculte_id and self.portail.faculte_id != self.faculte_id:
                raise ValidationError({
                    'portail': "Ce portail n'appartient pas à la faculté sélectionnée."
                })
        else:
            if self.portail:
                raise ValidationError({
                    'portail': "Un étudiant en S3+ ne peut pas avoir de portail."
                })
            if not self.filiere:
                raise ValidationError({
                    'filiere': "Un étudiant en S3+ doit avoir une filière."
                })
            if self.filiere and self.faculte_id and self.filiere.portail.faculte_id != self.faculte_id:
                raise ValidationError({
                    'filiere': "Cette filière n'appartient pas à la faculté sélectionnée."
                })

    def save(self, *args, **kwargs):
        n = int(self.semestre[1:]) if self.semestre else 1
        if n <= 2:
            self.filiere = None
        else:
            self.portail = None
        self.cycle = self._compute_cycle()
        if not self.matricule:
            self.matricule = self._generate_matricule()

        # ── Traçabilité : mémoriser l'ancien semestre avant la sauvegarde
        # Les notes de l'ancien semestre restent en base (liées par semestre=S1, S2...)
        # On ne supprime JAMAIS les notes — elles sont retrouvées via Note.semestre
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.matricule} — {self.nom.upper()} {self.prenom}"


# ═══════════════════════════════════════════════════════════════
# 4. NOTES & RÉSULTATS
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
# COMPTE ETUDIANT (authentification portail étudiant)
# ═══════════════════════════════════════════════════════════════

class CompteEtudiant(models.Model):
    """Compte de connexion lié à un étudiant (email + mot de passe hashé)."""
    etudiant   = models.OneToOneField(
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
        verbose_name        = "Compte Étudiant"
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
    etudiant      = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='notes')
    matiere       = models.ForeignKey(Matiere,  on_delete=models.CASCADE, related_name='notes')
    semestre      = models.CharField(max_length=3, choices=SEMESTRES)
    note_devoir   = models.DecimalField(
        max_digits=4, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)]
    )
    note_session  = models.DecimalField(
        max_digits=4, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)]
    )
    note_sr       = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        verbose_name="Rattrapage (SR)"
    )
    moyenne_stockee = models.DecimalField(max_digits=4, decimal_places=2, default=0, editable=False)
    est_absent      = models.BooleanField(default=False)

    class Meta:
        verbose_name        = "Note"
        verbose_name_plural = "Notes"
        unique_together     = [('etudiant', 'matiere', 'semestre')]
        ordering            = ['etudiant', 'semestre', 'matiere']

    def calculer(self):
        if self.est_absent:
            return 0.0
        d, s = float(self.note_devoir), float(self.note_session)
        m_normale = (d + s) / 2
        if self.note_sr is not None:
            sr   = float(self.note_sr)
            m_sr = (d + 2 * sr) / 3
            return round(max(m_normale, m_sr), 2)
        return round(m_normale, 2)

    def save(self, *args, **kwargs):
        self.moyenne_stockee = self.calculer()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.etudiant.matricule} | {self.matiere.nom} | {self.semestre} → {self.moyenne_stockee}"


class ResultatSemestre(models.Model):
    etudiant         = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='resultats')
    semestre         = models.CharField(max_length=3, choices=SEMESTRES)
    annee            = models.ForeignKey(AnneeAcademique, on_delete=models.CASCADE)
    moyenne_generale = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    credits_obtenus  = models.IntegerField(default=0)
    credits_totaux   = models.IntegerField(default=0)
    decision         = models.CharField(max_length=20, default="AJOURNÉ")
    mention          = models.CharField(max_length=20, default="NÉANT")
    est_archive      = models.BooleanField(default=False)

    class Meta:
        verbose_name        = "Résultat de Semestre"
        verbose_name_plural = "Résultats de Semestre"
        unique_together     = [('etudiant', 'semestre', 'annee')]
        ordering            = ['etudiant', 'semestre']

    def __str__(self):
        return f"{self.etudiant.matricule} | {self.semestre} | {self.decision} ({self.moyenne_generale})"


# ═══════════════════════════════════════════════════════════════
# 5. SIGNAL — Inscription automatique aux matières à la création
# ═══════════════════════════════════════════════════════════════

@receiver(post_save, sender=Etudiant)
def inscrire_aux_matieres(sender, instance, created, **kwargs):
    if not created:
        return
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
# 5. COMPTE ÉTUDIANT (connexion interface étudiant)
# ═══════════════════════════════════════════════════════════════

class EtudiantUser(models.Model):
    """
    Compte de connexion pour un étudiant.
    L'étudiant crée son compte avec son email (doit correspondre
    à celui enregistré par le secrétariat) et choisit un mot de passe.
    """
    etudiant       = models.OneToOneField(
        Etudiant, on_delete=models.CASCADE, related_name='compte'
    )
    password_hash  = models.CharField(max_length=255)
    date_creation  = models.DateTimeField(auto_now_add=True)
    actif          = models.BooleanField(default=True)

    class Meta:
        verbose_name        = "Compte Étudiant"
        verbose_name_plural = "Comptes Étudiants"

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password_hash)

    def __str__(self):
        return f"Compte — {self.etudiant}"
