from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gestion_eleves', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='etudiant',
            name='statut',
            field=models.CharField(
                choices=[
                    ('actif', 'Actif — étudiant en cours'),
                    ('diplome', 'Diplômé — a terminé son cycle'),
                    ('abandonne', 'Abandonné — a quitté sans terminer'),
                ],
                default='actif',
                max_length=20,
                verbose_name="Statut de l'étudiant",
            ),
        ),
    ]
