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
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');
    const [collegeOrProfession, setCollegeOrProfession] = useState('');

    const [hasPartner, setHasPartner] = useState(false);
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
                body: JSON.stringify({
                    display_name: displayName.trim(),
                    partner_nickname: hasPartner ? partnerNickname.trim() : null,
                    date_of_birth: dateOfBirth.trim() || null,
                    gender: gender || null,
                    college_or_profession: collegeOrProfession.trim() || null
                })
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase tracking-widest text-white/60 font-medium pl-1 flex items-center gap-2">
                                            <Calendar size={14} /> Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={dateOfBirth}
                                            onChange={(e) => setDateOfBirth(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-purple-400/50 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 outline-none transition-all focus:bg-white/10 font-outfit"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase tracking-widest text-white/60 font-medium pl-1 flex items-center gap-2">
                                            <User size={14} /> Gender
                                        </label>
                                        <div className="flex gap-4">
                                            <label className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 cursor-pointer hover:bg-white/10 transition-colors has-[:checked]:bg-purple-900/40 has-[:checked]:border-purple-400/50">
                                                <input
                                                    type="radio"
                                                    name="gender"
                                                    value="Female"
                                                    checked={gender === 'Female'}
                                                    onChange={(e) => setGender(e.target.value)}
                                                    className="hidden"
                                                />
                                                <span className="text-white font-outfit">Female</span>
                                            </label>
                                            <label className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 cursor-pointer hover:bg-white/10 transition-colors has-[:checked]:bg-purple-900/40 has-[:checked]:border-purple-400/50">
                                                <input
                                                    type="radio"
                                                    name="gender"
                                                    value="Male"
                                                    checked={gender === 'Male'}
                                                    onChange={(e) => setGender(e.target.value)}
                                                    className="hidden"
                                                />
                                                <span className="text-white font-outfit">Male</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-white/60 font-medium pl-1 flex items-center gap-2">
                                        <Briefcase size={14} /> College or Profession
                                    </label>
                                    <input
                                        type="text"
                                        value={collegeOrProfession}
                                        onChange={(e) => setCollegeOrProfession(e.target.value)}
                                        placeholder="e.g. Software Engineer, UCLA"
                                        className="w-full bg-white/5 border border-white/10 focus:border-purple-400/50 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 outline-none transition-all focus:bg-white/10 font-outfit"
                                    />
                                </div>

                                {/* Step 2: Toggle */}
                                <div className="pt-4 border-t border-white/10 mt-6">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${hasPartner ? 'bg-pink-500 border-pink-500' : 'border-white/20 group-hover:border-white/40'}`}>
                                            {hasPartner && <Heart size={14} className="text-white fill-white" />}
                                        </div>
                                        <span className="text-sm text-white/80 group-hover:text-white transition-colors">
                                            Are you sharing this sanctuary with a partner?
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={hasPartner}
                                            onChange={(e) => setHasPartner(e.target.checked)}
                                        />
                                    </label>
                                </div>

                                <AnimatePresence>
                                    {hasPartner && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            className="overflow-hidden space-y-2"
                                        >
                                            <label className="text-xs uppercase tracking-widest text-white/60 font-medium pl-1 flex items-center gap-2">
                                                <Heart size={14} className="text-pink-400/70" /> What is your partner&apos;s name?
                                            </label>
                                            <input
                                                type="text"
                                                value={partnerNickname}
                                                onChange={(e) => setPartnerNickname(e.target.value)}
                                                placeholder="e.g. Amber"
                                                className="w-full bg-white/5 border border-white/10 focus:border-pink-400/50 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 outline-none transition-all focus:bg-white/10 font-outfit text-lg"
                                                required={hasPartner}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    type="submit"
                                    disabled={submitting || !displayName || (hasPartner && !partnerNickname)}
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
