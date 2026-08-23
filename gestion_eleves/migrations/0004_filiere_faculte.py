from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('gestion_eleves', '0003_alter_anneeacademique_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='filiere',
            name='faculte',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='filieres_direct',
                to='gestion_eleves.faculte',
                help_text="Faculté de cette filière"
            ),
        ),
        migrations.AlterField(
            model_name='filiere',
            name='portail',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='filieres',
                to='gestion_eleves.portail',
                help_text="Portail parent (optionnel)"
            ),
        ),
    ]
