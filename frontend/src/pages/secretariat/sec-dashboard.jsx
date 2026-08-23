import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import SecDashboard from './SecDashboard'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <SecDashboard pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
