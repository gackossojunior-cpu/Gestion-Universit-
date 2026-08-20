from django.urls import path
from . import views
from .serializers import FinanceTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

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
    path('transports/depense/add/', views.add_depense_transport, name='add_depense_transport'),
    path('transports/depense/delete/<int:id>/', views.delete_depense_transport, name='delete_depense_transport'),

    path('api/token/', FinanceTokenObtainPairView.as_view(), name='api_token'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='api_token_refresh'),

    path('api/dashboard/', views.dashboard_api_view, name='api_dashboard'),

    path('api/transactions/', views.TransactionListCreateView.as_view(), name='api_transactions'),
    path('api/transactions/<uuid:id>/', views.TransactionRetrieveUpdateDestroyAPIView.as_view(), name='api_transaction_detail'),

    path('api/dossiers/', views.DossierFinancierListCreateView.as_view(), name='api_dossiers'),
    path('api/dossiers/<int:id>/', views.DossierFinancierRetrieveUpdateDestroyAPIView.as_view(), name='api_dossier_detail'),

    path('api/enseignants/', views.EnseignantListAPIView.as_view(), name='api_enseignants_list'),
    path('api/enseignants/<uuid:pk>/pay/', views.EnseignantPayAPIView.as_view(), name='api_enseignant_pay'),

    path('api/personnel/', views.PersonnelListAPIView.as_view(), name='api_personnel'),
    path('api/personnel/<uuid:id>/pay/', views.PersonnelPayView.as_view(), name='api_personnel_pay'),

    path('api/transports/depenses/', views.DepenseTransportListCreateView.as_view(), name='api_transports_depenses'),
    path('api/transports/depenses/<int:id>/', views.DepenseTransportDetailAPIView.as_view(), name='api_transports_depenses_detail'),
]
