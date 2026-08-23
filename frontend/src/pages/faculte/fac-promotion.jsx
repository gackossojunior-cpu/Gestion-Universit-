import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import FacPromotion from './FacPromotion'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <FacPromotion pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
