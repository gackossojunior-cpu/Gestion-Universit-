// Client fetch partagé pour toutes les pages React de l'app.
// Auth : cookie de session Django envoyé automatiquement (same-origin).
// Écritures (POST) : Django exige le header X-CSRFToken -> on le lit
// depuis le cookie 'csrftoken' (déposé par {% csrf_token %} dans le shell).

function getCookie(name) {
  const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return match ? decodeURIComponent(match.pop()) : null
}

async function handle(res, onUnauthorized) {
  if (res.status === 401 || res.status === 403) {
    if (onUnauthorized) onUnauthorized()
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || "Accès refusé.")
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Erreur serveur (${res.status})`)
  }
  return res.json()
}

export async function apiGet(path) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  return handle(res)
}

export async function apiPost(path, data) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify(data),
  })
  return handle(res)
}
