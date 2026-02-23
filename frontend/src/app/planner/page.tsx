'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, CheckCircle2, Circle, Plus, ChevronLeft, ChevronRight,
    Target, Sun, Moon, Clock, BookOpen, Star, Sparkles, X, Trophy, Trash2, Lock
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PlannerEvent {
    id: number;
    title: string;
    date: string;
    category: 'daily' | 'weekly' | 'monthly' | 'yearly';
    is_completed: boolean;
    priority: 'High' | 'Medium' | 'Low';
}

interface Goal {
    id: number;
    title: string;
    category: string;
    target_date: string;
    motivation: string;
    progress: number;
    is_achieved: boolean;
}

const TABS = [
    { id: 'daily', label: 'Daily', icon: Sun },
    { id: 'weekly', label: 'Weekly', icon: Calendar },
    { id: 'monthly', label: 'Monthly', icon: Calendar },
    { id: 'yearly', label: 'Yearly', icon: Target },
    { id: 'vision', label: 'Vision', icon: Sparkles }, // New Tab
];

const GOAL_CATEGORIES = [
    { id: 'Career', label: 'Career 🎓', color: 'blue' },
    { id: 'Health', label: 'Health 🌿', color: 'green' },
    { id: 'Joy', label: 'Joy ✨', color: 'yellow' },
    { id: 'Wealth', label: 'Wealth 💰', color: 'amber' },
    { id: 'Personal', label: 'Personal 💖', color: 'pink' },
];

