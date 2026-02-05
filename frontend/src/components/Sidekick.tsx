'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

interface SidekickProps {
    className?: string;
    image?: string;
    themeId?: string;
}

export default function Sidekick({ className = '', image, themeId }: SidekickProps) {
    const { theme } = useTheme();

    // Fallback to context if props are missing
    const currentImage = image || theme.characterImage;
    const currentThemeId = themeId || theme.id;

    const [isClicked, setIsClicked] = useState(false);
    const controls = useAnimation();

    // Reset interaction state on theme change
    useEffect(() => {
        setIsClicked(false);
    }, [theme.id]);

    const handleInteraction = async () => {
        setIsClicked(true);
        // Generic happy reaction
        await controls.start({
            scale: [1, 1.2, 0.9, 1.1, 1],
            rotate: [0, 10, -10, 10, 0],
            transition: { duration: 0.5 }
        });
        setTimeout(() => setIsClicked(false), 1000);
    };

    if (!currentImage) return null;

    // --- ANYA: The Spy Geek (Peek Animation) ---
    // Make her bob while peeking so she looks alive
    if (currentThemeId.includes('anya')) {
        return (
            <motion.div
                className={`fixed bottom-0 left-0 z-40 w-48 md:w-64 cursor-pointer ${className}`}
                initial={{ y: '100%' }}
                animate={{
                    y: ['100%', '0%', '0%', '100%'], // Up, Stay, Down
                }}
                transition={{
                    duration: 8,
                    times: [0, 0.1, 0.9, 1],
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "easeInOut"
                }}
                onClick={handleInteraction}
            >
                <div className="relative">
                    <motion.img
                        src={currentImage}
                        alt="Anya Peeking"
                        animate={controls}
                        className="w-full drop-shadow-2xl"
                    />
                    {/* "Waku Waku" star effect could go here */}
                </div>
            </motion.div>
        );
    }

    // --- RIMURU: The Slime Lord (Floating/Bouncing) ---
    if (currentThemeId === 'rimuru') {
        return (
            <motion.div
                className={`fixed bottom-1/2 right-4 translate-y-1/2 z-40 w-48 md:w-56 cursor-pointer ${className}`}
                animate={{
                    y: [0, -20, 0, 15, 0],
                    x: [0, 5, 0, -5, 0],
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                onClick={handleInteraction}
            >
                <div className="relative">
                    <motion.img
                        src={currentImage}
                        alt="Rimuru Floating"
                        animate={{
                            scaleY: [1, 0.95, 1.05, 1],
                            scaleX: [1, 1.05, 0.95, 1]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-full drop-shadow-[0_0_25px_rgba(56,189,248,0.6)]"
                    />
                    {isClicked && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1.5, y: -50 }}
                            exit={{ opacity: 0 }}
                            className="absolute -top-10 right-10 text-4xl"
                        >
                            💧
                        </motion.div>
                    )}
                </div>
            </motion.div>
        );
    }

    // --- SHINOBU: The Insect Hashira (Result: Flutter) ---
    if (currentThemeId.includes('shinobu')) {
        return (
            <motion.div
                className={`fixed top-1/2 left-0 -translate-y-1/2 z-40 w-48 md:w-60 cursor-pointer ${className}`}
                animate={{
                    y: [0, -15, 0],
                    rotate: [0, 2, -2, 0]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                onClick={handleInteraction}
            >
                <motion.img
                    src={currentImage}
                    alt="Shinobu"
                    animate={controls}
                    className="w-full drop-shadow-[0_0_30px_rgba(167,139,250,0.5)]"
                />
                <div className="absolute top-0 right-0 -z-10 text-purple-400 opacity-50 animate-pulse text-2xl">🦋</div>
            </motion.div>
        );
    }

    // --- GOJO: The Strongest (Mystical Hover) ---
    if (currentThemeId === 'gojo') {
        return (
            <motion.div
                className={`fixed top-1/2 left-8 -translate-y-1/2 z-40 w-48 md:w-64 cursor-pointer ${className}`}
                animate={{
                    y: [-10, 10, -10], // Slow hover
                    opacity: [0.9, 1, 0.9], // Breathing effect
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                onClick={handleInteraction}
            >
                <div className="relative">
                    <motion.img
                        src={currentImage}
                        alt="Gojo Satoru"
                        animate={controls}
                        className="w-full drop-shadow-[0_0_40px_rgba(6,182,212,0.6)]"
                    />
                    {/* Infinity Void Aura */}
                    <div className="absolute inset-0 bg-cyan-500/10 blur-3xl -z-10 rounded-full animate-pulse" />
                </div>
            </motion.div>
        );
    }

    // --- LUFFY: The Pirate King (Rubber Bounce) ---
    if (currentThemeId === 'luffy') {
        return (
            <motion.div
                className={`fixed bottom-0 right-8 z-40 w-48 md:w-60 cursor-pointer ${className}`}
                animate={{
                    y: [0, -50, 0], // Big Jump
                    scaleY: [1, 1.1, 0.9, 1], // Stretch
                }}
                transition={{
                    duration: 1.5, // Faster bounce
                    repeat: Infinity,
                    ease: "circOut" // Poppier bounce
                }}
                onClick={handleInteraction}
            >
                <motion.img
                    src={currentImage}
                    alt="Monkey D. Luffy"
                    animate={controls}
                    className="w-full drop-shadow-xl"
                />
            </motion.div>
        );
    }

    // --- RYS: The High Lord (Fade Slide) ---
    if (currentThemeId.includes('rys')) {
        return (
            <motion.div
                className={`fixed bottom-0 left-0 z-40 w-48 md:w-64 cursor-pointer ${className}`}
                initial={{ x: '-100%', opacity: 0 }}
                animate={{
                    x: ['-100%', '0%', '0%', '-100%'], // Slide in, wait, slide out
                    opacity: [0, 1, 1, 0]
                }}
                transition={{
                    duration: 10,
                    times: [0, 0.2, 0.8, 1], // Wait in middle
                    repeat: Infinity,
                    repeatDelay: 5,
                    ease: "easeInOut"
                }}
                onClick={handleInteraction}
            >
                <motion.img
                    src={currentImage}
                    alt="Rys"
                    animate={controls}
                    className="w-full drop-shadow-2xl"
                />
                {/* Dark fog effect */}
                <div className="absolute bottom-0 left-0 w-full h-20 bg-black/20 blur-xl -z-10" />
            </motion.div>
        );
    }

    // --- DEFAULT / OTHERS (Simple Corner Stand) ---
    return (
        <motion.div
            className={`fixed bottom-0 right-8 z-40 w-40 md:w-48 cursor-pointer ${className}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 0.8 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            onClick={handleInteraction}
        >
            <motion.img
                src={currentImage}
                alt={theme.name}
                animate={controls}
                className="w-full transition-transform duration-400 ease-out"
                style={{
                    filter: `drop-shadow(0px 5px 15px rgba(0,0,0,0.5)) drop-shadow(0px 0px 5px ${theme.colors.primary})`,
                    transform: 'translateZ(0)', // Hardware acceleration
                }}
                whileHover={{
                    scale: 1.03,
                    y: -5,
                    transition: { duration: 0.4, ease: "easeOut" }
                }}
            />
        </motion.div>
    );

}
