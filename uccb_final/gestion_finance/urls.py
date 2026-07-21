from django.urls import path
from . import views

urlpatterns = [
    path('connexion/', views.login_finance, name='login_finance'),

    path('', views.dashboard_view, name='dashboard'),

    path('etudiants/', views.etudiants_view, name='etudiants'),
    path('etudiants/add/', views.add_etudiant, name='add_etudiant'),
    path('etudiants/pay/', views.pay_etudiant, name='pay_etudiant'),
    path('etudiants/delete/<int:id>/', views.delete_etudiant, name='delete_etudiant'),

    path('enseignants/', views.enseignants_view, name='enseignants'),
    path('enseignants/add/', views.add_enseignant, name='add_enseignant'),
    path('enseignants/pay/', views.pay_enseignant, name='pay_enseignant'),
    path('enseignants/delete/<uuid:id>/', views.delete_enseignant, name='delete_enseignant'),

    path('personnel/', views.personnel_view, name='personnel'),
    path('personnel/add/', views.add_personnel, name='add_personnel'),
    path('personnel/pay/', views.pay_personnel, name='pay_personnel'),
    path('personnel/delete/<uuid:id>/', views.delete_personnel, name='delete_personnel'),

    path('transactions/', views.transactions_view, name='transactions'),
    path('transactions/add/', views.add_transaction, name='add_transaction'),
    path('transactions/delete/<uuid:id>/', views.delete_transaction, name='delete_transaction'),
    path('transactions/<uuid:id>/receipt/', views.transaction_receipt, name='transaction_receipt'),
    path('etudiants/<int:id>/receipt/', views.student_receipt, name='student_receipt'),
    
    # Transports
    path('transports/', views.transports_view, name='transports'),
    path('transports/bus/add/', views.add_bus, name='add_bus'),
    path('transports/bus/edit/<int:id>/', views.edit_bus, name='edit_bus'),
    path('transports/bus/delete/<int:id>/', views.delete_bus, name='delete_bus'),
    path('transports/trajet/add/', views.add_trajet, name='add_trajet'),
    path('transports/trajet/delete/<int:id>/', views.delete_trajet, name='delete_trajet'),
    path('transports/affectation/add/', views.add_affectation, name='add_affectation'),
    path('transports/affectation/end/<int:id>/', views.end_affectation, name='end_affectation'),
    path('transports/depense/add/', views.add_depense_transport, name='add_depense_transport'),
    path('transports/depense/delete/<int:id>/', views.delete_depense_transport, name='delete_depense_transport'),
]
