import { transactionsApi } from "../../api/transactionsApi.js";

export function QuickAdd({ onAdd }) {
    const quickActions = [
        { label: '+50 000 FCFA', amount: 50000},
        { label: '+100 000 FCFA', amount: 100000 },
        { label: '+200 000 FCFA', amount: 200000 },
        { label: '-25 000 FCFA', amount: -25000 },
        { label: '-50 000 FCFA', amount: -50000 },
    ];

    const handleQuickAdd = async (amount) => {
        const text = amount < 0 ? 'Dépense diverse' : 'Recette diverse';

        try {
            await onAdd({ text, amount });
        } catch (err) {
            console.error('Erreur quick add:', err);
        }
    };

    return (
        <div className="quick-add-row">
            {quickActions.map((action) => (
                <button
                    key={action.amount}
                    className={`btn-quick ${action.amount < 0 ? 'expense' : 'income'}`}
                    onClick={() => handleQuickAdd(action.amount)}
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
}