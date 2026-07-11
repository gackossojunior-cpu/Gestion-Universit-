# Generated migration for transport models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('gestion_finance', '0008_delete_payment_remove_student_date_echeance_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Bus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero', models.CharField(max_length=20, unique=True)),
                ('plaque', models.CharField(max_length=20, unique=True)),
                ('capacite', models.PositiveIntegerField()),
                ('statut', models.CharField(
                    choices=[('actif', 'Actif'), ('maintenance', 'Maintenance'), ('hors_service', 'Hors service')],
                    default='actif',
                    max_length=20
                )),
            ],
        ),
        migrations.CreateModel(
            name='Trajet',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('depart', models.CharField(max_length=100)),
                ('destination', models.CharField(max_length=100)),
                ('heure_depart', models.TimeField()),
                ('heure_arrivee', models.TimeField()),
            ],
        ),
        migrations.CreateModel(
            name='DepenseTransport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_depense', models.CharField(
                    choices=[('carburant', 'Carburant'), ('entretien', 'Entretien'), ('reparation', 'Réparation')],
                    max_length=20
                )),
                ('montant', models.DecimalField(decimal_places=2, max_digits=10)),
                ('description', models.TextField(blank=True)),
                ('date', models.DateField(auto_now_add=True)),
                ('bus', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='depenses', to='gestion_finance.bus')),
            ],
        ),
        migrations.CreateModel(
            name='AffectationTransport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_debut', models.DateField()),
                ('date_fin', models.DateField(blank=True, null=True)),
                ('actif', models.BooleanField(default=True)),
                ('bus', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='affectations', to='gestion_finance.bus')),
                ('chauffeur', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='gestion_finance.personnel')),
                ('trajet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gestion_finance.trajet')),
            ],
            options={
                'ordering': ['-date_debut'],
                'unique_together': {('bus', 'trajet', 'date_debut')},
            },
        ),
    ]
