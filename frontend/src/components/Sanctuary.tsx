'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Lock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const messages = [
    "Kya ho gya Labubu My princess?",
    "Mood khrb hai baby ka?",
    "You don't have to carry it all right now. Let it go.",
    "The world can wait. I’m with you, even if I’m not right there."
];

export default function Sanctuary() {
    const { userId } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);

    const [isOpen, setIsOpen] = useState(false);
    const [messageIndex, setMessageIndex] = useState(0);

    // Fetch Profile on Mount
    useEffect(() => {
        if (!userId) {
            setIsCheckingAccess(false);
            return;
        }

        const checkAccess = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/users/me`, {
                    headers: { 'x-clerk-user-id': userId }
                });
                setUserProfile(res.data);
            } catch (error) {
                console.error("Error fetching user profile:", error);
            } finally {
                setIsCheckingAccess(false);
            }
        };

        checkAccess();
    }, [userId]);

    // Cycle messages
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 4000); // Change message every breathing cycle

        return () => clearInterval(interval);
    }, [isOpen]);

    // Haptic feedback on open
    useEffect(() => {
        if (isOpen && typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }, [isOpen]);

    return (
        <>
            {/* Trigger FAB */}
            <motion.button
                className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-purple-600/20 backdrop-blur-md border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.4)] text-purple-200 hover:scale-110 hover:bg-purple-600/30 transition-all duration-300 group"
                onClick={() => setIsOpen(true)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ rotate: 15 }}
            >
                {/* Using Sparkles as a Butterfly proxy since Lucide might not have a dedicated 'Butterfly' icon in all versions, 
            but the user asked for 'Butterfly' icon. If Lucide has 'Butterfly', we'd use it, otherwise a similar shape. 
            Checking lucide-react docs, there isn't a 'Butterfly' icon. 'Bug' or 'Sparkles' is close. 
            Let's use a custom SVG for Butterfly or just Sparkles for now to be safe, or just 'Flower' which fits the theme. 
            Wait, I can use an SVG path for a butterfly if I want to be precise, or just adhere to the request with a proxy.
            Let's try to import Butterfly if it exists, otherwise fallback.
            Actually, let's use a custom SVG for the Butterfly to be exact to the theme.
        */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-butterfly"
                >
                    <path d="M22 12a10 10 0 0 0-10-10A10 10 0 0 0 2 12c0 10 10 10 20 10" opacity="0" />
                    {/* Minimal stylized butterfly shape */}
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="hidden" />
                    {/* Better Butterfly Shape */}
                    <path d="M12 3v18" />
                    <path d="M12 14c4 0 7-2 8-5 0-4-4-5-4-5l-4 5" />
                    <path d="M12 14c-4 0-7-2-8-5 0-4 4-5 4-5l4 5" />
                    <path d="M12 14c4 0 6 3 8 5 .5 2.5-2 4-4 4-4-2-4-5-4-9" />
                    <path d="M12 14c-4 0-6 3-8 5-.5 2.5 2 4 4 4 4-2 4-5 4-9" />
                </svg>
            </motion.button>

            {/* Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-purple-950/90 backdrop-blur-xl text-center px-6"
                    >
                        {isCheckingAccess ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                        ) : userProfile && !userProfile.is_admin && userProfile.couple && userProfile.couple.partner_can_chat === false ? (
                            <div className="flex flex-col items-center justify-center text-center px-4 w-full">
                                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-auto relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-teal-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                        className="relative z-10 flex flex-col items-center"
                                    >
                                        <div className="p-4 bg-slate-800/80 rounded-full text-purple-400 mb-6 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                                            <Lock size={48} strokeWidth={1.5} />
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-primary)]">Sanctuary Locked</h2>
                                        <p className="text-purple-200/70 text-sm leading-relaxed mb-6">
                                            This room has been locked by your partner. You need permission to use the sanctuary.
                                        </p>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="px-8 py-3 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 transition-all duration-300"
                                        >
                                            Return
                                        </button>
                                    </motion.div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Breathing Circle */}
                                <motion.div
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.8, 1, 0.8],
                                        boxShadow: [
                                            "0 0 50px rgba(168,85,247,0.3)",
                                            "0 0 100px rgba(168,85,247,0.6)",
                                            "0 0 50px rgba(168,85,247,0.3)"
                                        ]
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="w-64 h-64 md:w-80 md:h-80 rounded-full flex items-center justify-center bg-purple-500/10 border border-purple-400/20 backdrop-blur-sm mb-12 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-teal-500/10 rounded-full" />

                                    {/* Message */}
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={messageIndex}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.5 }}
                                            className="relative z-10 text-xl md:text-2xl font-light text-purple-100 italic leading-relaxed max-w-[80%]"
                                            style={{ fontFamily: 'Georgia, serif' }}
                                        >
                                            "{messages[messageIndex]}"
                                        </motion.p>
                                    </AnimatePresence>
                                </motion.div>

                                {/* Close Button */}
                                <motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1 }}
                                    onClick={() => setIsOpen(false)}
                                    className="mt-8 px-8 py-3 rounded-full bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-100 transition-all duration-300"
                                >
                                    I am feeling better now
                                </motion.button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
