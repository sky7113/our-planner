'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '../context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Heart, Calendar, MapPin, Briefcase, ChevronRight } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function OnboardingForm() {
    const { profile, refreshProfile, isLoading } = useUserProfile();
    const { userId } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const [displayName, setDisplayName] = useState('');
    const [partnerNickname, setPartnerNickname] = useState('');

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Show modal if profile is loaded, user is logged in, and display_name is missing
        if (!isLoading && profile && (!profile.display_name || !profile.display_name.trim()) && userId) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [profile, isLoading, userId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim() || !partnerNickname.trim() || !userId) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId
                },
                display_name: displayName.trim(),
                partner_nickname: partnerNickname.trim()
            });

            if (res.ok) {
                await refreshProfile();
                setIsOpen(false);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-md bg-white/10 dark:bg-black/40 backdrop-blur-3xl border border-white/20 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(255,255,255,0.1)] relative overflow-hidden"
                    >
                        {/* Decorative background glow */}
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none" />

                        <div className="relative z-10">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-light text-white mb-2 tracking-wide font-outfit">Welcome!</h2>
                                <p className="text-white/60 text-sm">Let&apos;s personalize your sanctuary.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Display Name Input */}
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-white/60 font-medium pl-1 flex items-center gap-2">
                                        <User size={14} /> What should we call you?
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="e.g. Raksha, Queen"
                                        className="w-full bg-white/5 border border-white/10 focus:border-purple-400/50 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 outline-none transition-all focus:bg-white/10 font-outfit text-lg"
                                        required
                                    />
                                </div>

                                {/* Step 2: Partner Name */}
                                <div className="space-y-2 pt-4 border-t border-white/10 mt-6">
                                    <label className="text-xs uppercase tracking-widest text-white/60 font-medium pl-1 flex items-center gap-2">
                                        <Heart size={14} className="text-pink-400/70" /> What is your partner&apos;s name?
                                    </label>
                                    <input
                                        type="text"
                                        value={partnerNickname}
                                        onChange={(e) => setPartnerNickname(e.target.value)}
                                        placeholder="e.g. Amber"
                                        className="w-full bg-white/5 border border-white/10 focus:border-pink-400/50 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 outline-none transition-all focus:bg-white/10 font-outfit text-lg"
                                        required
                                    />
                                </div>



                                <button
                                    type="submit"
                                    disabled={submitting || !displayName || !partnerNickname}
                                    className="w-full mt-8 bg-gradient-to-r from-purple-500/80 to-indigo-500/80 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-2xl transition-all shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Enter Sanctuary <ChevronRight size={18} /></>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
