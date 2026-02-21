'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { X, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    if (!isOpen) return null;

    const handleRestart = () => {
        // Clear session and local storage for a fresh start
        sessionStorage.removeItem('queen_has_entered');
        // Optional: clear character preference if we want a FULL reset, but usually just session is enough to show Grand Entrance again.
        // If we want to allow picking a new mood/character, we must force the entrance to show.
        // The GrandEntrance checks 'queen_has_entered' in sessionStorage.

        // Force reload to reset all states
        window.location.href = '/';
    };

    const handleQuickSwitch = (id: any) => {
        setTheme(id);
        // Don't close immediately, let them see the change
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`relative w-[95%] max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl overflow-hidden`}
                        style={{ borderColor: theme.colors.accent }}
                    >
                        {/* Decorative background glow */}
                        <div
                            className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                            style={{ backgroundColor: theme.colors.primary }}
                        />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h2
                            className="text-3xl font-light mb-2 text-center text-white"
                            style={{ fontFamily: theme.font }}
                        >
                            Royal Settings
                        </h2>
                        <p className="text-white/50 text-center mb-8 text-lg">
                            Manage your personal dominion
                        </p>

                        {/* Scrollable Container for Modal Inner Content */}
                        <div className="space-y-4 overflow-y-auto max-h-[70vh] pb-32 -mx-2 px-2 scrollbar-none">
                            {/* Restart Journey Button */}
                            <button
                                onClick={handleRestart}
                                className="w-full group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-xl p-4 transition-all duration-300 flex items-center gap-4"
                            >
                                <div className={`p-4 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors text-white`}>
                                    <RefreshCw size={48} />
                                </div>
                                <div className="text-left">
                                    <h3 className={`text-xl font-medium text-white`}>Restart Journey</h3>
                                    <p className="text-sm text-white/50">Re-enter the palace to change your mood</p>
                                </div>
                            </button>

                            {/* Quick Switch Section */}
                            <div className="pt-4 border-t border-white/10">
                                <h3 className="text-sm font-medium text-white/70 mb-4 uppercase tracking-wider text-center">Quick Personality Switch</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'shinobu', label: 'Shinobu', className: 'bg-purple-600' },
                                        { id: 'anya', label: 'Anya', className: 'bg-pink-500' },
                                        { id: 'rys', label: 'Rys', className: 'bg-blue-500' },
                                        { id: 'rimuru', label: 'Rimuru', className: 'bg-cyan-500' },
                                        { id: 'luffy', label: 'Luffy', className: 'bg-red-600' },
                                        { id: 'gojo', label: 'Gojo', className: 'bg-slate-900 border border-blue-400' },
                                        { id: 'zoro', label: 'Zoro', className: 'bg-emerald-900 border border-green-500' },
                                        { id: 'kuromi', label: 'Kuromi', className: 'bg-purple-900 border border-pink-400' },
                                        { id: 'shinchan', label: 'Shinchan', className: 'bg-red-600 border border-yellow-400' },
                                    ].map((char) => (
                                        <button
                                            key={char.id}
                                            onClick={() => handleQuickSwitch(char.id)}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-all ${theme.id === char.id ? 'bg-white/20 ring-1 ring-white/50' : 'opacity-70 hover:opacity-100'}`}
                                        >
                                            <div
                                                className={`w-14 h-14 rounded-full border border-white/20 ${char.className}`}
                                            />
                                            <span className="text-[10px] text-white/80">{char.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
