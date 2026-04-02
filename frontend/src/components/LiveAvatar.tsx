'use client';

import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

interface LiveAvatarProps {
    size?: string;
    className?: string;
    isPointing?: boolean;
}

export default function LiveAvatar({ size = 'w-12 h-12', className = '', isPointing = false }: LiveAvatarProps) {
    const { theme } = useTheme();
    const [isInteracting, setIsInteracting] = useState(false);
    const controls = useAnimation();

    // On Load: Wave
    useEffect(() => {
        const wave = async () => {
            await controls.start({
                rotate: [0, 15, -10, 15, -5, 10, 0],
                transition: { duration: 2, ease: "easeInOut" }
            });
        };
        wave();
    }, [controls]);

    // Handle Pointing / Presenting State
    useEffect(() => {
        if (isPointing) {
            controls.start({
                rotate: [0, -10, 0],
                x: [0, -5, 0],
                scale: 1.1,
                transition: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
            });
        } else {
            // Reset if not pointing (unless interacting)
            if (!isInteracting) {
                controls.start({
                    rotate: 0,
                    x: 0,
                    scale: 1,
                    transition: { duration: 0.3 }
                });
            }
        }
    }, [isPointing, controls, isInteracting]);

    const handleClick = async () => {
        if (isInteracting) return;
        setIsInteracting(true);

        // Bounce Animation
        await controls.start({
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
            transition: { duration: 0.5, ease: "easeInOut" }
        });

        setIsInteracting(false);
    };

    if (!theme) return null;

    return (
        <motion.div
            className={`relative rounded-full overflow-hidden border-2 border-white/20 cursor-pointer ${size} ${className}`}
            whileHover={{ scale: 1.05 }}
            onClick={handleClick}
            animate={controls}
            title="Click to say hi!"
        >
            {/* Glow Effect */}
            <div className={`absolute inset-0 bg-linear-to-tr ${theme.colors.primary} opacity-20`} />

            <img
                src={theme.characterImage || '/avatars/default.png'}
                alt={theme.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/avatars/default.png';
                }}
            />
        </motion.div>
    );
}
