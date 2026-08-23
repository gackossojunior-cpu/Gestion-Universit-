import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import SecListeEtudiants from './SecListeEtudiants'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <SecListeEtudiants pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
