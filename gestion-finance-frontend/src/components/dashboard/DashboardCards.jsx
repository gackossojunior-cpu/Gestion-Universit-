import { DbCard, CardLink, EmptyState, Badge } from '../ui';
import { fmt } from '../../utils/formatCurrency.js';

/* ------------------------------------------------------------------
 * État des paiements étudiants
 * ------------------------------------------------------------------ */
export function StudentPaymentsCard({ etu, totalPaye, totalAttendu, pctRecouvrement, etudiantsHref }) {
  return (
    <DbCard
      title="État des paiements étudiants"
      headerRight={<CardLink href={etudiantsHref}>Voir tout →</CardLink>}
    >
      <div className="stu-grid">
        <div className="stu-stat stu-total">
          <div className="stu-label">Total</div>
          <div className="stu-val">{etu?.total ?? 0}</div>
        </div>
        <div className="stu-stat stu-payes">
          <div className="stu-label">Payés</div>
          <div className="stu-val">{etu?.payes ?? 0}</div>
        </div>
        <div className="stu-stat stu-partiels">
          <div className="stu-label">Partiels</div>
          <div className="stu-val">{etu?.partiels ?? 0}</div>
        </div>
        <div className="stu-stat stu-nonpayes">
          <div className="stu-label">Non payés</div>
          <div className="stu-val">{etu?.non_payes ?? 0}</div>
        </div>
      </div>

      <div className="recouv-wrap">
        <div className="recouv-top">
          <span className="recouv-label">Objectif de recouvrement</span>
          <span className="recouv-amounts">
            <strong>{fmt(totalPaye)}</strong> / {fmt(totalAttendu)} FCFA
          </span>
        </div>
        <div className="recouv-track">
          <div className="recouv-fill" style={{ width: `${pctRecouvrement ?? 0}%` }} />
        </div>
        <div className="recouv-pct">{Number(pctRecouvrement ?? 0).toFixed(1)}% recouvré</div>
      </div>
    </DbCard>
  );
}

/* ------------------------------------------------------------------
 * Masse salariale
 * ------------------------------------------------------------------ */
export function SalaryMassCard({ totalSalaires, totalPayeSalaires }) {
  return (
    <DbCard title="Masse Salariale">
      <div className="sal-grid">
        <div className="sal-item">
          <div className="sal-label">Total Salaires</div>
          <div className="sal-val">{fmt(totalSalaires)} <span className="sal-currency">FCFA</span></div>
        </div>
        <div className="sal-item sal-item--green">
          <div className="sal-label">Déjà payé</div>
          <div className="sal-val">{fmt(totalPayeSalaires)} <span className="sal-currency">FCFA</span></div>
        </div>
      </div>
    </DbCard>
  );
}

/* ------------------------------------------------------------------
 * Retards de paiement
 * ------------------------------------------------------------------ */
export function LatePaymentsCard({ retard = [] }) {
  return (
    <DbCard
      title="Retards de paiement"
      noPad
      headerRight={retard.length ? <Badge tone="red">{retard.length}</Badge> : null}
    >
      {retard.length ? (
        <table className="db-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Matricule</th>
              <th style={{ textAlign: 'right' }}>Reste à payer</th>
            </tr>
          </thead>
          <tbody>
            {retard.map((s, i) => (
              <tr key={s.matricule ?? i}>
                <td className="db-table-name">{s.name}</td>
                <td className="db-table-mono">{s.matricule}</td>
                <td className="db-table-amount">{fmt(s.reste)} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState positive text="Aucun retard de paiement" />
      )}
    </DbCard>
  );
}

/* ------------------------------------------------------------------
 * Derniers paiements
 * ------------------------------------------------------------------ */
export function RecentTransactionsCard({ transactions = [], transactionsHref }) {
  return (
    <DbCard
      title="Derniers paiements"
      noPad
      headerRight={<CardLink href={transactionsHref}>Voir tout</CardLink>}
    >
      {transactions.length ? (
        transactions.map((t, i) => (
          <div className="tx-row" key={i}>
            <div className={`tx-dot ${t.amount > 0 ? 'tx-dot--in' : 'tx-dot--out'}`} />
            <div className="tx-info">
              <div className="tx-text">{t.text}</div>
              <div className="tx-date">
                {new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div className={`tx-amount ${t.amount > 0 ? 'tx-amount--in' : 'tx-amount--out'}`}>
              {t.amount > 0 ? '+' : ''}{fmt(t.amount)} <span className="tx-currency">FCFA</span>
            </div>
          </div>
        ))
      ) : (
        <EmptyState text="Aucune transaction récente" />
      )}
    </DbCard>
  );
}
