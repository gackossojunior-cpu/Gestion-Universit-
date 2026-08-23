/**
 * GradeRing — l'élément signature de l'appli : une jauge radiale /20.
 * Rappelle visuellement, partout où une moyenne apparaît, l'échelle
 * de notation qui gouverne toutes les décisions (admis/ajourné, crédits).
 */
export default function GradeRing({ value, size = 54, strokeWidth = 5, label }) {
  const pct = Math.max(0, Math.min(1, value / 20))
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const dash = c * pct
  const color = value >= 10 ? 'var(--success)' : value >= 6 ? 'var(--gold)' : 'var(--danger)'

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .4s ease' }}
        />
        <text
          x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.28, fill: 'var(--ink)' }}
        >
          {value.toFixed(1)}
        </text>
      </svg>
      {label && <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>}
    </div>
  )
}
