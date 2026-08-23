import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import FacDashboard from './FacDashboard'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <FacDashboard pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
