'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Moon, Droplets, Calendar as CalendarIcon, Heart,
    ArrowLeft, Send, Sparkles, Wind, Frown, Zap, Coffee
} from 'lucide-react';
import Link from 'next/link';



interface Prediction {
    last_start: string;
    predicted_start: string;
    days_until: number;
}

const FLOW_OPTIONS = [
    { value: 'Light', label: 'Light', icon: Droplets, size: 16 },
    { value: 'Medium', label: 'Medium', icon: Droplets, size: 20 },
    { value: 'Heavy', label: 'Heavy', icon: Droplets, size: 24 },
];

const SYMPTOMS = [
    { id: 'Cramps', label: 'Cramps', icon: Zap },
    { id: 'Headache', label: 'Headache', icon: Frown },
    { id: 'Tired', label: 'Tired', icon: Coffee },
    { id: 'Emotional', label: 'Emotional', icon: Heart },
    { id: 'Cravings', label: 'Cravings', icon: Sparkles },
    { id: 'Bloating', label: 'Bloating', icon: Wind },
];

export default function PeriodTrackerPage() {
    const { theme } = useTheme();

    // State
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [loading, setLoading] = useState(true);

    // Form State
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedFlow, setSelectedFlow] = useState<string>('Medium');
    const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Fetch Prediction on Mount
    useEffect(() => {
        const fetchPrediction = async () => {
            try {
                const res = await fetch('https://our-backend-api.onrender.com/api/period/prediction');
                if (res.ok) {
                    const data = await res.json();
                    // If returns null (no data), data is null
                    if (data && data.predicted_start) {
                        setPrediction(data);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch prediction", e);
            } finally {
                setLoading(false);
            }
        };
        fetchPrediction();
    }, []);

    const toggleSymptom = (id: string) => {
        const newSet = new Set(selectedSymptoms);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedSymptoms(newSet);
    };

    const handleLogCycle = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/period/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_date: startDate,
                    flow: selectedFlow,
                    symptoms: Array.from(selectedSymptoms),
                    notes: "Logged via Moon Cycle Tracker"
                })
            });

            if (res.ok) {
                alert("Cycle logged successfully! 🌙");
                // Refresh prediction logic if user logged a new start date
                // ideally we re-fetch prediction
                const predRes = await fetch('https://our-backend-api.onrender.com/api/period/prediction');
                if (predRes.ok) {
                    const data = await predRes.json();
                    if (data) setPrediction(data);
                }
            }
        } catch (e) {
            console.error(e);
            alert("Failed to log cycle.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!theme) return null;

    return (
        <main className={`min-h-screen ${theme.colors.backgroundClass} text-white p-6 pb-32 transition-colors duration-700 relative overflow-hidden`}>
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div
                    className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
                    style={{ backgroundColor: '#F472B6' }} // Soft Pink
                />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity text-white">
                        <ArrowLeft size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <h1 className="text-3xl font-light tracking-wide text-white flex items-center gap-2">
                        <Moon size={24} className="text-pink-300" fill="currentColor" />
                        Moon Cycle
                    </h1>
                    <div className="w-8"></div> {/* Spacer */}
                </header>

                {/* 1. Prediction Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 text-center p-8 rounded-3xl bg-gradient-to-br from-pink-900/40 to-slate-900/40 border border-pink-500/20 shadow-xl backdrop-blur-md relative overflow-hidden"
                >
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl" />

                    {loading ? (
                        <p className="opacity-50">Reading the stars...</p>
                    ) : prediction ? (
                        <div>
                            <p className="text-pink-200 uppercase tracking-widest text-xs font-bold mb-2">Next Cycle</p>
                            <h2 className="text-5xl font-thin text-white mb-2">
                                {prediction.days_until > 0 ? `${prediction.days_until} Days` : 'Due Now'}
                            </h2>
                            <p className="text-white/60 text-lg">
                                Expected around <span className="font-semibold text-pink-300">{prediction.predicted_start}</span>
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-pink-200 uppercase tracking-widest text-xs font-bold mb-2">Welcome</p>
                            <h2 className="text-3xl font-light text-white mb-2">
                                Track your cycle
                            </h2>
                            <p className="text-white/60">
                                Log your first period to get predictions.
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* 2. Log Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl mb-8"
                >
                    <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                        <CalendarIcon size={18} className="text-pink-400" />
                        Log Today
                    </h3>

                    <div className="space-y-6">
                        {/* Date Picker */}
                        <div>
                            <label className="text-xs uppercase tracking-wider text-pink-300/80 font-bold mb-2 block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-14 bg-black/20 border border-white/10 rounded-xl px-4 text-white text-lg focus:border-pink-500 outline-none transition-colors"
                            />
                        </div>

                        {/* Flow Selector */}
                        <div>
                            <label className="text-xs uppercase tracking-wider text-pink-300/80 font-bold mb-2 block">Flow Intensity</label>
                            <div className="flex gap-2">
                                {FLOW_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSelectedFlow(option.value)}
                                        className={`flex-1 h-14 rounded-xl flex items-center justify-center gap-2 transition-all border ${selectedFlow === option.value
                                            ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-900/20'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        <option.icon size={option.size} className={selectedFlow === option.value ? 'fill-current' : ''} />
                                        <span className="text-base font-medium">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Symptoms */}
                        <div>
                            <label className="text-xs uppercase tracking-wider text-pink-300/80 font-bold mb-2 block">Symptoms</label>
                            <div className="flex flex-wrap gap-2">
                                {SYMPTOMS.map((sym) => (
                                    <button
                                        key={sym.id}
                                        onClick={() => toggleSymptom(sym.id)}
                                        className={`px-6 py-3 rounded-full text-base border transition-all flex items-center gap-2 ${selectedSymptoms.has(sym.id)
                                            ? 'bg-pink-500/20 border-pink-500 text-pink-200'
                                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                                            }`}
                                    >
                                        <sym.icon size={18} />
                                        {sym.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleLogCycle}
                            disabled={isSaving}
                            className="w-full h-16 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-lg font-medium rounded-2xl shadow-lg shadow-pink-900/20 transition-all hover:scale-[1.02]"
                        >
                            {isSaving ? 'Logging...' : 'Log Cycle'}
                        </button>
                    </div>
                </motion.div>

                {/* 3. Comfort Mode Integration */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8"
                >
                    <Link
                        href={`/comfort-room?prompt=${encodeURIComponent(`I am on my period and feeling ${Array.from(selectedSymptoms).join(', ') || 'unwell'}. Please comfort me.`)}`}
                        className="group block"
                    >
                        <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 backdrop-blur-md rounded-2xl p-1 border border-white/20 hover:border-pink-400/50 transition-colors">
                            <div className="bg-black/20 rounded-xl p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-light text-white mb-1 flex items-center gap-2">
                                        Need a hug?
                                    </h3>
                                    <p className="text-sm text-white/60">
                                        Talk to your companion in the Comfort Room.
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                    <Heart size={24} className="text-pink-400 fill-pink-400/20" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>

            </div>
        </main>
    );
}
