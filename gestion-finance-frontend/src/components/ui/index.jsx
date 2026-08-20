import { TrendingUp, TrendingDown, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------
 * KpiCard.jsx — carte de statistique en tête de page (kpi-row)
 * ------------------------------------------------------------------ */
export function KpiCard({
  label,
  value,
  currency,
  unit,
  large = false,
  badge,      // { tone: 'up' | 'down', text: '+12.4%' }
  trend,      // { tone: 'up' | 'down', text: 'En hausse' }
  progress,   // { pct: 82.4, label: '82.4% recouv.' }
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>

      <div className={`kpi-value ${large ? 'kpi-value--large' : ''}`}>
        {value}{' '}
        {currency && <span className="kpi-currency">{currency}</span>}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>

      {badge && (
        <span className={`kpi-badge ${badge.tone === 'up' ? 'badge-green' : 'badge-red'}`}>
          {badge.tone === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {badge.text}
        </span>
      )}

      {trend && (
        <span className={`kpi-trend ${trend.tone === 'up' ? 'trend-up' : 'trend-down'}`}>
          {trend.tone === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {trend.text}
        </span>
      )}

      {progress && (
        <div className="kpi-progress-wrap">
          <div className="kpi-progress-track">
            <div className="kpi-progress-fill" style={{ width: `${progress.pct}%` }} />
          </div>
          <span className="kpi-progress-label">{progress.label}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
 * DbCard — carte générique avec en-tête (titre + lien optionnel)
 * ------------------------------------------------------------------ */
export function DbCard({ title, headerRight, noPad = false, children }) {
  return (
    <div className="db-card">
      <div className="db-card-header">
        <span className="db-card-title">{title}</span>
        {headerRight}
      </div>
      <div className={`db-card-body ${noPad ? 'db-card-body--no-pad' : ''}`}>
        {children}
      </div>
    </div>
  );
}

/* Lien "Voir tout →" standard pour l'en-tête d'une DbCard */
export function CardLink({ href, onClick, children }) {
  return href ? (
    <a href={href} className="db-card-link">{children}</a>
  ) : (
    <button type="button" className="db-card-link" onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------
 * Badge — pastille verte / rouge autonome (ex: compteur de retards)
 * ------------------------------------------------------------------ */
export function Badge({ tone = 'green', children }) {
  return <span className={tone === 'green' ? 'badge-green kpi-badge' : 'badge-red kpi-badge'}>{children}</span>;
}

/* ------------------------------------------------------------------
 * EmptyState — état vide générique
 * ------------------------------------------------------------------ */
export function EmptyState({ text, positive = false }) {
  return (
    <div className="empty-state">
      <div className={`empty-icon ${positive ? 'empty-icon--green' : ''}`}>
        {positive && <CheckCircle2 size={20} color="#1E7A4C" strokeWidth={2.5} />}
      </div>
      <div className="empty-text">{text}</div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * PageHeader — titre de page + zone d'actions (bouton primaire, etc.)
 * ------------------------------------------------------------------ */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {children && <div className="header-actions">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------
 * StatusPill — statut d'une transaction (valide / en_attente / annule)
 * ------------------------------------------------------------------ */
const STATUS_LABELS = {
  valide: 'Validé',
  en_attente: 'En attente',
  annule: 'Annulé',
};
const STATUS_CLASSES = {
  valide: 'status-valide',
  en_attente: 'status-attente',
  annule: 'status-annule',
};
export function StatusPill({ status }) {
  return (
    <span className={`status-pill ${STATUS_CLASSES[status] ?? 'status-attente'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* ------------------------------------------------------------------
 * TypePill — revenu / dépense, avec le même code couleur que le reste
 * ------------------------------------------------------------------ */
export function TypePill({ type }) {
  const isRevenu = type === 'revenu';
  return (
    <span className={`type-pill ${isRevenu ? 'type-pill--revenu' : 'type-pill--depense'}`}>
      <span className="dot" />
      {isRevenu ? 'Revenu' : 'Dépense'}
    </span>
  );
}

/* ------------------------------------------------------------------
 * Pagination — pied de tableau (compteur + précédent/suivant)
 * ------------------------------------------------------------------ */
export function Pagination({ page, totalPages, count, pageSize, onPageChange }) {
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, count);

  return (
    <div className="pagination">
      <span className="pagination-info">
        {start}–{end} sur {count}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="row-action-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="pagination-page">{page} / {totalPages}</span>
        <button
          type="button"
          className="row-action-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
