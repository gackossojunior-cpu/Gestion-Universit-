import uuid
from django.db import models
from django.conf import settings


class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.CharField(max_length=250)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.text} ({self.amount})"


from gestion_eleves.models import Etudiant

class DossierFinancier(models.Model):

    PAYMENT_MODE_CHOICES = [
        ('cash', 'Espèces'),
        ('mobile_money', 'Mobile Money'),
        ('virement', 'Virement bancaire'),
        ('cheque', 'Chèque'),
    ]

    STATUT_CHOICES = [
        ('paye', 'Payé'),
        ('partiel', 'Partiel'),
        ('non_paye', 'Non payé'),
    ]

    etudiant = models.OneToOneField(
        Etudiant,
        on_delete=models.CASCADE,
        related_name='dossier_financier'
    )
    montant_total = models.DecimalField(max_digits=12, decimal_places=2)
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    mode_paiement = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, null=True, blank=True)
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='non_paye')
    date_paiement = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.etudiant} - {self.statut}"

class Enseignant(models.Model):
    TYPE_CHOICES = [
        ('permanent', 'Permanent'),
        ('vacataire', 'Vacataire'),
    ]

    STATUT_CHOICES = [
        ('paye', 'Payé'),
        ('partiel', 'Partiel'),
        ('en_attente', 'En attente'),
    ]

    MODE_PAIEMENT_CHOICES = [
        ('cash', 'Espèces'),
        ('mobile_money', 'Mobile Money'),
        ('virement', 'Virement bancaire'),
        ('cheque', 'Chèque'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, null=True)
    matricule = models.CharField(max_length=50, blank=True, default='')
    departement = models.CharField(max_length=100, blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='permanent')
    salaire = models.DecimalField(max_digits=12, decimal_places=2)
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    mode_paiement = models.CharField(max_length=20, choices=MODE_PAIEMENT_CHOICES, null=True, blank=True)
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='en_attente')
    date_paiement = models.DateField(null=True, blank=True)
    mois_concerne = models.CharField(max_length=7, blank=True, help_text='Format : 2026-04')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.get_type_display()}"


class Personnel(models.Model):
    POSTE_CHOICES = [
        ('administratif', 'Administratif'),
        ('technique', 'Technique'),
        ('securite', 'Sécurité'),
        ('entretien', 'Entretien'),
        ('autre', 'Autre'),
    ]

    STATUT_CHOICES = [
        ('paye', 'Payé'),
        ('partiel', 'Partiel'),
        ('en_attente', 'En attente'),
    ]

    MODE_PAIEMENT_CHOICES = [
        ('cash', 'Espèces'),
        ('mobile_money', 'Mobile Money'),
        ('virement', 'Virement bancaire'),
        ('cheque', 'Chèque'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, null=True)
    matricule = models.CharField(max_length=50, blank=True, default='')
    poste = models.CharField(max_length=20, choices=POSTE_CHOICES, default='administratif')
    salaire = models.DecimalField(max_digits=12, decimal_places=2)
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    mode_paiement = models.CharField(max_length=20, choices=MODE_PAIEMENT_CHOICES, null=True, blank=True)
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='en_attente')
    date_paiement = models.DateField(null=True, blank=True)
    mois_concerne = models.CharField(max_length=7, blank=True, help_text='Format : 2025-04')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.get_poste_display()}"

class Bus(models.Model):
    numero = models.CharField(max_length=20, unique=True)
    plaque = models.CharField(max_length=20, unique=True)
    capacite = models.PositiveIntegerField()

    statut = models.CharField(
        max_length=20,
        choices=[
            ('actif', 'Actif'),
            ('maintenance', 'Maintenance'),
            ('hors_service', 'Hors service'),
        ],
        default='actif'
    )

    def __str__(self):
        return f"Bus {self.numero} ({self.plaque})"

    @property
    def chauffeur_actuel(self):
        affectation = self.affectations.filter(actif=True).first()
        return affectation.chauffeur if affectation else None


class AffectationTransport(models.Model):
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name='affectations')
    chauffeur = models.ForeignKey(
        Personnel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    trajet = models.ForeignKey("Trajet", on_delete=models.CASCADE)
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['-date_debut']
        unique_together = [('bus', 'trajet', 'date_debut')]

    def __str__(self):
        statut = "en cours" if self.actif else str(self.date_fin)
        return (
            f"Affectation de {self.chauffeur} "
            f"au bus {self.bus} — "
            f"du {self.date_debut} au {statut}"
        )
    

class Trajet(models.Model):
    nom = models.CharField(max_length=100)

    depart = models.CharField(max_length=100)

    destination = models.CharField(max_length=100)

    heure_depart = models.TimeField()

    heure_arrivee = models.TimeField()

    def __str__(self):
        return (
            f"{self.nom} : "
            f"{self.depart} → {self.destination}"
        )
    

class DepenseTransport(models.Model):
    TYPES_CHOICES = [
        ('carburant', 'Carburant'),
        ('entretien', 'Entretien'),
        ('reparation', 'Réparation'),
    ]

    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name='depenses')
    type_depense = models.CharField(max_length=20, choices=TYPES_CHOICES)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Dépense {self.bus.numero} - {self.get_type_depense_display()} ({self.montant} FC)"


class AuditLog(models.Model):
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    action = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.utilisateur} - {self.action}"