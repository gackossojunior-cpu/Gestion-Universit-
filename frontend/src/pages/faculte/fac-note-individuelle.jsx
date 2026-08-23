import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import FacNoteIndividuelle from './FacNoteIndividuelle'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <FacNoteIndividuelle
      pageTitle={el.dataset.pageTitle}
      userLabel={el.dataset.user}
      etudiantId={el.dataset.etudiantId}
    />
  )
}
