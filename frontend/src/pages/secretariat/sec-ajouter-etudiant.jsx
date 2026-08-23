import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import SecAjouterEtudiant from './SecAjouterEtudiant'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <SecAjouterEtudiant pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
