import { useEffect, useState } from 'react'

/** Charge portails+filières d'une faculté via les endpoints déjà en place. */
export function useSousCategories(facId) {
  const [portails, setPortails] = useState([])
  const [filieres, setFilieres] = useState([])

  useEffect(() => {
    if (!facId) { setPortails([]); setFilieres([]); return }
    fetch(`/api/portails/?faculte_id=${facId}`).then((r) => r.json()).then((d) => setPortails(d.portails || []))
    fetch(`/api/filieres/?faculte_id=${facId}`).then((r) => r.json()).then((d) => setFilieres(d.filieres || []))
  }, [facId])

  return { portails, filieres }
}

/**
 * Barre de filtres Faculté / Semestre / Portail-ou-Filière.
 * value: { fac_id, sem, portail_id, filiere_id }
 * onChange(patch) reçoit un objet partiel à fusionner dans le state parent.
 */
export default function FilterBar({ facultes, semestres, value, onChange, children }) {
  const { portails, filieres } = useSousCategories(value.fac_id)
  const semNum = value.sem ? parseInt(value.sem.replace('S', ''), 10) : 0
  const isPortailPhase = semNum > 0 && semNum <= 2
  const isFilierePhase = semNum > 2

  return (
    <div className="card" style={{ borderLeft: '4px solid var(--ac, var(--gold))', padding: 14, marginBottom: 20 }}>
      <div className="row-g" style={{ alignItems: 'flex-end', marginBottom: 0 }}>
        <div className="col-flex">
          <label className="fl">Faculté</label>
          <select className="form-select" value={value.fac_id || ''} onChange={(e) => onChange({ fac_id: e.target.value ? Number(e.target.value) : null, portail_id: null, filiere_id: null })}>
            <option value="">— Sélectionner —</option>
            {facultes.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </div>
        <div className="col-flex">
          <label className="fl">Semestre</label>
          <select className="form-select" value={value.sem || ''} onChange={(e) => onChange({ sem: e.target.value, portail_id: null, filiere_id: null })}>
            <option value="">— Semestre —</option>
            {semestres.map((s) => <option key={s} value={s}>Sem. {s.slice(1)}</option>)}
          </select>
        </div>
        <div className="col-flex" style={{ opacity: isPortailPhase ? 1 : 0.4 }}>
          <label className="fl">Portail</label>
          <select className="form-select" disabled={!isPortailPhase} value={value.portail_id || ''} onChange={(e) => onChange({ portail_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">— Tous —</option>
            {portails.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>
        <div className="col-flex" style={{ opacity: isFilierePhase ? 1 : 0.4 }}>
          <label className="fl">Filière</label>
          <select className="form-select" disabled={!isFilierePhase} value={value.filiere_id || ''} onChange={(e) => onChange({ filiere_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">— Toutes —</option>
            {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </div>
        {children}
      </div>
    </div>
  )
}
