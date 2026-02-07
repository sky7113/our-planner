'use client';
export const dynamic = 'force-dynamic';


import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sun, Moon, Check, Upload, Sparkles, Camera, Save,
    Calendar as CalendarIcon, ArrowLeft, Loader2, Pencil, Trash2, Plus
} from 'lucide-react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface SkinLog {
    date: string;
    time: string;
    products: string[];
    images?: string[];
    analysis?: string;
}

interface RoutineItem {
    id: number;
    name: string;
    category: string;
}

export default function SkincarePage() {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<'morning' | 'night'>('morning');
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

    // Dynamic Routine State
    const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [newItemName, setNewItemName] = useState('');

    // AI Analysis State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [savedImageUrls, setSavedImageUrls] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);

    // Calendar & History State
    const [loggedDates, setLoggedDates] = useState<string[]>([]);
    const [selectedLog, setSelectedLog] = useState<SkinLog | null>(null);

    // Proactive State
    const [missedDays, setMissedDays] = useState<number>(0);
    const [photoGap, setPhotoGap] = useState<number>(0);
    const [showCatchUpModal, setShowCatchUpModal] = useState(false);
    const [catchUpDate, setCatchUpDate] = useState<string | null>(null);

    // Fetch Routine
    const fetchRoutine = useCallback(async () => {
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/routine');
            if (res.ok) {
                const data = await res.json();
                setRoutineItems(data);
            }
        } catch (error) {
            console.error("Failed to fetch routine", error);
        }
    }, []);

    // Fetch history on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // 1. Fetch History Dates
                const resHist = await fetch('https://our-backend-api.onrender.com/api/skin/history');
                if (resHist.ok) {
                    const dates = await resHist.json();
                    setLoggedDates(dates);
                }

                // 2. Fetch Status (Missed/Gap)
                const resStatus = await fetch('https://our-backend-api.onrender.com/api/skin/status');
                if (resStatus.ok) {
                    const status = await resStatus.json();
                    setMissedDays(status.missed_days);
                    setPhotoGap(status.photo_gap);

                    if (status.missed_days > 0 && status.last_log_date) {
                        const lastDate = new Date(status.last_log_date);
                        lastDate.setDate(lastDate.getDate() + 1);
                        const nextDayStr = lastDate.toISOString().split('T')[0];
                        setCatchUpDate(nextDayStr);
                        setShowCatchUpModal(true);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch data", e);
            }
        };
        fetchHistory();
        fetchRoutine();
    }, [fetchRoutine]);

    const fetchLog = async (dateStr: string) => {
        try {
            const res = await fetch(`https://our-backend-api.onrender.com/api/skin/log?date=${dateStr}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success') {
                    setSelectedLog(data);
                }
            }
        } catch (e) {
            console.error("Failed to fetch log", e);
        }
    };

    // Routine Management
    const handleAddProduct = async () => {
        if (!newItemName.trim()) return;
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/routine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newItemName,
                    category: activeTab
                })
            });
            if (res.ok) {
                setNewItemName('');
                fetchRoutine();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm('Remove this product?')) return;
        try {
            const res = await fetch(`https://our-backend-api.onrender.com/api/routine/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchRoutine();
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (!theme) return null;

    const currentRoutine = routineItems.filter(item => item.category === activeTab);

    const handleToggle = (item: string) => {
        const newSet = new Set(checkedItems);
        if (newSet.has(item)) {
            newSet.delete(item);
        } else {
            newSet.add(item);
        }
        setCheckedItems(newSet);
    };

    const handleSelectAll = () => {
        const allSelected = currentRoutine.every(item => checkedItems.has(item.name));
        const newSet = new Set(checkedItems);

        if (allSelected) {
            currentRoutine.forEach(item => newSet.delete(item.name));
        } else {
            currentRoutine.forEach(item => newSet.add(item.name));
        }
        setCheckedItems(newSet);
    };

    const handleSaveLog = async (dateOverride?: string) => {
        const products = Array.from(checkedItems);
        const dateStr = dateOverride || new Date().toISOString().split('T')[0];

        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/skin/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateStr,
                    time: activeTab,
                    products: products,
                    analysis: analysisResult,
                    images: savedImageUrls
                })
            });

            if (res.ok) {
                setLoggedDates(prev => [...prev, dateStr]);
                alert('Routine logged! You are glowing! ✨');
            }
        } catch (e) {
            console.error("Log error", e);
            alert("Failed to save log. Is the servant (backend) awake?");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setSelectedFiles(files);
            const urls = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(urls);
            setAnalysisResult(null);
        }
    };

    const handleAnalyze = async () => {
        if (selectedFiles.length === 0) return;

        setIsAnalyzing(true);
        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });

        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/skin/analyze', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.status === 'success') {
                setAnalysisResult(data.analysis);
                if (data.image_urls) setSavedImageUrls(data.image_urls);
            } else {
                setAnalysisResult("I couldn't analyze the image properly. Perhaps the lighting?");
            }
        } catch (e) {
            console.error("Analysis error", e);
            setAnalysisResult("Connection error with the Royal Mirror.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const renderCalendar = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10"></div>);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isLogged = loggedDates.includes(dayStr) || (d === date.getDate() && loggedDates.includes(dayStr));

            days.push(
                <div
                    key={d}
                    onClick={() => isLogged && fetchLog(dayStr)}
                    className={`h-10 w-10 flex items-center justify-center rounded-full text-xs relative ${d === date.getDate() ? 'border border-white/50' : ''} ${isLogged ? 'cursor-pointer hover:bg-white/10' : ''}`}
                >
                    {d}
                    {isLogged && (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1"
                        >
                            <Sparkles size={12} className="text-yellow-400" fill="currentColor" />
                        </motion.div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <main className={`min-h-screen ${theme.colors.backgroundClass} text-white p-6 pb-40 transition-colors duration-700 relative overflow-hidden`}>
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div
                    className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
                    style={{ backgroundColor: theme.colors.primary }}
                />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity text-white">
                        <ArrowLeft size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <h1 className="text-4xl font-light tracking-wide text-white">Royal Glow</h1>
                    <div className="flex items-center gap-2 opacity-70 text-white">
                        <Sparkles size={20} />
                        <span className="text-sm">Day 45</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT: Routine Tracker (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="backdrop-blur-xl bg-slate-900/40 border border-white/20 rounded-3xl p-6 shadow-xl">
                            {/* Tabs */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex-1 flex p-1 bg-black/40 rounded-xl">
                                    <button
                                        onClick={() => setActiveTab('morning')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${activeTab === 'morning' ? 'bg-white text-slate-900 shadow-md' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        <Sun size={18} />
                                        <span className="font-medium">Morning</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('night')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${activeTab === 'night' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        <Moon size={18} />
                                        <span className="font-medium">Night</span>
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`p-3 rounded-xl border transition-all ${isEditing ? 'bg-purple-500 text-white border-purple-500' : 'bg-black/40 border-white/10 text-white/60 hover:text-white'}`}
                                >
                                    <Pencil size={20} />
                                </button>
                            </div>

                            {/* Checklist */}
                            <div className="space-y-3 mb-8">
                                {currentRoutine.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex gap-2"
                                    >
                                        <motion.button
                                            onClick={() => handleToggle(item.name)}
                                            whileTap={{ scale: 0.98 }}
                                            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border transition-all ${checkedItems.has(item.name)
                                                ? `bg-${theme.colors.accent}/30 border-${theme.colors.accent} border-opacity-60`
                                                : 'bg-white/10 border-white/20 hover:bg-white/15'
                                                }`}
                                            style={{
                                                backgroundColor: checkedItems.has(item.name) ? `${theme.colors.accent}30` : undefined,
                                                borderColor: checkedItems.has(item.name) ? theme.colors.accent : undefined
                                            }}
                                        >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checkedItems.has(item.name) ? 'bg-green-500 border-green-500' : 'border-white/30'
                                                }`}>
                                                {checkedItems.has(item.name) && <Check size={14} className="text-white" />}
                                            </div>
                                            <span className={`text-lg font-light text-gray-100 ${checkedItems.has(item.name) ? 'opacity-100' : 'opacity-80'}`}>
                                                {item.name}
                                            </span>
                                        </motion.button>

                                        <AnimatePresence>
                                            {isEditing && (
                                                <motion.button
                                                    initial={{ opacity: 0, width: 0 }}
                                                    animate={{ opacity: 1, width: 'auto' }}
                                                    exit={{ opacity: 0, width: 0 }}
                                                    onClick={() => handleDeleteProduct(item.id)}
                                                    className="p-4 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-colors border border-red-500/30"
                                                >
                                                    <Trash2 size={24} />
                                                </motion.button>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))}

                                {isEditing && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-2 mt-4"
                                    >
                                        <input
                                            type="text"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            placeholder="Add new product..."
                                            className="flex-1 h-14 bg-black/20 border border-white/10 rounded-xl px-4 text-white text-lg placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
                                        />
                                        <button
                                            onClick={handleAddProduct}
                                            className="w-14 h-14 bg-purple-600 rounded-xl text-white hover:bg-purple-500 transition-colors flex items-center justify-center shadow-lg"
                                        >
                                            <Plus size={28} />
                                        </button>
                                    </motion.div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4">
                                <button
                                    onClick={handleSelectAll}
                                    className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 transition-colors text-sm text-white"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => handleSaveLog(showCatchUpModal ? undefined : catchUpDate ?? undefined)}
                                    className="flex-1 h-14 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-lg font-medium rounded-xl shadow-lg transition-all hover:scale-[1.02]"
                                >
                                    <Save size={20} />
                                    {catchUpDate && !showCatchUpModal ? `Save for ${catchUpDate}` : 'Save Routine'}
                                </button>
                            </div>
                        </div>

                        {/* Mini Calendar */}
                        <div className="backdrop-blur-md bg-slate-900/30 border border-white/10 rounded-3xl p-6 text-white">
                            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                <CalendarIcon size={18} className="opacity-70" />
                                <span>Consistency Tracker</span>
                            </h3>
                            <div className="grid grid-cols-7 gap-1 text-center">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                    <div key={i} className="text-xs opacity-50 mb-2 text-white">{d}</div>
                                ))}
                                {renderCalendar()}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Royal Mirror (AI Analysis) (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="backdrop-blur-xl bg-slate-900/40 border border-white/20 rounded-3xl p-6 shadow-xl h-full flex flex-col text-white">
                            <h2 className="text-2xl font-light mb-1 text-white">The Royal Mirror</h2>
                            <p className="text-sm opacity-60 mb-6 text-gray-300">Let the AI Dermatologist analyze your skin.</p>

                            {/* Upload Area */}
                            <div className="relative group mb-6">
                                {photoGap > 7 && (
                                    <div className="absolute -top-3 -right-3 z-30 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce shadow-lg">
                                        Time for a check! 📸
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                />
                                <div className={`min-h-[300px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative ${previewUrls.length > 0 ? 'border-transparent bg-black/20' : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                                    }`}>
                                    {previewUrls.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2 p-2 w-full h-full">
                                            {previewUrls.map((url, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden">
                                                    <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                                <div className="bg-black/60 px-4 py-2 rounded-full flex items-center gap-2 text-white text-sm">
                                                    <Camera size={16} />
                                                    <span>Change Photos</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                                                <Upload size={32} />
                                            </div>
                                            <p className="font-medium">Upload Selfies</p>
                                            <p className="text-xs mt-2 text-gray-300">Select multiple angles</p>
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Action Button */}
                            <button
                                onClick={handleAnalyze}
                                disabled={selectedFiles.length === 0 || isAnalyzing}
                                className={`w-full h-16 rounded-xl flex items-center justify-center gap-2 font-medium text-lg transition-all ${selectedFiles.length === 0
                                    ? 'bg-white/5 text-white/40 cursor-not-allowed'
                                    : 'bg-white text-slate-900 shadow-lg hover:scale-[1.02]'
                                    }`}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 size={24} className="animate-spin" />
                                        <span>Analyzing Skin...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={24} className={selectedFiles.length > 0 ? 'text-purple-500' : ''} />
                                        <span>Analyze Skin</span>
                                    </>
                                )}
                            </button>

                            {/* Result */}
                            <AnimatePresence>
                                {analysisResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 p-5 rounded-2xl bg-white/90 text-slate-900 border border-white/40 shadow-lg"
                                    >
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-2">Analysis Result</h3>
                                        <p className="text-sm leading-relaxed font-medium">
                                            "{analysisResult}"
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                </div>
            </div>

            {/* Diary Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedLog(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-purple-500/50 rounded-3xl p-8 max-w-lg w-full shadow-[0_0_50px_-12px_rgba(168,85,247,0.5)] relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                            <button
                                onClick={() => setSelectedLog(null)}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                            >
                                <X size={20} className="text-white/70" />
                            </button>

                            <h2 className="text-2xl font-light text-white mb-6 flex items-center gap-2">
                                <Sparkles size={24} className="text-purple-400" />
                                <span>Skin Diary</span>
                            </h2>

                            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                {/* Date */}
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-purple-400 font-semibold">Date</label>
                                    <p className="text-white text-lg">{selectedLog.date}</p>
                                </div>

                                {/* Photo */}
                                {selectedLog.images && selectedLog.images.length > 0 && (
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-2 block">Daily Selfies</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {selectedLog.images.map((imgUrl, idx) => (
                                                <div key={idx} className="rounded-xl overflow-hidden border border-white/10">
                                                    <img
                                                        src={`https://our-backend-api.onrender.com${imgUrl}`}
                                                        alt={`Skin Log ${idx}`}
                                                        className="w-full object-cover h-32"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Routine */}
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-2 block">Routine ({selectedLog.time})</label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedLog.products.map((prod, i) => (
                                            <span key={i} className="px-3 py-1 rounded-full bg-white/10 text-sm text-gray-200 border border-white/5">
                                                {prod}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Analysis */}
                                {selectedLog.analysis && (
                                    <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30">
                                        <label className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-2 block flex items-center gap-2">
                                            <Sparkles size={12} />
                                            AI Analysis
                                        </label>
                                        <p className="text-gray-200 leading-relaxed italic">
                                            &quot;{selectedLog.analysis}&quot;
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Catch-up Modal */}
            <AnimatePresence>
                {showCatchUpModal && catchUpDate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
                        >
                            <h2 className="text-2xl font-light text-white mb-4">Missed Routine?</h2>
                            <p className="text-gray-300 mb-6">
                                I noticed you didn't log your skincare on <span className="text-white font-bold">{catchUpDate}</span>.
                                Did you do it?
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        alert(`Okay! Please check off what you did on ${catchUpDate} and click Save.`);
                                        setShowCatchUpModal(false);
                                    }}
                                    className="w-full py-3 bg-white text-slate-900 rounded-xl font-medium hover:scale-[1.02] transition-transform"
                                >
                                    Yes, I did it!
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCatchUpModal(false);
                                    }}
                                    className="w-full py-3 bg-white/5 text-white/60 rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    No, I skipped it.
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
