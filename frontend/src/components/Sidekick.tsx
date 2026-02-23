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

    // --- ANIMATION VARIANTS PER TIER ---

    // 1. PEEKERS (Anya) - Up/Down
    if (currentThemeId.includes('anya')) {
        return (
            <div className="pointer-events-none z-[10] md:z-[9999] relative flex justify-center w-full mt-4 mb-4 md:mt-0 md:mb-0 md:fixed md:inset-0 md:overflow-hidden">
                <motion.div
                    className={`md:absolute md:top-24 w-auto ${theme.position === 'left' ? 'md:left-4' : 'md:right-4'} ${className}`}
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
                            className="h-48 w-auto md:h-80 object-contain drop-shadow-2xl"
                            style={{
                                pointerEvents: 'auto',
                                filter: `drop-shadow(0 0 20px ${theme.colors.accent}80)`
                            }}
                        />
                    </div>
                </motion.div>
            </div>
        );
    }

    // 2. FLOATERS (Rimuru, Gojo, Shinobu) - Hover
    if (['rimuru', 'gojo', 'shinobu'].includes(currentThemeId)) {
        return (
            <div className="pointer-events-none z-[10] md:z-[9999] relative flex justify-center w-full mt-4 mb-4 md:mt-0 md:mb-0 md:fixed md:inset-0 md:overflow-hidden">
                <motion.div
                    className={`md:absolute md:top-24 w-auto ${theme.position === 'left' ? 'md:left-4' : 'md:right-4'} ${className}`}
                    animate={{
                        y: [0, -15, 0],
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
                        alt={theme.name}
                        animate={controls}
                        className="h-48 w-auto md:h-80 object-contain drop-shadow-2xl"
                        style={{
                            pointerEvents: 'auto',
                            filter: `drop-shadow(0 0 20px ${theme.colors.accent}80)`
                        }}
                    />
                    {currentThemeId === 'shinobu' && (
                        <motion.img
                            src="/assets/butterfly.png"
                            alt="Butterfly"
                            animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-12 -left-12 w-12 h-12 z-[10000] pointer-events-none opacity-80"
                            style={{ filter: `drop-shadow(0 0 10px ${theme.colors.accent})` }}
                        />
                    )}
                </motion.div>
            </div>
        );
    }

    // 3. BOUNCERS (Luffy) - Jump
    if (currentThemeId === 'luffy') {
        return (
            <div className="pointer-events-none z-[10] md:z-[9999] relative flex justify-center w-full mt-4 mb-4 md:mt-0 md:mb-0 md:fixed md:inset-0 md:overflow-hidden">
                <motion.div
                    className={`md:absolute md:top-24 w-auto ${theme.position === 'left' ? 'md:left-4' : 'md:right-4'} ${className}`}
                    animate={{
                        y: [0, -30, 0], // Jump
                        scaleY: [1, 1.05, 0.95, 1], // Stretch
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "circOut"
                    }}
                    onClick={handleInteraction}
                >
                    <motion.img
                        src={currentImage}
                        alt={theme.name}
                        animate={controls}
                        className="h-48 w-auto md:h-80 object-contain drop-shadow-xl"
                        style={{
                            pointerEvents: 'auto',
                            filter: `drop-shadow(0 0 20px ${theme.colors.accent}80)`
                        }}
                    />
                </motion.div>
            </div>
        );
    }

    // 4. SLIDERS (Rys) - Slide In/Out
    if (currentThemeId === 'rys') {
        return (
            <div className="pointer-events-none z-[10] md:z-[9999] relative flex justify-center w-full mt-4 mb-4 md:mt-0 md:mb-0 md:fixed md:inset-0 md:overflow-hidden">
                <motion.div
                    className={`md:absolute md:top-24 w-auto ${theme.position === 'left' ? 'md:left-4' : 'md:right-4'} ${className}`}
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{
                        x: ['-100%', '0%', '0%', '-100%'],
                        opacity: [0, 1, 1, 0]
                    }}
                    transition={{
                        duration: 12,
                        times: [0, 0.1, 0.9, 1],
                        repeat: Infinity,
                        repeatDelay: 5,
                        ease: "easeInOut"
                    }}
                    onClick={handleInteraction}
                >
                    <motion.img
                        src={currentImage}
                        alt={theme.name}
                        animate={controls}
                        className="h-48 w-auto md:h-80 object-contain drop-shadow-2xl"
                        style={{
                            pointerEvents: 'auto',
                            filter: `drop-shadow(0 0 20px ${theme.colors.accent}80)`
                        }}
                    />

                </motion.div>
            </div>
        );
    }

    // DEFAULT (Standard Stand)
    return (
        <div className="pointer-events-none z-[10] md:z-[9999] relative flex justify-center w-full mt-4 mb-4 md:mt-0 md:mb-0 md:fixed md:inset-0 md:overflow-hidden">
            <motion.div
                className={`md:absolute md:top-24 w-auto ${theme.position === 'left' ? 'md:left-4' : 'md:right-4'} ${className}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={handleInteraction}
            >
                <motion.img
                    src={currentImage}
                    alt={theme.name}
                    animate={controls}
                    className="h-48 w-auto md:h-80 object-contain transition-transform duration-400 ease-out"
                    style={{
                        pointerEvents: 'auto',
                        filter: `drop-shadow(0 0 20px ${theme.colors.accent}80)`
                    }}
                    whileHover={{
                        scale: 1.03,
                        y: -5,
                        transition: { duration: 0.4, ease: "easeOut" }
                    }}
                />
            </motion.div>
        </div>
    );

}

