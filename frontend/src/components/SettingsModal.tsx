'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { X, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useUserProfile } from '../context/UserContext';
import CouplePairing from './CouplePairing';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const { userId } = useAuth();
    const { profile, refreshProfile } = useUserProfile();

    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Edit Form State
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editGender, setEditGender] = useState('');
    const [editPartnerNickname, setEditPartnerNickname] = useState('');
    const [editCoreMemory, setEditCoreMemory] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    // Toast State
    const [showCompanionToast, setShowCompanionToast] = useState(false);
    const [companionMessage, setCompanionMessage] = useState("");

    // Initialize edit state when profile loads or modal opens
    React.useEffect(() => {
        if (profile && isOpen) {
            setEditDisplayName(profile.display_name || '');
            setEditGender(profile.gender || '');
            setEditPartnerNickname(profile.partner_nickname || '');
            setEditCoreMemory(profile.core_memory || '');
        }
    }, [profile, isOpen]);

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

    const handleSaveProfile = async () => {
        if (!userId) return;
        setSavingProfile(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId
                },
                body: JSON.stringify({
                    display_name: editDisplayName.trim(),
                    gender: editGender,
                    partner_nickname: editPartnerNickname.trim() || null,
                    core_memory: editCoreMemory.trim() || null,
                    date_of_birth: profile?.date_of_birth, // preserve existing
                    college_or_profession: profile?.college_or_profession // preserve existing
                })
            });
            if (res.ok) {
                await refreshProfile();
                router.refresh();
                setIsEditingProfile(false);
                
                if (!editPartnerNickname.trim()) {
                    setCompanionMessage("No partner? Don't worry, I will be your faithful companion on this journey! 🦋");
                    setShowCompanionToast(true);
                    setTimeout(() => setShowCompanionToast(false), 5000);
                }
            }
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleDisconnect = async () => {
        if (!userId || !window.confirm("Are you sure you want to disconnect from your partner? This will reset your sanctuary connection.")) return;
        setDisconnecting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/couple/disconnect`, {
                method: 'POST',
                headers: {
                    'x-clerk-user-id': userId
                }
            });
            if (res.ok) {
                await refreshProfile();
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Custom Toast Notification */}
                    <AnimatePresence>
                        {showCompanionToast && (
                            <motion.div
                                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                className="fixed top-6 left-1/2 -translate-x-1/2 z-150 bg-white/10 backdrop-blur-xl border border-pink-500/50 shadow-2xl rounded-2xl p-4 flex items-center gap-3 w-[90%] max-w-sm"
                                style={{
                                    boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)'
                                }}
                            >
                                <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center border border-pink-400/50 shrink-0">
                                    <span className="text-xl">🦋</span>
                                </div>
                                <p className="text-sm font-medium text-white tracking-wide">
                                    {companionMessage}
                                </p>
                                <button 
                                    onClick={() => setShowCompanionToast(false)}
                                    className="absolute top-2 right-2 text-white/50 hover:text-white"
                                >
                                    <X size={14} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Modal Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`relative w-full max-w-md mx-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
                        style={{ borderColor: theme.colors.accent }}
                    >
                        {/* Decorative background glow */}
                        <div
                            className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-white/50 to-transparent"
                            style={{ backgroundColor: theme.colors.primary }}
                        />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-2 right-2 md:top-4 md:right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white z-10"
                        >
                            <X size={20} />
                        </button>

                        <h2
                            className="text-2xl md:text-3xl font-light mb-1 md:mb-2 text-center text-white mt-4 md:mt-0"
                            style={{ fontFamily: theme.font }}
                        >
                            Royal Settings
                        </h2>
                        <p className="text-white/50 text-center mb-6 text-sm md:text-lg">
                            Manage your personal dominion
                        </p>

                        {/* Scrollable Container for Modal Inner Content */}
                        <div className="space-y-4 overflow-y-auto pb-28 -mx-2 pl-2 pr-3 flex-1 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-pink-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                            {/* Restart Journey Button */}
                            <button
                                onClick={handleRestart}
                                className="w-full group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-xl p-4 transition-all duration-300 flex flex-col md:flex-row items-center gap-3 md:gap-4 text-center md:text-left"
                            >
                                <div className={`p-3 md:p-4 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors text-white`}>
                                    <RefreshCw className="w-8 h-8 md:w-12 md:h-12" />
                                </div>
                                <div>
                                    <h3 className={`text-lg md:text-xl font-medium text-white`}>Restart Journey</h3>
                                    <p className="text-xs md:text-sm text-white/50">Re-enter the palace to change your mood</p>
                                </div>
                            </button>

                            {/* Edit Profile Section */}
                            <div className="pt-4 border-t border-white/10 w-full mb-4">
                                <button
                                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
                                >
                                    <span className="font-medium text-sm tracking-wide">Edit Profile Settings</span>
                                    <span className="text-white/50 text-xs">{isEditingProfile ? 'Close' : 'Expand'}</span>
                                </button>

                                <AnimatePresence>
                                    {isEditingProfile && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden space-y-4 pt-4 px-2"
                                        >
                                            <div className="space-y-1">
                                                <label className="text-xs text-white/60 uppercase tracking-widest pl-1">Your Name</label>
                                                <input
                                                    type="text"
                                                    value={editDisplayName}
                                                    onChange={(e) => setEditDisplayName(e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-white/60 uppercase tracking-widest pl-1">Gender</label>
                                                <div className="flex gap-2">
                                                    <label className="flex-1 flex items-center justify-center bg-black/20 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/5 has-checked:bg-purple-900/40 has-checked:border-purple-400/50">
                                                        <input type="radio" name="editGender" value="Female" checked={editGender === 'Female'} onChange={(e) => setEditGender(e.target.value)} className="hidden" />
                                                        <span className="text-sm text-white">Female</span>
                                                    </label>
                                                    <label className="flex-1 flex items-center justify-center bg-black/20 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/5 has-checked:bg-purple-900/40 has-checked:border-purple-400/50">
                                                        <input type="radio" name="editGender" value="Male" checked={editGender === 'Male'} onChange={(e) => setEditGender(e.target.value)} className="hidden" />
                                                        <span className="text-sm text-white">Male</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-white/60 uppercase tracking-widest pl-1">Partner&apos;s Name</label>
                                                <input
                                                    type="text"
                                                    value={editPartnerNickname}
                                                    onChange={(e) => setEditPartnerNickname(e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500/50"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-white/60 uppercase tracking-widest pl-1">Notes for the AI (e.g., I love Rasmalai, my favorite color is purple)</label>
                                                <textarea
                                                    value={editCoreMemory}
                                                    onChange={(e) => setEditCoreMemory(e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 min-h-[80px]"
                                                />
                                            </div>

                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={savingProfile || !editDisplayName}
                                                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {savingProfile && <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />}
                                                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                                            </button>

                                            {profile?.couple && (
                                                <button
                                                    onClick={handleDisconnect}
                                                    disabled={disconnecting}
                                                    className="w-full py-3 mt-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {disconnecting && <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />}
                                                    {disconnecting ? 'Disconnecting...' : 'Disconnect Partner'}
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Couple Pairing Section */}
                            <div className="pt-4 border-t border-white/10 w-full mb-8">
                                <CouplePairing />
                            </div>

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
