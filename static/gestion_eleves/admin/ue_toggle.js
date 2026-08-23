// Masque/affiche Portail ou Filière selon le Semestre choisi, dans le
// formulaire d'ajout/modification d'une Unité d'Enseignement (admin
// Django). La validation stricte reste côté serveur (UEAdminForm.clean),
// ceci n'est qu'un confort visuel pour éviter de choisir un champ
// incohérent avant même de soumettre le formulaire.
(function () {
  function toggleUEFields() {
    var sem = document.getElementById('id_semestre');
    if (!sem) return;
    var estS1S2 = sem.value === 'S1' || sem.value === 'S2';

    var portailRow = document.querySelector('.field-portail');
    var filiereRow = document.querySelector('.field-filiere');

    if (portailRow) portailRow.style.display = estS1S2 ? '' : 'none';
    if (filiereRow) filiereRow.style.display = estS1S2 ? 'none' : '';

    // Vide aussi la valeur du champ qu'on cache, pour ne pas laisser
    // une sélection invalide invisible partir avec le formulaire.
    var portailSelect = document.getElementById('id_portail');
    var filiereSelect = document.getElementById('id_filiere');
    if (estS1S2 && filiereSelect) filiereSelect.value = '';
    if (!estS1S2 && portailSelect) portailSelect.value = '';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sem = document.getElementById('id_semestre');
    if (sem) {
      sem.addEventListener('change', toggleUEFields);
      toggleUEFields(); // état initial (utile en modification d'une UE existante)
    }
  });
})();
