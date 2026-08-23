# Migration initiale — générée par le projet de Josue POATY
# Récupérée depuis le projet existant sur son PC

import django.core.validators
import django.db.models.deletion
import gestion_eleves.models
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AnneeAcademique',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=9, unique=True)),
                ('est_active', models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name='Faculte',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100, unique=True)),
                ('code', models.CharField(max_length=10, unique=True)),
                ('logo', models.ImageField(blank=True, null=True, upload_to='logos/')),
                ('genre_doyen', models.CharField(choices=[('M', 'Masculin'), ('F', 'Féminin')], default='M', max_length=1)),
                ('nom_doyen', models.CharField(blank=True, max_length=100, null=True)),
                ('genre_vice_doyen', models.CharField(choices=[('M', 'Masculin'), ('F', 'Féminin')], default='M', max_length=1)),
                ('nom_vice_doyen', models.CharField(blank=True, max_length=100, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='ParametresUCCB',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom_secretaire', models.CharField(max_length=200)),
                ('genre_secretaire', models.CharField(choices=[('M', 'Masculin'), ('F', 'Féminin')], default='M', max_length=1)),
                ('ville_signature', models.CharField(default='Liambou', max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='Portail',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('code', models.CharField(max_length=10)),
                ('faculte', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='portails', to='gestion_eleves.faculte')),
            ],
        ),
        migrations.CreateModel(
            name='Filiere',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('code', models.CharField(max_length=10)),
                ('portail', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='filieres', to='gestion_eleves.portail')),
            ],
        ),
        migrations.CreateModel(
            name='UniteEnseignement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('code_ue', models.CharField(max_length=20, unique=True)),
                ('semestre', models.CharField(max_length=3)),
                ('portail', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='unites', to='gestion_eleves.portail')),
                ('filiere', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='unites', to='gestion_eleves.filiere')),
            ],
        ),
        migrations.CreateModel(
            name='Matiere',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('credits', models.IntegerField(default=2)),
                ('ue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='matieres', to='gestion_eleves.uniteenseignement')),
            ],
        ),
        migrations.CreateModel(
            name='Etudiant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('prenom', models.CharField(max_length=100)),
                ('genre', models.CharField(choices=[('M', 'Masculin'), ('F', 'Féminin')], max_length=1)),
                ('date_naissance', models.DateField()),
                ('nationalite', models.CharField(default='Congolaise', max_length=50)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('matricule', models.CharField(blank=True, editable=False, max_length=35, unique=True)),
                ('semestre', models.CharField(default='S1', max_length=3)),
                ('cycle', models.CharField(blank=True, editable=False, max_length=20)),
                ('en_regle', models.BooleanField(default=True)),
                ('annee_academique', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='gestion_eleves.anneeacademique')),
                ('faculte', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='gestion_eleves.faculte')),
                ('portail', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='gestion_eleves.portail')),
                ('filiere', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='gestion_eleves.filiere')),
            ],
        ),
        migrations.CreateModel(
            name='CompteEtudiant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mot_de_passe', models.CharField(max_length=128)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('actif', models.BooleanField(default=True)),
                ('etudiant', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='compte_etudiant', to='gestion_eleves.etudiant')),
            ],
        ),
        migrations.CreateModel(
            name='Note',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('semestre', models.CharField(max_length=3)),
                ('note_devoir', models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ('note_session', models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ('note_sr', models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True)),
                ('moyenne_stockee', models.DecimalField(decimal_places=2, default=0, editable=False, max_digits=4)),
                ('est_absent', models.BooleanField(default=False)),
                ('etudiant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notes', to='gestion_eleves.etudiant')),
                ('matiere', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notes', to='gestion_eleves.matiere')),
            ],
        ),
        migrations.CreateModel(
            name='ResultatSemestre',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('semestre', models.CharField(max_length=3)),
                ('moyenne_generale', models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ('credits_obtenus', models.IntegerField(default=0)),
                ('credits_totaux', models.IntegerField(default=0)),
                ('decision', models.CharField(default='AJOURNÉ', max_length=20)),
                ('mention', models.CharField(default='NÉANT', max_length=20)),
                ('est_archive', models.BooleanField(default=False)),
                ('annee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gestion_eleves.anneeacademique')),
                ('etudiant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='resultats', to='gestion_eleves.etudiant')),
            ],
        ),
    ]
