from rest_framework import serializers
from .models import Transaction, DossierFinancier, DepenseTransport, Personnel
from logistique.models import Bus, AffectationTransport, Trajet
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

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

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class FinanceTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if not (user.is_staff or user.is_superuser):
            raise serializers.ValidationError("Accès non autorisé à l'espace finance.")
        data['username'] = user.username
        data['is_superuser'] = user.is_superuser
        return data


class FinanceTokenObtainPairView(TokenObtainPairView):
    serializer_class = FinanceTokenObtainPairSerializer

class PersonnelSerializer(serializers.ModelSerializer):
    poste_display = serializers.CharField(source='get_poste_display', read_only=True)
    mode_paiement_display = serializers.CharField(source='get_mode_paiement_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = Personnel
        fields = [
            'id', 'name', 'email', 'matricule', 'poste', 'poste_display',
            'salaire', 'montant_paye', 'mode_paiement', 'mode_paiement_display',
            'statut', 'statut_diplay', 'date_paiement', 'mois_concerne', 'created_at'
        ]
        read_only_fields = ["id","montant_paye", "statut", "date_paiement", "created_at"]

class BusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bus
        fields =  ['id', 'numero', 'plaque', 'capacite', 'statut']

class DepenseTransportSerializer(serializers.ModelSerializer):
    bus_numero = serializers.CharField(source="bus.numero", read_only=True)
    bus_plaque = serializers.CharField(source="bus.plaque", read_only=True)
    type_depense_display = serializers.CharField(source='get_type_depense_display', read_only=True)

    class Meta:
        model = DepenseTransport
        fields = [
            'id', 'bus', 'bus_numero', 'bus_plaque',
            'type_depense', 'type_depense_display',
            'montant', 'description', 'date',
        ]
        read_only_fields = ['id', 'date']