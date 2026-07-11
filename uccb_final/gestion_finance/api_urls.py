from django.urls import path
from . import views

urlpatterns = [
    path('transactions/', views.TransactionListCreateView.as_view(), name='api_transactions'),
    path('transactions/<uuid:id>/', views.TransactionRetrieveUpdateDestroyAPIView.as_view(), name='api_transaction_detail'),
    path('students/', views.DossierFinancierListCreateView.as_view(), name='api_students'),
    path('students/<int:id>/', views.DossierFinancierRetrieveUpdateDestroyAPIView.as_view(), name='api_student_detail'),
]
