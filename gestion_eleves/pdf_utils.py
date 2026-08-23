"""
Utilitaires communs pour la génération de PDF via xhtml2pdf (pisa).

xhtml2pdf ne sait pas résoudre tout seul les URLs générées par {% static %}
(ex: /static/gestion_eleves/img/logo_uccb.jpg) — il lui faut un
link_callback qui traduit cette URL en chemin disque réel. Sans ça,
les images (comme le logo UCCB) sont silencieusement ignorées dans le PDF,
même si elles s'affichent très bien dans un aperçu HTML classique
(attestation, relevé) où c'est le NAVIGATEUR qui résout {% static %}.
"""
import os
from django.conf import settings
from django.contrib.staticfiles import finders


def link_callback(uri, rel):
    """Convertit une URI HTML (static/media) en chemin disque absolu
    utilisable par xhtml2pdf pour intégrer images/CSS dans le PDF."""
    if uri.startswith(settings.STATIC_URL):
        path = finders.find(uri.replace(settings.STATIC_URL, ""))
    elif settings.MEDIA_URL and uri.startswith(settings.MEDIA_URL):
        path = os.path.join(settings.MEDIA_ROOT, uri.replace(settings.MEDIA_URL, ""))
    else:
        # Déjà un chemin disque, ou une URL externe (http/https) : on laisse tel quel.
        return uri

    if not path:
        raise Exception(
            f"Fichier statique introuvable pour l'URI '{uri}' "
            f"(vérifie STATIC_URL / STATICFILES_DIRS)."
        )
    return path

# ── (ajoute ce bloc À LA SUITE de link_callback, dans le même fichier) ──

import io
import base64
from PIL import Image, ImageDraw, ImageFont

# xhtml2pdf ne sait pas tourner du texte via CSS (pas de writing-mode, pas de
# transform). On dessine donc le nom de la matière comme une petite image PNG
# (texte blanc, fond transparent), tournée de 90°, encodée en base64 et
# insérée via <img src="data:image/png;base64,...">. xhtml2pdf sait très bien
# afficher ce type d'image (c'est ce qui fait déjà marcher le logo).
_FONT_CANDIDATES = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]


def _load_font(size):
    for path in _FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def matiere_vertical_image(text, font_size=7, max_height_px=112, line_spacing=3):
    """
    Retourne (data_uri, largeur_affichage, hauteur_affichage) pour un nom de
    matière écrit à la verticale, lecture de bas en haut.

    - Si le nom tient sur une ligne : une seule colonne de texte tourné.
    - S'il est trop long : renvoi à la ligne automatique (jusqu'à 2 lignes)
      au lieu d'être coupé avec des "…".
    - L'image est sauvegardée en HAUTE résolution, mais affichée plus
      petite (via width/height) : c'est ça qui rend le texte net et pas
      flou (le PDF redimensionne une image plus grande vers le bas, au
      lieu d'agrandir une petite image).
    """
    scale = 4
    font = _load_font(font_size * scale)
    budget = max_height_px * scale

    def _measure(t):
        tmp = Image.new("RGBA", (10, 10))
        d = ImageDraw.Draw(tmp)
        bbox = d.textbbox((0, 0), t, font=font)
        return bbox[2] - bbox[0], bbox

    w, _ = _measure(text)
    if w <= budget:
        lines = [text]
    else:
        words = text.split(' ')
        if len(words) > 1:
            best_cut, best_diff = 1, None
            for i in range(1, len(words)):
                left = ' '.join(words[:i])
                lw, _ = _measure(left)
                diff = abs(lw - budget * 0.6)
                if best_diff is None or diff < best_diff:
                    best_diff, best_cut = diff, i
            line1 = ' '.join(words[:best_cut])
            line2 = ' '.join(words[best_cut:])
        else:
            mid = len(text) // 2
            line1, line2 = text[:mid], text[mid:]

        def _fit(t):
            while _measure(t)[0] > budget and len(t) > 3:
                t = t[:-1]
            return t

        if _measure(line1)[0] > budget:
            line1 = _fit(line1)
        if _measure(line2)[0] > budget:
            line2 = _fit(line2) + '…'
        lines = [line1, line2]

    heights, widths, bboxes = [], [], []
    for ln in lines:
        w, bbox = _measure(ln)
        widths.append(w)
        bboxes.append(bbox)
        heights.append(bbox[3] - bbox[1])

    block_w = max(widths) if widths else 1
    block_h = sum(heights) + line_spacing * scale * (len(lines) - 1)

    img = Image.new("RGBA", (block_w + 8, block_h + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = 4
    for ln, bbox, h in zip(lines, bboxes, heights):
        d.text((4 - bbox[0], y - bbox[1]), ln, font=font, fill=(255, 255, 255, 255))
        y += h + line_spacing * scale

    rotated = img.rotate(90, expand=True)

    # Tailles d'AFFICHAGE (plus petites que l'image réelle => netteté)
    disp_w = max(1, rotated.width // scale)
    disp_h = max(1, rotated.height // scale)

    buf = io.BytesIO()
    rotated.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}", disp_w, disp_h
