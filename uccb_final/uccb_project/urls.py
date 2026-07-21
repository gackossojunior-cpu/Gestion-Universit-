from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
<<<<<<< HEAD
=======
from django.contrib.auth import views as auth_views
>>>>>>> 363b1a1fb6c4f99fa0553ecbc107b1dc26c19eff

admin.site.site_header = "UCCB — Administration Système"
admin.site.site_title  = "UCCB Admin"
admin.site.index_title = "Panneau de configuration"

urlpatterns = [
    path('django-admin/', admin.site.urls),
<<<<<<< HEAD
    path('', include('gestion_eleves.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) \
  + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
=======
    path('logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
    path('', include('gestion_eleves.urls')),
    path('finance/', include('gestion_finance.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) \
  + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
>>>>>>> 363b1a1fb6c4f99fa0553ecbc107b1dc26c19eff
