'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTheme, CharacterId } from '../context/ThemeContext';
import { Smile, Frown, BatteryCharging, ArrowLeft, ArrowRight } from 'lucide-react';

export default function GrandEntrance() {
    const { setMood, setTheme, setIsSadMode, isSadMode } = useTheme();
    const router = useRouter();
    // Stages: 'welcome' -> 'mood' -> 'character' -> 'gate' -> 'finished'
    const [stage, setStage] = useState<'welcome' | 'mood' | 'character' | 'gate' | 'finished'>('welcome');

    // Selection State
    const [selectedCharId, setSelectedCharId] = useState<CharacterId | null>(null);

    // State to trigger the gate opening animation
    const [openGates, setOpenGates] = useState(false);
    const [welcomeImageSrc, setWelcomeImageSrc] = useState('/characters/group_welcome.png');

    const handleMood = (m: string) => {
        setMood(m);
        if (['Sad', 'Tired', 'Stressed'].includes(m)) {
            setIsSadMode(true);
        } else {
            setIsSadMode(false);
        }
        // Transition to character selection
        setStage('character');
    };

    const handleBackToWelcome = () => setStage('welcome');
    const handleBackToMood = () => {
        setStage('mood');
        // valid: preserve selection state
    };

    // Just selects the character, doesn't commit yet
    const handleCharacterClick = (id: CharacterId) => {
        setSelectedCharId(id);
    };

    // Commits the selection and starts the gate animation
    const handleEnterPalace = () => {
        if (!selectedCharId) return;

        setTheme(selectedCharId);
        setStage('gate');

        // Determine destination based on emotional state
        const destination = isSadMode ? '/comfort-room' : '/';

        // Slight delay before opening the gates to ensure they are rendered closed first
        setTimeout(() => {
            setOpenGates(true);
        }, 100);

        // After animation completes (3000ms), finish and navigate
        setTimeout(() => {
            sessionStorage.setItem('queen_has_entered', 'true');
            if (isSadMode) {
                router.push(destination);
            } else {
                setStage('finished');
            }
        }, 3500);
    };

    useEffect(() => {
        // Check for custom welcome image
        const customImage = localStorage.getItem('custom_welcome_image');
        if (customImage) {
            setWelcomeImageSrc(customImage);
        }

        const hasEntered = sessionStorage.getItem('queen_has_entered');
        if (hasEntered === 'true') {
            setStage('finished');
        }
    }, []);

    const characterOptions: { id: CharacterId; label: string; color: string; description: string }[] = [
        {
            id: 'shinobu',
            label: 'Shinobu Kocho',
            color: 'bg-gradient-to-br from-green-900 to-purple-900 border-green-500',
            description: 'Preserving the Bond'
        },
        {
            id: 'anya',
            label: 'Anya Forger',
            color: 'bg-gradient-to-br from-pink-600 to-yellow-500 border-pink-300',
            description: 'Mission: Waku Waku!'
        },
        {
            id: 'luffy',
            label: 'Monkey D. Luffy',
            color: 'bg-gradient-to-br from-red-600 to-yellow-500 border-blue-500',
            description: 'King of the Pirates'
        },
        {
            id: 'rys',
            label: 'Rys & Fenrys',
            color: 'bg-gradient-to-br from-slate-100 to-blue-200 border-blue-400 text-slate-800',
            description: 'A Peaceful Life'
        },
        {
            id: 'rimuru',
            label: 'Rimuru Tempest',
            color: 'bg-gradient-to-br from-cyan-600 to-blue-600 border-cyan-400',
            description: 'Everything will be okay!'
        },
        {
            id: 'gojo',
            label: 'Satoru Gojo',
            color: 'bg-gradient-to-br from-slate-900 to-cyan-900 border-cyan-400',
            description: 'The Strongest'
        },
    ];

    if (stage === 'finished') return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-auto bg-black">

            {/* CONTENT LAYER */}
            <AnimatePresence mode='wait'>
                {/* STAGE 1: ANIME WELCOME */}
                {stage === 'welcome' && (
                    <motion.div
                        key="welcome"
                        className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Background Image */}
                        <img
                            src="/welcome_bg.jpg"
                            alt="Sky Background"
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* Overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/30" />

                        {/* Title Text */}
                        <motion.h1
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="relative z-20 text-5xl md:text-7xl font-serif text-yellow-400 font-bold drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-center mt-[-20vh]"
                        >
                            Welcome Home, My Queen
                        </motion.h1>

                        {/* The User's Group Image */}
                        <img
                            src={welcomeImageSrc}
                            alt="Welcome Characters"
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[80vh] object-contain z-10"
                        />

                        {/* Enter Button */}
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.5, duration: 0.5 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setStage('mood')}
                            className="absolute bottom-10 z-30 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-4 px-12 rounded-full shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:shadow-[0_0_40px_rgba(255,215,0,0.8)] transition-all uppercase tracking-widest text-lg border-2 border-yellow-200"
                        >
                            Enter Palace
                        </motion.button>
                    </motion.div>
                )}

                {/* STAGE 2: MOOD CHECK */}
                {stage === 'mood' && (
                    <motion.div
                        key="mood"
                        className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -100 }}
                    >
                        {/* Back Button */}
                        <button
                            onClick={handleBackToWelcome}
                            className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/70 hover:text-white transition-colors group cursor-pointer"
                        >
                            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-lg uppercase tracking-widest">Back</span>
                        </button>

                        <h2 className="text-4xl font-light text-yellow-100 mb-12 tracking-wide drop-shadow-md text-center font-serif">
                            How is your royal heart today?
                        </h2>
                        <div className="flex flex-col gap-6 w-80">
                            {[
                                { label: 'Happy', icon: Smile, color: 'text-yellow-400', border: 'hover:border-yellow-400/50' },
                                { label: 'Tired', icon: BatteryCharging, color: 'text-blue-400', border: 'hover:border-blue-400/50' },
                                { label: 'Sad', icon: Frown, color: 'text-indigo-400', border: 'hover:border-indigo-400/50' },
                                { label: 'Stressed', icon: Frown, color: 'text-rose-400', border: 'hover:border-rose-400/50' }
                            ].map((m) => (
                                <button
                                    key={m.label}
                                    onClick={() => handleMood(m.label)}
                                    className={`group flex items-center gap-6 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 ${m.border} transition-all duration-300`}
                                >
                                    <m.icon className={`${m.color} w-8 h-8 group-hover:scale-110 transition-transform`} />
                                    <span className="text-white text-xl font-light">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* STAGE 3: CHARACTER SELECTION */}
                {stage === 'character' && (
                    <motion.div
                        key="character"
                        className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        {/* Back Button */}
                        <button
                            onClick={handleBackToMood}
                            className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/70 hover:text-white transition-colors group cursor-pointer"
                        >
                            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-lg uppercase tracking-widest">Back</span>
                        </button>

                        <h2 className="text-3xl font-light text-yellow-100 mb-10 tracking-wide drop-shadow-md text-center font-serif">
                            Who shall attend to you today?
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full px-6 mb-12">
                            {characterOptions.map((char) => (
                                <motion.button
                                    key={char.id}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleCharacterClick(char.id)}
                                    className={`relative overflow-hidden p-6 rounded-2xl border shadow-lg flex flex-col items-start justify-center gap-2 group transition-all duration-300
                                        ${selectedCharId === char.id
                                            ? 'border-yellow-400 bg-white/10 scale-105 shadow-[0_0_20px_rgba(255,215,0,0.3)]'
                                            : `border-white/10 bg-transparent ${char.color.split(' ')[0] === 'bg-gradient-to-br' ? 'hover:bg-white/5' : ''}`
                                        }
                                        ${char.color}
                                    `}
                                >
                                    {/* Selection Checkmark Overlay */}
                                    {selectedCharId === char.id && (
                                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-black" />
                                        </div>
                                    )}

                                    <span className={`text-xl font-bold ${char.id === 'rys' ? 'text-slate-800' : 'text-white'}`}>
                                        {char.label}
                                    </span>
                                    <span className={`text-sm opacity-80 ${char.id === 'rys' ? 'text-slate-700' : 'text-gray-200'}`}>
                                        {char.description}
                                    </span>
                                </motion.button>
                            ))}
                        </div>

                        {/* Enter Button - Only Visible when Selected */}
                        <AnimatePresence>
                            {selectedCharId && (
                                <motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    onClick={handleEnterPalace}
                                    className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-4 px-16 rounded-full shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:shadow-[0_0_40px_rgba(255,215,0,0.8)] transition-all uppercase tracking-widest text-lg border-2 border-yellow-200 flex items-center gap-2"
                                >
                                    <span>Enter Palace</span>
                                    <ArrowRight size={20} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* STAGE 4: THE INDIAN GATE (Overlay) */}
            {/* Only render if we are in character or gate stage (so it can appear over character selection) */}
            {(stage === 'gate' || stage === 'character') && (
                <>
                    {/* Left Door */}
                    <div
                        className={`fixed top-0 left-0 w-1/2 h-full bg-gradient-to-br from-[#5e0a0a] to-[#2b0303] border-r-4 border-yellow-500 z-[200] transition-transform duration-[3000ms] ease-in-out ${openGates ? '-translate-x-full' : 'translate-x-0'
                            }`}
                        style={{
                            display: stage === 'gate' ? 'block' : 'none'
                        }}
                    >
                        {/* Mandala Left Half - Centered vertically on right edge */}
                        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-32 h-64 bg-yellow-500 rounded-l-full shadow-[0_0_50px_rgba(255,215,0,0.3)] flex items-center justify-end overflow-hidden">
                            <div className="w-24 h-48 border-4 border-[#5e0a0a] rounded-l-full opacity-30 mr-2" />
                        </div>
                    </div>

                    {/* Right Door */}
                    <div
                        className={`fixed top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-[#5e0a0a] to-[#2b0303] border-l-4 border-yellow-500 z-[200] transition-transform duration-[3000ms] ease-in-out ${openGates ? 'translate-x-full' : 'translate-x-0'
                            }`}
                        style={{
                            display: stage === 'gate' ? 'block' : 'none'
                        }}
                    >
                        {/* Mandala Right Half - Centered vertically on left edge */}
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 h-64 bg-yellow-500 rounded-r-full shadow-[0_0_50px_rgba(255,215,0,0.3)] flex items-center justify-start overflow-hidden">
                            <div className="w-24 h-48 border-4 border-[#5e0a0a] rounded-r-full opacity-30 ml-2" />
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}
