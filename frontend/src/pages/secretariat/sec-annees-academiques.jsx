import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import SecAnneesAcademiques from './SecAnneesAcademiques'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <SecAnneesAcademiques pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
