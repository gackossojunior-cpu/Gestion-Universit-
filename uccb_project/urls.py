from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

admin.site.site_header = "UCCB — Administration Système"
admin.site.site_title  = "UCCB Admin"
admin.site.index_title = "Panneau de configuration"

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('', include('gestion_eleves.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) \
  + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
