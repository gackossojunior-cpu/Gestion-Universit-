import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import RhAjouterEnseignant from './RhAjouterEnseignant'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(<RhAjouterEnseignant pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />)
}
