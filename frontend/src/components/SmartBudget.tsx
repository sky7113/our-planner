'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Utensils, Zap, Store, TrendingUp, Plus, Trash2, Loader2, Edit2, History, Check, X, Calendar, AlertTriangle, ExternalLink } from 'lucide-react';

interface Transaction {
    id: number;
    item: string;
    amount: number;
    date: string;
}

interface BudgetData {
    spent: number;
    limit: number;
    period: string;
    message: string;
    transactions: Transaction[];
}

const quickAccess = [
    { name: 'Zomato', icon: '🍕', url: 'https://www.zomato.com' },
    { name: 'Swiggy', icon: '🧡', url: 'https://www.swiggy.com' },
    { name: 'Blinkit', icon: '🛒', url: 'https://blinkit.com' },
    { name: 'Uber', icon: '🚕', url: 'https://m.uber.com' },
    { name: 'Rapido', icon: '🛵', url: 'https://www.rapido.bike' },
];

const periods = ['daily', 'weekly', 'monthly', 'yearly'];

export default function SmartBudget() {
    const [data, setData] = useState<BudgetData | null>(null);
    const [activePeriod, setActivePeriod] = useState('daily');

    // Add Item State
    const [newItem, setNewItem] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Limit Edit State
    const [isEditingLimit, setIsEditingLimit] = useState(false);
    const [newLimit, setNewLimit] = useState('');
    const [isRecurring, setIsRecurring] = useState(true);

    // Date State
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Transaction Edit State
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [editItem, setEditItem] = useState('');
    const [editAmount, setEditAmount] = useState('');

    const fetchData = async () => {
        try {
            let url = `https://our-backend-api.onrender.com/api/budget?period=${activePeriod}`;
            if (activePeriod === 'daily') {
                url += `&date=${selectedDate}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const jsonData = await res.json();
                setData(jsonData);
                setNewLimit(jsonData.limit.toString());
            }
        } catch (error) {
            console.error("Failed to fetch budget:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activePeriod, selectedDate]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem || !newAmount) return;

        setIsAdding(true);
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/budget/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: newItem, amount: parseFloat(newAmount) })
            });
            if (res.ok) {
                setNewItem('');
                setNewAmount('');
                fetchData();
            }
        } catch (error) {
            console.error("Add failed:", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`https://our-backend-api.onrender.com/api/budget/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const handleQuickAction = async (serviceName: string, url: string) => {
        window.open(url, '_blank');
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/budget/quick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_name: serviceName })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error("Quick add failed:", error);
        }
    };

    const handleUpdateLimit = async () => {
        if (!newLimit) return;
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/budget/limit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    period: activePeriod,
                    amount: parseFloat(newLimit),
                    is_recurring: isRecurring
                })
            });
            if (res.ok) {
                setIsEditingLimit(false);
                fetchData();
            }
        } catch (error) {
            console.error("Update limit failed:", error);
        }
    };

    const startEditTx = (tx: Transaction) => {
        setEditingTx(tx);
        // Remove "(Pending)" text if present to make editing easier
        setEditItem(tx.item.replace(' (Pending)', ''));
        setEditAmount(tx.amount === 0 ? '' : tx.amount.toString());
    };

    const saveEditTx = async () => {
        if (!editingTx || !editItem || !editAmount) return;
        try {
            const res = await fetch(`https://our-backend-api.onrender.com/api/budget/${editingTx.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: editItem, amount: parseFloat(editAmount) })
            });
            if (res.ok) {
                setEditingTx(null);
                fetchData();
            }
        } catch (error) {
            console.error("Update tx failed:", error);
        }
    };

    if (!data) return <div className="p-6 text-slate-400">Loading Supply Corps...</div>;

    // Calculate total from the current list of expenses (Dynamic Frontend Calc)
    const totalSpent = data.transactions.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

    const safeLimit = Number(data.limit) || 1; // Prevent division by zero
    const percentage = (totalSpent / safeLimit) * 100;
    const isSafe = percentage < 80;

    return (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-300 relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-medium text-slate-100">
                            The Supply Corps
                        </h2>
                        <p className="text-xs text-slate-400">Budget Ops Center</p>
                    </div>
                </div>
            </div>

            {/* Timeframe Tabs */}
            <div className="flex bg-white/5 rounded-lg p-1 mb-6">
                {periods.map((period) => (
                    <button
                        key={period}
                        onClick={() => setActivePeriod(period)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${activePeriod === period
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        {period}
                    </button>
                ))}
            </div>

            {/* Budget Gauge */}
            <div className="mb-8 relative">
                <div className="flex justify-between items-end text-sm mb-2 text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="text-xl md:text-2xl font-bold text-white tracking-tight">
                            {activePeriod === 'daily'
                                ? (selectedDate === new Date().toISOString().split('T')[0] ? "Today's Budget" : `Budget for ${selectedDate}`)
                                : `${activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)} Budget`
                            }
                        </span>

                        {activePeriod === 'daily' && (
                            <div className="relative flex items-center">
                                <label className="cursor-pointer text-slate-500 hover:text-pink-400 transition-colors">
                                    <Calendar size={14} />
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </label>
                            </div>
                        )}

                        {isEditingLimit ? (
                            <div className="absolute top-8 left-0 z-20 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl w-64">
                                <p className="text-xs text-slate-300 mb-2 font-medium">Set {activePeriod} limit:</p>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="number"
                                        value={newLimit}
                                        onChange={(e) => setNewLimit(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-pink-500"
                                        autoFocus
                                    />
                                    <button onClick={handleUpdateLimit} className="bg-emerald-500/20 text-emerald-400 p-1 rounded hover:bg-emerald-500/30"><Check size={16} /></button>
                                    <button onClick={() => setIsEditingLimit(false)} className="bg-rose-500/20 text-rose-400 p-1 rounded hover:bg-rose-500/30"><X size={16} /></button>
                                </div>

                                {activePeriod === 'daily' && (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={isRecurring}
                                                onChange={() => setIsRecurring(true)}
                                                className="accent-pink-500"
                                            />
                                            Set for Every Day (Default)
                                        </label>
                                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={!isRecurring}
                                                onChange={() => setIsRecurring(false)}
                                                className="accent-pink-500"
                                            />
                                            Set for Today Only
                                        </label>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 group cursor-pointer" onClick={() => setIsEditingLimit(true)}>
                                <span>(₹{data.limit})</span>
                                <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-pink-400" />
                            </div>
                        )}
                    </div>

                    <span className={`text-2xl md:text-3xl font-bold ${isSafe ? "text-emerald-400" : "text-rose-400"} drop-shadow-md`}>
                        {Math.min(percentage, 100).toFixed(0)}% Used <span className="text-lg opacity-60 font-normal">(₹{totalSpent})</span>
                    </span>
                </div>

                <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden relative">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={`h-full rounded-full ${isSafe ? 'bg-emerald-500' : 'bg-rose-500'} shadow-[0_0_10px_currentColor]`}
                    />
                </div>
            </div>

            {/* Quick Actions (Moved Up) */}
            <div className="mb-6">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Quick Launch</p>
                <div className="flex flex-wrap gap-3 justify-center">
                    {quickAccess.map((app) => (
                        <button
                            key={app.name}
                            onClick={() => handleQuickAction(app.name, app.url)}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all duration-300 group min-w-[100px] flex-1 bg-white/5`}
                            title={`Open ${app.name} & Log Expense`}
                        >
                            <span className="text-3xl filter drop-shadow-lg group-hover:scale-110 transition-transform">{app.icon}</span>
                            <span className="text-sm font-medium text-slate-300">{app.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Add Expense Form (Super-Sized) */}
            <form onSubmit={handleAddExpense} className="mb-10 flex gap-3">
                <input
                    type="text"
                    placeholder="Item (e.g. Coffee)"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-lg text-white focus:outline-none focus:border-pink-500/50 placeholder:text-white/20 transition-all"
                />
                <input
                    type="number"
                    placeholder="₹"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-28 h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-lg text-white focus:outline-none focus:border-pink-500/50 placeholder:text-white/20 transition-all text-center"
                />
                <button
                    type="submit"
                    disabled={isAdding}
                    className="h-14 w-14 flex-shrink-0 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95"
                >
                    {isAdding ? <Loader2 size={24} className="animate-spin" /> : <Plus size={28} />}
                </button>
            </form>

            {/* AI Insight */}
            <div className="mb-8 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex gap-3">
                <div className="text-indigo-400 mt-1">
                    <TrendingUp size={20} />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">Budget AI</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        {data.message}
                    </p>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-slate-400">Recent Maneuvers</h3>
                    <div className="group relative">
                        <History size={14} className="text-slate-600 cursor-help" />
                        <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-black/80 text-xs text-slate-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Data resets for the view ({activePeriod}), but is securely archived. Click row to edit.
                        </div>
                    </div>
                </div>

                <AnimatePresence mode='popLayout'>
                    {data.transactions.length === 0 && <p className="text-slate-500 text-sm italic">No expenses in this period.</p>}
                    {data.transactions.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onClick={() => startEditTx(t)}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 group hover:bg-white/10 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-md bg-slate-700/50 text-slate-300">
                                    <Store size={14} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-200">{t.item}</p>
                                    <p className="text-[10px] text-slate-500">{t.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {t.amount === 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-medium flex items-center gap-1">
                                        <AlertTriangle size={10} /> Pending
                                    </span>
                                ) : (
                                    <span className="text-sm font-medium text-slate-300">₹{t.amount}</span>
                                )}

                                <button
                                    onClick={(e) => handleDelete(t.id, e)}
                                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Edit Transaction Modal */}
            <AnimatePresence>
                {editingTx && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-4/5 shadow-2xl"
                        >
                            <h3 className="text-white font-medium mb-4">Edit Expense</h3>
                            <div className="space-y-3 mb-6">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Item</label>
                                    <input
                                        type="text"
                                        value={editItem}
                                        onChange={(e) => setEditItem(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Amount</label>
                                    <input
                                        type="number"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setEditingTx(null)}
                                    className="px-4 py-2 rounded-lg text-slate-400 hover:bg-white/5 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEditTx}
                                    className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
