import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import FacSaisieNotes from './FacSaisieNotes'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <FacSaisieNotes pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
