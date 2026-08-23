import '../../shared/theme.css'
import { createRoot } from 'react-dom/client'
import FacOrientationS3 from './FacOrientationS3'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <FacOrientationS3 pageTitle={el.dataset.pageTitle} userLabel={el.dataset.user} />
  )
}
