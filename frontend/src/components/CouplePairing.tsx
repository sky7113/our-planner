'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Copy, Check, Link2, Shield, Image as ImageIcon, Book, MessageCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserProfile } from '../context/UserContext';

interface CoupleData {
    id: number;
    pairing_code: string;
    partner_can_chat: boolean;
    partner_can_gallery: boolean;
    partner_can_journal: boolean;
}

interface UserProfile {
    id: number;
    clerk_id: string;
    is_admin: boolean;
    display_name: string | null;
    partner_nickname: string | null;
    gender: string | null;
    couple: CoupleData | null;
}

export default function CouplePairing({ localGender }: { localGender?: string }) {
    const { userId, isLoaded } = useAuth();
    const { profile, setProfile, refreshProfile, isLoading } = useUserProfile();
    const [error, setError] = useState<string | null>(null);

    // Joiner state
    const [joinCode, setJoinCode] = useState('');
    const [joinSuccess, setJoinSuccess] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);

    // Generate state
    const [generateLoading, setGenerateLoading] = useState(false);

    // Admin state
    const [copied, setCopied] = useState(false);
    const [updatingPermissions, setUpdatingPermissions] = useState(false);

    // Mock UI states
    const [mockKey, setMockKey] = useState<string | null>(null);
    const [linkInput, setLinkInput] = useState('');
    const [showLocalToast, setShowLocalToast] = useState(false);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const handleCopyCode = async () => {
        if (profile?.couple?.pairing_code) {
            await navigator.clipboard.writeText(profile.couple.pairing_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim() || !userId) return;

        try {
            setJoinLoading(true);
            setError(null);
            const res = await fetch(`${API_BASE_URL}/api/users/pair`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId
                },
                body: JSON.stringify({ pairing_code: joinCode.trim() })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Failed to link accounts');
            }

            setJoinSuccess(true);
            await refreshProfile(); // Refresh to get updated couple data
        } catch (err: any) {
            setError(err.message);
        } finally {
            setJoinLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!userId) return;

        try {
            setGenerateLoading(true);
            setError(null);
            const res = await fetch(`${API_BASE_URL}/api/couple/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId
                }
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Failed to generate code');
            }

            await refreshProfile(); // Refresh to get updated couple data (should be admin now)
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGenerateLoading(false);
        }
    };

    const togglePermission = async (field: keyof CoupleData) => {
        if (!profile?.couple || !profile.is_admin || !userId) return;

        // Optimistic update
        const updatedCouple = { ...profile.couple, [field]: !profile.couple[field] };
        setProfile({ ...profile, couple: updatedCouple });

        try {
            setUpdatingPermissions(true);
            const res = await fetch(`${API_BASE_URL}/api/couple/permissions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId
                },
                body: JSON.stringify({
                    partner_can_chat: updatedCouple.partner_can_chat,
                    partner_can_gallery: updatedCouple.partner_can_gallery,
                    partner_can_journal: updatedCouple.partner_can_journal
                })
            });

            if (!res.ok) {
                throw new Error('Failed to update permissions');
            }
        } catch (err) {
            console.error('Permission update failed:', err);
            // Revert optimistic update
            const revertedCouple = { ...profile.couple, [field]: profile.couple[field] };
            setProfile({ ...profile, couple: revertedCouple });
        } finally {
            setUpdatingPermissions(false);
        }
    };

    if (!isLoaded || isLoading) {
        return (
            <div className="w-full max-w-md mx-auto p-4 md:p-8 bg-black/40 backdrop-blur-2xl border border-purple-500/10 rounded-2xl md:rounded-4xl shadow-[0_0_40px_rgba(168,85,247,0.05)] text-white">
                <div className="mb-6 md:mb-8 text-center animate-pulse">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-2xl mx-auto mb-3 md:mb-4" />
                    <div className="h-6 md:h-8 w-3/4 bg-white/10 rounded-lg mx-auto mb-2" />
                    <div className="h-4 md:h-5 w-1/2 bg-white/5 rounded-md mx-auto" />
                </div>
                <div className="space-y-4 animate-pulse">
                    <div className="h-24 w-full bg-white/5 rounded-3xl" />
                    <div className="h-16 w-full bg-white/5 rounded-2xl" />
                    <div className="h-16 w-full bg-white/5 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="p-6 bg-black/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl text-center">
                <p className="text-white/70">Please sign in to manage pairing.</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="p-6 bg-black/40 backdrop-blur-xl border border-red-500/20 rounded-3xl text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <p className="text-red-200">Failed to load profile data.</p>
            </div>
        );
    }

    const isAdmin = profile.is_admin;
    const hasPartner = profile.partner_nickname;
    const currentGender = localGender || profile.gender;
    const isFemale = currentGender === 'Female';
    const isMale = currentGender === 'Male';
    const isConnected = profile.couple !== null;

    return (
        <div className="w-full max-w-md mx-auto p-4 md:p-8 bg-black/40 backdrop-blur-2xl border border-purple-500/20 rounded-2xl md:rounded-4xl shadow-[0_0_40px_rgba(168,85,247,0.1)] text-white">
            <div className="mb-6 md:mb-8 text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl mx-auto flex items-center justify-center mb-3 md:mb-4 shadow-inner">
                    <Shield className="w-6 h-6 md:w-8 md:h-8 text-purple-300" />
                </div>
                <h2 className="text-xl md:text-2xl tracking-wide font-light">
                    {hasPartner ? "Partner Connection" : "Personal Sanctuary"}
                </h2>
                <p className="text-xs md:text-sm text-purple-200/60 mt-1">
                    {hasPartner ? "Manage your shared digital sanctuary" : "Your private space is secure"}
                </p>
            </div>

            {isConnected && (
                <div className="mb-6 mx-auto bg-pink-500/20 border border-pink-400/50 rounded-2xl p-4 text-center shadow-[0_0_20px_rgba(236,72,153,0.2)]">
                    <p className="text-pink-100 font-medium">Status: Connected to {profile.partner_nickname || 'Partner'} 💖</p>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-200 flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Success State for Joiner (Male) */}
            {!isAdmin && isConnected ? (
                <div className="text-center p-6 bg-linear-to-br from-purple-900/30 to-indigo-900/30 rounded-3xl border border-purple-500/30">
                    <div className="w-16 h-16 bg-linear-to-br from-green-400 to-emerald-600 rounded-full mx-auto flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                        <Check className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-medium text-purple-100 mb-2">Sanctuary Joined</h3>
                    <p className="text-sm text-purple-200/70">
                        You have entered her sanctuary.
                    </p>
                </div>
            ) : isAdmin && isConnected ? (
                /* Admin View (Female) */
                <div className="space-y-8">
                    {/* Code Display */}
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />

                        <p className="text-xs uppercase tracking-widest text-purple-300/60 mb-3 font-medium">Your Pairing Code</p>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <span className="text-3xl md:text-4xl font-mono tracking-[0.2em] text-white break-all text-center sm:text-left">
                                {profile.couple?.pairing_code}
                            </span>
                            <button
                                onClick={handleCopyCode}
                                className="w-full sm:w-auto p-3 flex justify-center bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 rounded-xl transition-all border border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-xs md:text-sm text-white/40 mt-4 leading-relaxed text-center sm:text-left">
                            Share this elite code with your partner to grant them access to your world.
                        </p>

                        <button
                            onClick={() => {
                                if (window.confirm("Are you sure? This will disconnect your current partner.")) {
                                    handleGenerate();
                                }
                            }}
                            disabled={generateLoading}
                            className="mt-6 w-full py-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-medium transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            {generateLoading && <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />}
                            Regenerate Code
                        </button>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-4">
                        <p className="text-sm font-medium uppercase tracking-widest text-purple-300/60 pl-2">Partner Permissions</p>

                        <div className="bg-black/20 rounded-3xl border border-white/5 p-2 space-y-1">
                            {/* Chat Toggle */}
                            <div className="flex items-center justify-between p-3 md:p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="bg-purple-900/50 p-2 md:p-2.5 rounded-xl border border-purple-500/20">
                                        <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-purple-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-purple-100 font-medium text-xs md:text-sm">Chat Access</h4>
                                        <p className="text-[10px] md:text-xs text-purple-200/50 mt-0.5">Allow interacting with AI</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={profile.couple?.partner_can_chat || false}
                                        onChange={() => togglePermission('partner_can_chat')}
                                        disabled={updatingPermissions}
                                    />
                                    <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500 border border-white/10"></div>
                                </label>
                            </div>

                            {/* Gallery Toggle */}
                            <div className="flex items-center justify-between p-3 md:p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="bg-pink-900/50 p-2 md:p-2.5 rounded-xl border border-pink-500/20">
                                        <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-pink-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-purple-100 font-medium text-xs md:text-sm">Gallery Access</h4>
                                        <p className="text-[10px] md:text-xs text-purple-200/50 mt-0.5">View shared memories</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={profile.couple?.partner_can_gallery || false}
                                        onChange={() => togglePermission('partner_can_gallery')}
                                        disabled={updatingPermissions}
                                    />
                                    <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 border border-white/10"></div>
                                </label>
                            </div>

                            {/* Journal Toggle */}
                            <div className="flex items-center justify-between p-3 md:p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="bg-indigo-900/50 p-2 md:p-2.5 rounded-xl border border-indigo-500/20">
                                        <Book className="w-4 h-4 md:w-5 md:h-5 text-indigo-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-purple-100 font-medium text-xs md:text-sm">Journal Access</h4>
                                        <p className="text-[10px] md:text-xs text-purple-200/50 mt-0.5">Read private entries</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={profile.couple?.partner_can_journal || false}
                                        onChange={() => togglePermission('partner_can_journal')}
                                        disabled={updatingPermissions}
                                    />
                                    <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 border border-white/10"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                /* Unpaired View */
                <div className="space-y-8 relative">
                    <AnimatePresence>
                        {showLocalToast && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)] rounded-2xl p-3 flex items-center gap-2 w-max z-50 text-sm font-medium text-white"
                            >
                                Mansions successfully linked! 🦋
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isFemale && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center space-y-6 shadow-inner"
                        >
                            <div>
                                <h3 className="text-xl font-light text-white mb-2 tracking-wide">Generate Royal Key</h3>
                                <p className="text-sm text-purple-200/60 leading-relaxed">Create a unique key to invite your partner into your personal sanctuary.</p>
                            </div>
                            
                            {!mockKey ? (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setMockKey("Mansion-" + Math.random().toString(36).substring(2, 6).toUpperCase())}
                                    className="w-full relative group overflow-hidden rounded-2xl bg-linear-to-r from-pink-600/80 to-purple-600/80 hover:from-pink-500 hover:to-purple-500 p-4 transition-all text-white font-medium flex items-center justify-center gap-3 border border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                                >
                                    <Shield className="w-5 h-5" />
                                    <span>Generate Royal Key</span>
                                </motion.button>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-black/30 border border-pink-500/30 rounded-2xl p-4 flex items-center justify-between gap-4"
                                >
                                    <span className="text-2xl font-mono tracking-widest text-pink-300 font-bold">{mockKey}</span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(mockKey);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="p-3 bg-pink-500/20 hover:bg-pink-500/40 text-pink-200 rounded-xl transition-all border border-pink-500/30 shrink-0"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {isMale && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center space-y-6 shadow-inner"
                        >
                            <div>
                                <h3 className="text-xl font-light text-white mb-2 tracking-wide">Join Her Sanctuary</h3>
                                <p className="text-sm text-purple-200/60 leading-relaxed">Enter the royal key to connect to her mansion.</p>
                            </div>
                            
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={linkInput}
                                    onChange={(e) => setLinkInput(e.target.value.toUpperCase())}
                                    placeholder="Enter Connection Key..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-4 px-6 text-center text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-mono tracking-wider"
                                />
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        if(linkInput.trim()) {
                                            setShowLocalToast(true);
                                            setTimeout(() => setShowLocalToast(false), 3000);
                                            setLinkInput('');
                                        }
                                    }}
                                    className="w-full bg-linear-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-500 hover:to-purple-500 border border-indigo-500/30 px-6 py-4 rounded-2xl text-white font-medium transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center justify-center gap-2"
                                >
                                    <Link2 className="w-5 h-5" />
                                    <span>Link Mansion</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {!isFemale && !isMale && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-white/50 text-sm bg-white/5 p-4 rounded-2xl border border-white/5"
                        >
                            Please set your gender in Edit Profile to unlock the Pairing Bridge.
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
}
