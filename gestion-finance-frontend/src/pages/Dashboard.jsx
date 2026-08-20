import { KpiCard } from '../components/ui';
import { FinanceChart } from '../components/dashboard/FinanceChart';
import {
  StudentPaymentsCard,
  SalaryMassCard,
  LatePaymentsCard,
  RecentTransactionsCard,
} from '../components/dashboard/DashboardCards';
import { useDashboardData } from '../hooks/useDashboardData';
import { fmt } from '../utils/formatCurrency.js';
import '../styles/dashboard.css';

export default function Dashboard() {

  const { data, loading, error, refetch } = useDashboardData();

  if (loading) {
    return <div className="db-loading">Chargement du tableau de bord…</div>;
  }

  if (error) {
    return (
      <div className="db-error">
        {error}{' '}
        <button type="button" className="btn" onClick={refetch} style={{ marginLeft: 8 }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="db-wrap">

      {/* Row 1 — KPI */}
      <div className="kpi-row">
        <KpiCard
          label="Solde Global"
          value={fmt(data.solde)}
          badge={{ tone: 'up', text: '+12.4%' }}
        />
        <KpiCard
          label="Revenus"
          value={fmt(data.income)}
          trend={{ tone: 'up', text: 'En hausse' }}
        />
        <KpiCard
          label="Dépenses"
          value={fmt(data.expense)}
          trend={{ tone: 'down', text: 'En baisse' }}
        />
        <KpiCard
          label="Étudiants"
          value={data.etu?.total ?? 0}
          unit="inscrits"
          large
          progress={{
            pct: data.pct_recouvrement ?? 0,
            label: `${Number(data.pct_recouvrement ?? 0).toFixed(1)}% recouv.`,
          }}
        />
      </div>

      {/* Row 2 — grille principale */}
      <div className="main-grid">
        <div className="col-left">
          <div className="db-card">
            <div className="db-card-header">
              <span className="db-card-title">Revenus vs Dépenses</span>
            </div>
            <div className="db-card-body">
              <FinanceChart
                labels={data.labels_chart ?? []}
                revenus={data.revenus_chart ?? []}
                depenses={data.depenses_chart ?? []}
              />
            </div>
          </div>

          <StudentPaymentsCard
            etu={data.etu}
            totalPaye={data.total_paye}
            totalAttendu={data.total_attendu}
            pctRecouvrement={data.pct_recouvrement}
            etudiantsHref="/finance/etudiants/"
          />
        </div>

        <div className="col-right">
          <SalaryMassCard
            totalSalaires={data.total_salaires}
            totalPayeSalaires={data.total_paye_salaires}
          />
          <LatePaymentsCard retard={data.retard} />
          <RecentTransactionsCard
            transactions={data.derniers_paiements}
            transactionsHref="/finance/transactions/"
          />
        </div>
      </div>

    </div>
  );
}