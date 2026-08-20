from django.urls import path
from . import views

urlpatterns = [
    path('', views.transports_view, name='transports'),

    path('bus/add/', views.add_bus, name='add_bus'),
    path('bus/edit/<int:id>/', views.edit_bus, name='edit_bus'),
    path('bus/delete/<int:id>/', views.delete_bus, name='delete_bus'),

    path('trajet/add/', views.add_trajet, name='add_trajet'),
    path('trajet/delete/<int:id>/', views.delete_trajet, name='delete_trajet'),

    path('affectation/add/', views.add_affectation, name='add_affectation'),
    path('affectation/end/<int:id>/', views.end_affectation, name='end_affectation'),

    path('api/bus/', views.BusListAPIView.as_view(), name='api_logistique_bus'),
]