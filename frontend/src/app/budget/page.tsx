'use client';
export const dynamic = 'force-dynamic';
import SmartBudget from "../../components/SmartBudget";


export default function BudgetPage() {
    return (
        <main className="min-h-screen bg-slate-950 flex justify-center pt-8 pb-32 px-4">
            <SmartBudget />
        </main>
    );
}
