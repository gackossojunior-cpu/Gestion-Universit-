/**
 * admin_etudiant.js — Version AJAX (sans rechargement de page)
 *
 * Quand on change la Faculté :
 *   → appel AJAX vers /gestion_finance/portails/ et /gestion_finance/filieres/
 *   → mise à jour des <select> sans perdre les données saisies
 *
 * Quand on change le Semestre :
 *   → grisage visuel du champ non pertinent
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {

        var selFac     = document.getElementById('id_faculte');
        var selSem     = document.getElementById('id_semestre');
        var selPortail = document.getElementById('id_portail');
        var selFiliere = document.getElementById('id_filiere');

        // ─────────────────────────────────────────────────────────
        // 1. Changement de Faculté → AJAX (PAS de rechargement)
        // ─────────────────────────────────────────────────────────
        if (selFac) {
            selFac.addEventListener('change', function () {
                var facId = this.value;

                // Vider les deux selects
                resetSelect(selPortail, '— Choisir un portail —');
                resetSelect(selFiliere, '— Choisir une filière —');

                if (!facId) return;

                // Charger les portails de cette faculté
                fetch('/api/portails/?faculte_id=' + facId)
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        data.portails.forEach(function(p) {
                            var opt = document.createElement('option');
                            opt.value = p.id;
                            opt.textContent = p.nom + ' (' + p.code + ')';
                            selPortail.appendChild(opt);
                        });
                    })
                    .catch(function() {
                        console.warn('Impossible de charger les portails.');
                    });

                // Charger les filières de cette faculté
                fetch('/api/filieres/?faculte_id=' + facId)
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        data.filieres.forEach(function(f) {
                            var opt = document.createElement('option');
                            opt.value = f.id;
                            var portailNom = f['portail__nom'] || '';
                            opt.textContent = f.nom + (portailNom ? ' (via ' + portailNom + ')' : '');
                            selFiliere.appendChild(opt);
                        });
                    })
                    .catch(function() {
                        console.warn('Impossible de charger les filières.');
                    });
            });

            // Au chargement de la page : si une faculté est déjà sélectionnée
            // (cas édition d'un étudiant existant), charger les options
            if (selFac.value) {
                chargerOptionsInitiales(selFac.value);
            }
        }

        // ─────────────────────────────────────────────────────────
        // 2. Changement de Semestre → grisage visuel
        // ─────────────────────────────────────────────────────────
        if (selSem) {
            selSem.addEventListener('change', function () {
                grisage(this.value);
            });
            grisage(selSem.value);
        }

        // ─────────────────────────────────────────────────────────
        // Fonctions utilitaires
        // ─────────────────────────────────────────────────────────

        function resetSelect(sel, placeholder) {
            if (!sel) return;
            sel.innerHTML = '';
            var opt = document.createElement('option');
            opt.value = '';
            opt.textContent = placeholder;
            sel.appendChild(opt);
        }

        function chargerOptionsInitiales(facId) {
            // Mémoriser la valeur actuelle (pour la re-sélectionner après le chargement)
            var portailActuel = selPortail ? selPortail.value : '';
            var filiereActuelle = selFiliere ? selFiliere.value : '';

            fetch('/api/portails/?faculte_id=' + facId)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (!selPortail) return;
                    // Garder l'option vide
                    var opts = selPortail.querySelectorAll('option');
                    if (opts.length <= 1) {
                        // Pas encore d'options, les ajouter
                        data.portails.forEach(function(p) {
                            var opt = document.createElement('option');
                            opt.value = p.id;
                            opt.textContent = p.nom + ' (' + p.code + ')';
                            if (String(p.id) === String(portailActuel)) {
                                opt.selected = true;
                            }
                            selPortail.appendChild(opt);
                        });
                    }
                })
                .catch(function() {});

            fetch('/api/filieres/?faculte_id=' + facId)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (!selFiliere) return;
                    var opts = selFiliere.querySelectorAll('option');
                    if (opts.length <= 1) {
                        data.filieres.forEach(function(f) {
                            var opt = document.createElement('option');
                            opt.value = f.id;
                            var portailNom = f['portail__nom'] || '';
                            opt.textContent = f.nom + (portailNom ? ' (via ' + portailNom + ')' : '');
                            if (String(f.id) === String(filiereActuelle)) {
                                opt.selected = true;
                            }
                            selFiliere.appendChild(opt);
                        });
                    }
                })
                .catch(function() {});
        }

        function grisage(semVal) {
            var n = parseInt((semVal || '').replace('S', '')) || 0;

            var rowP = selPortail
                ? (selPortail.closest('.field-portail') || selPortail.closest('.form-row'))
                : null;
            var rowF = selFiliere
                ? (selFiliere.closest('.field-filiere') || selFiliere.closest('.form-row'))
                : null;

            if (n > 0 && n <= 2) {
                // S1/S2 → portail requis
                if (rowP) { rowP.style.opacity = '1'; rowP.style.pointerEvents = 'auto'; }
                if (rowF) { rowF.style.opacity = '0.35'; rowF.style.pointerEvents = 'none'; }
                if (selFiliere) selFiliere.value = '';
            } else if (n > 2) {
                // S3+ → filière requise
                if (rowF) { rowF.style.opacity = '1'; rowF.style.pointerEvents = 'auto'; }
                if (rowP) { rowP.style.opacity = '0.35'; rowP.style.pointerEvents = 'none'; }
                if (selPortail) selPortail.value = '';
            }
        }

    });
})();
