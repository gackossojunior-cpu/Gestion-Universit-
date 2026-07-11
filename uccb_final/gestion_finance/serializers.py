from rest_framework import serializers
from .models import Transaction, DossierFinancier, Bus, AffectationTransport, Trajet, DepenseTransport


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ["id", "text", "amount", "created_at"]
        read_only_fields = ["id", "created_at"]


class DossierFinancierSerializer(serializers.ModelSerializer):
    # Champs en lecture seule, récupérés depuis l'étudiant lié (gestion_eleves)
    nom = serializers.CharField(source="etudiant.nom", read_only=True)
    prenom = serializers.CharField(source="etudiant.prenom", read_only=True)
    matricule = serializers.CharField(source="etudiant.matricule", read_only=True)
    cycle = serializers.CharField(source="etudiant.cycle", read_only=True)

    class Meta:
        model = DossierFinancier
        fields = [
            "id", "etudiant", "nom", "prenom", "matricule", "cycle",
            "montant_total", "montant_paye", "mode_paiement",
            "statut", "date_paiement", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class TrajetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trajet
        fields = ["id", "nom", "depart", "destination", "heure_depart", "heure_arrivee"]


class BusSerializer(serializers.ModelSerializer):
    chauffeur_actuel = serializers.CharField(read_only=True)

    class Meta:
        model = Bus
        fields = ["id", "numero", "plaque", "capacite", "statut", "chauffeur_actuel"]


class AffectationTransportSerializer(serializers.ModelSerializer):
    bus_numero = serializers.CharField(source="bus.numero", read_only=True)
    chauffeur_name = serializers.CharField(source="chauffeur.name", read_only=True)
    trajet_nom = serializers.CharField(source="trajet.nom", read_only=True)

    class Meta:
        model = AffectationTransport
        fields = [
            "id", "bus", "bus_numero", "chauffeur", "chauffeur_name",
            "trajet", "trajet_nom", "date_debut", "date_fin", "actif"
        ]


class DepenseTransportSerializer(serializers.ModelSerializer):
    bus_numero = serializers.CharField(source="bus.numero", read_only=True)

    class Meta:
        model = DepenseTransport
        fields = ["id", "bus", "bus_numero", "type_depense", "montant", "description", "date"]