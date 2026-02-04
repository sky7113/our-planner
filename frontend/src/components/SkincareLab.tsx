'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Sun, Moon, Check, Sparkles } from 'lucide-react';

const morningRitual = [
    'Gentle Cleanser',
    'Vitamin C Serum',
    'Moisturizer',
    'Sunscreen ☀️'
];

const nightRitual = [
    'Double Cleanse',
    'Treatment / Retinol',
    'Heavy Moisturizer'
];

export default function SkincareLab() {
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [showSOS, setShowSOS] = useState(false);

    const toggleCheck = (item: string) => {
        setChecked(prev => ({ ...prev, [item]: !prev[item] }));
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Main Glass Card */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl relative overflow-hidden">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                    <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                        <FlaskConical size={24} />
                    </div>
                    <h2 className="text-2xl font-light text-slate-100 tracking-wide">
                        The Healing Lab
                    </h2>
                    <div className="ml-auto">
                        <button
                            onClick={() => setShowSOS(true)}
                            className="px-4 py-1.5 rounded-full text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all duration-300 flex items-center gap-2"
                        >
                            <Sparkles size={12} />
                            My skin is acting up...
                        </button>
                    </div>
                </div>

                {/* 2 Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Morning Column */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-amber-200/80">
                            <Sun size={18} />
                            <h3 className="uppercase tracking-widest text-xs font-bold">Morning Ritual</h3>
                        </div>
                        <div className="space-y-3">
                            {morningRitual.map((item) => (
                                <RitualItem
                                    key={item}
                                    label={item}
                                    isChecked={!!checked[item]}
                                    onToggle={() => toggleCheck(item)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Night Column */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-indigo-300/80">
                            <Moon size={18} />
                            <h3 className="uppercase tracking-widest text-xs font-bold">Night Ritual</h3>
                        </div>
                        <div className="space-y-3">
                            {nightRitual.map((item) => (
                                <RitualItem
                                    key={item}
                                    label={item}
                                    isChecked={!!checked[item]}
                                    onToggle={() => toggleCheck(item)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SOS Modal */}
            <AnimatePresence>
                {showSOS && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSOS(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-slate-700/50 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl"
                        >
                            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-300 flex items-center justify-center mx-auto mb-6">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-xl font-medium text-slate-100 mb-2">It's okay, love.</h3>
                            <p className="text-slate-400 leading-relaxed mb-8">
                                Hydrate, my love. Skip the heavy actives today. Just gentle cleansing and sleep. <br />
                                <span className="text-rose-300/80 block mt-2">You are glowing regardless.</span>
                            </p>
                            <button
                                onClick={() => setShowSOS(false)}
                                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            >
                                I'll be gentle with myself
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RitualItem({ label, isChecked, onToggle }: { label: string, isChecked: boolean, onToggle: () => void }) {
    return (
        <div
            onClick={onToggle}
            className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${isChecked ? 'bg-green-500/10' : 'hover:bg-white/5'}`}
        >
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors duration-300 ${isChecked ? 'bg-green-500 border-green-500' : 'border-slate-600 group-hover:border-slate-500'}`}>
                <motion.div
                    initial={false}
                    animate={{ scale: isChecked ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                    <Check size={14} className="text-white" strokeWidth={3} />
                </motion.div>
            </div>
            <span className={`text-sm transition-colors duration-300 ${isChecked ? 'text-green-200 line-through decoration-green-500/50' : 'text-slate-300'}`}>
                {label}
            </span>
        </div>
    );
}
