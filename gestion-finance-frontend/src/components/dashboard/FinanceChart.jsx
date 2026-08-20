import { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const GREEN = '#1E7A4C';
const BRICK = '#A93A26';
const GREEN_FILL = 'rgba(30,122,76,.12)';
const BRICK_FILL = 'rgba(169,58,38,.10)';

const DEFAULT_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];

/**
 * props:
 *  - labels: string[]   (mois affichés en abscisse)
 *  - revenus: number[]  (série verte)
 *  - depenses: number[] (série brique)
 */
export function FinanceChart({ labels = DEFAULT_LABELS, revenus = [], depenses = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenus',
            data: revenus,
            borderColor: GREEN,
            backgroundColor: GREEN_FILL,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: GREEN,
          },
          {
            label: 'Dépenses',
            data: depenses,
            borderColor: BRICK,
            backgroundColor: BRICK_FILL,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: BRICK,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              font: { family: 'Inter, sans-serif', size: 12 },
              color: '#565F6E',
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#1B2A4A',
            bodyColor: '#565F6E',
            borderColor: '#E8E8E8',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label} : ${new Intl.NumberFormat('fr-FR').format(ctx.parsed.y)} FCFA`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#8891A0', font: { family: 'Inter, sans-serif', size: 12 } },
          },
          y: {
            grid: { color: '#F0F0F0', lineWidth: 1 },
            border: { display: false },
            ticks: {
              color: '#8891A0',
              font: { family: "'IBM Plex Mono', monospace", size: 11 },
              callback: (v) => `${(v / 1000000).toFixed(0)}M`,
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [labels, revenus, depenses]);

  return (
    <div style={{ height: 260 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
