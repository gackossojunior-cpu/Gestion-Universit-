import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import RhAjouterPersonnel from './RhAjouterPersonnel'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <RhAjouterPersonnel pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
