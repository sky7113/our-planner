'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle } from 'lucide-react';

export default function Companion() {
    const { theme } = useTheme();
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Route visibility logic
    useEffect(() => {
        // Show on Dashboard (root) and all main pages
        const validPaths = ['/', '/comfort-room', '/budget', '/career', '/memories', '/skincare', '/sanctuary'];

        if (validPaths.includes(pathname)) {
            // If on comfort room, maybe hide it because the BIG companion is there?
            if (pathname === '/comfort-room') {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
        } else {
            setIsVisible(true); // Default to visible on known pages
        }
    }, [pathname]);

    // Safe guard: if theme is undefined for some reason, don't render
    if (!theme || !theme.id) return null;

    const avatarSrc = `/characters/${theme.id}.png`;

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-4 pointer-events-none">

            {/* Greeting Bubble (Hover Only) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="bg-white/90 backdrop-blur-md p-5 rounded-2xl rounded-br-sm shadow-2xl border border-white/40 max-w-xs pointer-events-auto"
                        style={{ color: theme.colors.primary }}
                    >
                        <div className="flex justify-between items-start gap-4 mb-2">
                            <span className="text-xs font-bold uppercase opacity-80 tracking-widest" style={{ color: theme.colors.accent }}>
                                {theme.name}
                            </span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed font-sans text-slate-800">
                            {theme.greeting || "I am here for you."}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Avatar Navigation Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/comfort-room')}
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                className="relative w-16 h-16 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden border-2 cursor-pointer pointer-events-auto transition-all duration-300 group"
                style={{ borderColor: theme.colors.accent, backgroundColor: theme.colors.primary }}
            >
                <img
                    src={avatarSrc}
                    alt="Companion"
                    className="w-full h-full object-cover"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                />

                {/* Chat Badge */}
                <div
                    className="absolute bottom-0 right-0 w-full h-full bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                    <MessageCircle size={24} className="text-white drop-shadow-md" />
                </div>

                {/* Notification Dot - Always show to invite interaction */}
                <span
                    className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center bg-red-500"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </span>
            </motion.button>
        </div>
    );
}
