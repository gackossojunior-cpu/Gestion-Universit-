import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import FacEnseignants from './FacEnseignants'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(<FacEnseignants pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />)
}
