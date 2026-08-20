from django.db import models

class Bus(models.Model):
    numero = models.CharField(max_length=20, unique=True)
    plaque = models.CharField(max_length=20, unique=True)
    capacite = models.PositiveIntegerField()

    statut =  models.CharField(
        max_length=20,
        choices=[
            ('actif', 'Actif'),
            ('maintenance', 'Maintenance'),
            ('hors_service', 'Hors Service'),
        ],
        default='actif',
    )

    def __str__(self):
        return f"Bus {self.numero} ({self.plaque})"

    @property
    def chauffeur_actuel(self):
        affectation = self.affectations.filter(active=True).first()
        return affectation.chauffeur if affectation else None

class Trajet(models.Model):
    nom = models.CharField(max_length=100)
    depart = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    heure_depart = models.TimeField()
    heure_arrivee = models.TimeField()

    def __str__(self):
        return f"{self.nom} : {self.depart} → {self.destination}"


class AffectationTransport(models.Model):
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name='affectations')
    chauffeur = models.ForeignKey(
        'gestion_finance.Personnel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    trajet = models.ForeignKey(Trajet, on_delete=models.CASCADE)
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    actif = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date_debut']
        unique_together = [('bus', 'trajet', 'date_debut')]

    def __str__(self):
        statut = "en cours" if self.actif else str(self.date_debut)
        return (
            f"Affectation de {self.chauffeur}"
            f"au bus {self.bus} - "
            f"du {self.date_debut} au {statut}"
        )