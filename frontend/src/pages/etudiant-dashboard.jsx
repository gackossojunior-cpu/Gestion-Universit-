import '../shared/theme.css'
import { createRoot } from 'react-dom/client'
import EtudiantDashboard from './EtudiantDashboard'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(<EtudiantDashboard userLabel={el.dataset.user} />)
}
