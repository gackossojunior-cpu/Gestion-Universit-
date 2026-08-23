import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import RhPersonnel from './RhPersonnel'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <RhPersonnel pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
