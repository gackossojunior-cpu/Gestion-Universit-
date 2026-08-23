import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import FacListeClasse from './FacListeClasse'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <FacListeClasse pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