export default function PlannerPage() {
    const { theme } = useTheme();
    const { userId } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);

    const [view, setView] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'vision'>('daily');
    const [events, setEvents] = useState<PlannerEvent[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);

    // Event State
    const [isAdding, setIsAdding] = useState(false);
    const [newTask, setNewTask] = useState('');
    const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');

    // Goal State
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState({
        title: '',
        category: 'Career',
        target_date: new Date().toISOString().split('T')[0],
        motivation: '',
        progress: 0
    });


    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            if (view === 'vision') {
                const res = await fetch(`${API_BASE_URL}/api/goals`, {
                    headers: { 'x-clerk-user-id': userId as string }
                });
                if (res.ok) {
                    const data = await res.json();
                    setGoals(data);
                }
            } else {
                const res = await fetch(`${API_BASE_URL}/api/planner?category=${view}`, {
                    headers: { 'x-clerk-user-id': userId as string }
                });
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [view, userId]);

    // Check access then fetch events
    useEffect(() => {
        if (!userId) {
            setIsCheckingAccess(false);
            return;
        }

        const checkAccessAndFetch = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/users/me`, {
                    headers: { 'x-clerk-user-id': userId }
                });
                setUserProfile(res.data);

                // If not admin and partner locked journal, don't fetch data
                if (!res.data.is_admin && res.data.couple && res.data.couple.partner_can_journal === false) {
                    setIsCheckingAccess(false);
                    setLoading(false);
                    return;
                }

                await fetchEvents();
            } catch (error) {
                console.error("Error fetching user profile:", error);
                setLoading(false);
            } finally {
                setIsCheckingAccess(false);
            }
        };

        checkAccessAndFetch();
    }, [userId, fetchEvents]);

    // --- Event Handlers ---

    const handleAddEvent = async () => {
        if (!newTask.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/planner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId as string
                },
                body: JSON.stringify({
                    title: newTask,
                    date: newTaskDate,
                    category: view,
                    priority: newTaskPriority
                })
            });
            if (res.ok) {
                setNewTask('');
                setIsAdding(false);
                fetchEvents();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleEvent = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/planner/${id}/toggle`, {
                method: 'PUT',
                headers: { 'x-clerk-user-id': userId as string }
            });
            if (res.ok) {
                setEvents(events.map(e => e.id === id ? { ...e, is_completed: !e.is_completed } : e));
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- Goal Handlers ---

    const handleCreateGoal = async () => {
        if (!newGoal.title || !newGoal.motivation) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/goals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId as string
                },
                body: JSON.stringify(newGoal)
            });
            if (res.ok) {
                setIsGoalModalOpen(false);
                setNewGoal({ title: '', category: 'Career', target_date: new Date().toISOString().split('T')[0], motivation: '', progress: 0 });
                fetchEvents(); // Refresh goals
            }
        } catch (error) {
            console.error(error);
        }
    };

    const updateGoalProgress = async (id: number, newProgress: number) => {
        // Optimistic update
        setGoals(goals.map(g => g.id === id ? { ...g, progress: newProgress, is_achieved: newProgress >= 100 } : g));

        try {
            await fetch(`${API_BASE_URL}/api/goals/${id}/progress`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId as string
                },
                body: JSON.stringify({ progress: newProgress })
            });
        } catch (error) {
            console.error(error);
        }
    };

    const deleteGoal = async (id: number) => {
        if (!confirm('Are you sure you want to delete this goal?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/goals/${id}`, {
                method: 'DELETE',
                headers: { 'x-clerk-user-id': userId as string }
            });
            if (res.ok) {
                setGoals(goals.filter(g => g.id !== id));
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- Helpers ---
    const getWeekDays = () => {
        const curr = new Date();
        const week = [];
        curr.setDate(curr.getDate() - curr.getDay() + 1); // Start Monday
        for (let i = 0; i < 7; i++) {
            week.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }
        return week;
    };

    const quarters = [
        { id: 'Q1', months: ['Jan', 'Feb', 'Mar'] },
        { id: 'Q2', months: ['Apr', 'May', 'Jun'] },
        { id: 'Q3', months: ['Jul', 'Aug', 'Sep'] },
        { id: 'Q4', months: ['Oct', 'Nov', 'Dec'] },
    ];

    if (!theme) return null;

    return (
        <main className={`min-h-screen ${theme.colors.backgroundClass} text-white p-6 pb-24 transition-colors duration-700`}>
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-light tracking-wide text-white flex items-center gap-2">
                    <BookOpen size={28} className="text-purple-300" />
                    Royal Planner
                </h1>

                {/* Navigation Tabs */}
                <div className="flex bg-white/5 p-1 rounded-xl backdrop-blur-md border border-white/10 overflow-x-auto max-w-full">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id as any)}
                            className={`px-6 py-3 rounded-xl flex items-center gap-3 text-base md:text-lg font-medium transition-all whitespace-nowrap ${view === tab.id
                                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                                : 'text-white/50 hover:text-white/80'
                                }`}
                        >
                            <tab.icon size={20} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto">
                {isCheckingAccess || loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                ) : userProfile && !userProfile.is_admin && userProfile.couple && userProfile.couple.partner_can_journal === false ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-auto relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="relative z-10 flex flex-col items-center"
                            >
                                <div className="p-4 bg-slate-800/80 rounded-full text-purple-400 mb-6 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                                    <Lock size={48} strokeWidth={1.5} />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-primary)]">Planner Locked</h2>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    This room has been locked by your partner. You need permission to use the planner and vision board.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* --- DAILY VIEW --- */}
                            {view === 'daily' && (
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-light">Today&apos;s Agenda</h2>
                                        <button
                                            onClick={() => setIsAdding(!isAdding)}
                                            className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-200 flex items-center justify-center hover:bg-purple-500 hover:text-white transition-all shadow-lg"
                                        >
                                            <Plus size={28} />
                                        </button>
                                    </div>

                                    {isAdding && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 bg-black/20 p-4 rounded-xl">
                                            <input
                                                type="text"
                                                value={newTask}
                                                onChange={(e) => setNewTask(e.target.value)}
                                                placeholder="What needs to be done?"
                                                className="w-full bg-transparent border-none focus:outline-none text-lg mb-2 text-white placeholder-white/30"
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-3 mt-4">
                                                <button onClick={() => setIsAdding(false)} className="px-6 h-12 rounded-xl text-base text-white/50 hover:bg-white/5">Cancel</button>
                                                <button onClick={handleAddEvent} className="px-8 h-12 bg-purple-600 rounded-xl text-base font-medium hover:bg-purple-500 transition-colors">Add Task</button>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="space-y-3">
                                        {events.length === 0 && !loading && (
                                            <p className="text-center text-white/30 py-10">No tasks for today. Enjoy the peace.</p>
                                        )}
                                        {events.map((event) => (
                                            <div key={event.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                                <button onClick={() => toggleEvent(event.id)} className="text-white/50 hover:text-purple-400 transition-colors">
                                                    {event.is_completed ? <CheckCircle2 size={24} className="text-green-400" /> : <Circle size={24} />}
                                                </button>
                                                <span className={`flex-1 text-lg ${event.is_completed ? 'line-through opacity-40' : ''}`}>
                                                    {event.title}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider ${event.priority === 'High' ? 'bg-red-500/20 text-red-200' :
                                                    event.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-200' :
                                                        'bg-blue-500/20 text-blue-200'
                                                    }`}>
                                                    {event.priority}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* --- WEEKLY VIEW --- */}
                            {view === 'weekly' && (
                                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                                    {getWeekDays().map((day, i) => (
                                        <div key={i} className="bg-slate-900/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-h-[200px]">
                                            <h3 className="text-center font-medium text-white/70 mb-1">{day.toLocaleDateString('en-US', { weekday: 'short' })}</h3>
                                            <p className="text-center text-2xl font-light mb-4 text-purple-200">{day.getDate()}</p>

                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => {
                                                        setNewTaskDate(day.toISOString().split('T')[0]);
                                                        setView('weekly');
                                                        setIsAdding(true);
                                                    }}
                                                    className="w-full py-1 text-xs text-center border border-dashed border-white/20 rounded-lg text-white/30 hover:bg-white/5"
                                                >
                                                    +
                                                </button>
                                                {events.filter(e => e.date === day.toISOString().split('T')[0]).map(e => (
                                                    <div key={e.id} className="text-xs p-2 bg-white/10 rounded-lg border-l-2 border-purple-500 truncate">
                                                        {e.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* --- MONTHLY VIEW --- */}
                            {view === 'monthly' && (
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-xl">
                                    <div className="grid grid-cols-7 gap-4 text-center mb-4 text-white/50 text-sm uppercase tracking-widest">
                                        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                        {Array.from({ length: 35 }).map((_, i) => (
                                            <div key={i} className="aspect-square bg-white/5 rounded-xl p-2 border border-white/5 hover:border-purple-500/50 transition-colors relative">
                                                <span className="text-white/40 text-sm absolute top-2 right-2">{i + 1 <= 30 ? i + 1 : ''}</span>
                                                {/* Dots for events */}
                                                <div className="absolute bottom-2 left-2 flex gap-1">
                                                    {i % 5 === 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                                                    {i % 8 === 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-center">
                                        <button
                                            onClick={() => setIsAdding(!isAdding)}
                                            className="px-6 py-2 bg-purple-600 rounded-full text-sm font-medium shadow-lg shadow-purple-900/40 hover:scale-105 transition-transform"
                                        >
                                            Add Event to Calendar
                                        </button>

                                        {isAdding && (
                                            <div className="mt-6 max-w-lg mx-auto bg-black/40 p-6 rounded-2xl border border-white/10">
                                                <input
                                                    type="date"
                                                    value={newTaskDate}
                                                    onChange={(e) => setNewTaskDate(e.target.value)}
                                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-lg text-white mb-4 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={newTask}
                                                    onChange={(e) => setNewTask(e.target.value)}
                                                    placeholder="Event Title..."
                                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-lg text-white mb-4 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                />
                                                <button onClick={handleAddEvent} className="w-full h-14 bg-purple-600 hover:bg-purple-500 rounded-xl text-lg font-medium transition-colors shadow-lg">Save Event</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- YEARLY VIEW --- */}
                            {view === 'yearly' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {quarters.map((q) => (
                                        <div key={q.id} className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                                            <div className="absolute -right-10 -top-10 text-[10rem] font-bold text-white/5 select-none">{q.id}</div>
                                            <h3 className="text-2xl font-light mb-4 relative z-10">{q.id} Goals</h3>
                                            <p className="text-white/40 text-sm mb-6 relative z-10">{q.months.join(' • ')}</p>

                                            <div className="space-y-4 relative z-10">
                                                {events.filter(e => e.category === 'yearly').map(e => (
                                                    <div key={e.id} className="flex items-center gap-3">
                                                        <Star size={16} className="text-yellow-400" />
                                                        <span>{e.title}</span>
                                                    </div>
                                                ))}
                                                {/* Note: Simplified add logic for yearly view reuse */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* --- VISION BOARD VIEW (NEW) --- */}
                            {view === 'vision' && (
                                <div>
                                    <div className="text-center mb-10">
                                        <h2 className="text-4xl font-thin mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">Manifest Your Future</h2>
                                        <button
                                            onClick={() => setIsGoalModalOpen(true)}
                                            className="px-8 py-3 bg-white text-slate-900 rounded-full font-medium shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all transform hover:scale-105"
                                        >
                                            + Add New Dream
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {goals.map((goal) => (
                                            <motion.div
                                                key={goal.id}
                                                layout
                                                className={`relative p-6 rounded-3xl border backdrop-blur-xl overflow-hidden group transition-all duration-500 ${goal.is_achieved
                                                    ? 'bg-amber-900/20 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                                                    : 'bg-slate-900/40 border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                {/* Glow Effect for Achieved */}
                                                {goal.is_achieved && (
                                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}
                                                    className="absolute top-4 right-4 text-white/10 hover:text-red-400 transition-colors z-20"
                                                >
                                                    <Trash2 size={18} />
                                                </button>

                                                <div className="flex justify-between items-start mb-4 pr-8">
                                                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-md ${goal.is_achieved ? 'bg-amber-500 text-slate-900' : 'bg-white/10 text-white/60'
                                                        }`}>
                                                        {goal.category}
                                                    </span>
                                                    {goal.is_achieved && <Trophy size={20} className="text-amber-400" />}
                                                </div>

                                                <h3 className="text-2xl font-light mb-2">{goal.title}</h3>
                                                <p className="text-sm text-white/60 italic mb-6 border-l-2 border-white/10 pl-3">
                                                    &quot;{goal.motivation}&quot;
                                                </p>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs text-white/40">
                                                        <span>Progress</span>
                                                        <span>{goal.progress}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={goal.progress}
                                                        onChange={(e) => updateGoalProgress(goal.id, parseInt(e.target.value))}
                                                        className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-white hover:accent-purple-400 transition-all"
                                                    />
                                                </div>

                                                <div className="mt-4 text-xs text-white/30 text-right">
                                                    Target: {goal.target_date}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                )}
            </div>

            {/* --- GOAL SETTER MODAL --- */}
            <AnimatePresence>
                {isGoalModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsGoalModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-white/20 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />
                            <button onClick={() => setIsGoalModalOpen(false)} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white"><X size={20} /></button>

                            <h2 className="text-3xl font-light mb-6">Set a New Goal</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-white/50 font-bold mb-1 block">Dream Name</label>
                                    <input
                                        type="text"
                                        value={newGoal.title}
                                        onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                                        className="w-full h-14 bg-black/20 border border-white/10 rounded-xl px-4 text-lg focus:border-purple-500 outline-none transition-colors"
                                        placeholder="e.g., Master Python"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-white/50 font-bold mb-1 block">Category</label>
                                        <select
                                            value={newGoal.category}
                                            onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none"
                                        >
                                            {GOAL_CATEGORIES.map(cat => (
                                                <option key={cat.id} value={cat.id} className="bg-slate-900">{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-white/50 font-bold mb-1 block">Target Date</label>
                                        <input
                                            type="date"
                                            value={newGoal.target_date}
                                            onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs uppercase tracking-wider text-white/50 font-bold mb-1 block">My &apos;Why&apos;</label>
                                    <textarea
                                        value={newGoal.motivation}
                                        onChange={(e) => setNewGoal({ ...newGoal, motivation: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 min-h-[100px] outline-none resize-none"
                                        placeholder="Why does this matter to me?"
                                    />
                                </div>

                                <button
                                    onClick={handleCreateGoal}
                                    className="w-full py-4 mt-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium shadow-lg hover:scale-[1.02] transition-transform"
                                >
                                    Manifest It ✨
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
