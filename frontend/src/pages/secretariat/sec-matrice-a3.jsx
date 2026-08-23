import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import SecMatriceA3 from './SecMatriceA3'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(<SecMatriceA3 pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />)
}
