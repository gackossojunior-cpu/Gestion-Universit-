import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import RhDashboard from './RhDashboard'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <RhDashboard pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
