import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import FacMatriceA3 from './FacMatriceA3'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(<FacMatriceA3 pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />)
}
