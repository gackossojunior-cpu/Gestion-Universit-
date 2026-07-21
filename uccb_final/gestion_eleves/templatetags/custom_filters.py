from django import template
register = template.Library()

@register.filter
def get_note_devoir(d, key):
    n = d.get(str(key))
    return float(n.note_devoir) if n else ''

@register.filter
def get_note_session(d, key):
    n = d.get(str(key))
    return float(n.note_session) if n else ''

@register.filter
def get_note_sr(d, key):
    n = d.get(str(key))
    return float(n.note_sr) if (n and n.note_sr is not None) else ''

@register.filter
def is_absent(d, key):
    n = d.get(str(key))
    return n.est_absent if n else False

@register.filter
def get_item(d, key):
    try:
        return d.get(key)
    except Exception:
        return None


@register.filter
def eq_str(value, arg):
    """Compare value (int ou autre) avec arg (string) en les convertissant en str."""
    return str(value) == str(arg)
