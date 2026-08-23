import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import SecFacultes from './SecFacultes'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <SecFacultes pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
