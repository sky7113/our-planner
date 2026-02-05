'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type CharacterId = 'default' | 'shinobu' | 'anya' | 'luffy' | 'rys' | 'rimuru' | 'gojo' | 'zoro' | 'kuromi' | 'shinchan';

interface PersonalityColors {
    primary: string;   // Hex
    secondary: string; // Hex
    accent: string;    // Hex
    // Computed Tailwind classes for backward compatibility/ease of use
    backgroundClass: string;
    textClass: string;
    cardClass: string;
    borderClass: string;
}

export interface PersonalityObject {
    id: CharacterId;
    name: string; // Display name
    font: string;
    colors: PersonalityColors;
    bgImage: string;
    greeting: string;
    voiceStyle: string;
    characterImage?: string;
    sidekickImage?: string;
    labels?: {
        treasury: string;
        knowledge: string;
        memories: string;
        companion: string;
    }
}

// Helper to create the colors object
const createColors = (primary: string, secondary: string, accent: string, isLight = false): PersonalityColors => ({
    primary,
    secondary,
    accent,
    backgroundClass: `bg-[${primary}]`,
    textClass: isLight ? 'text-slate-900' : 'text-slate-50',
    cardClass: isLight ? 'bg-white/60 backdrop-blur-md' : 'bg-black/20 backdrop-blur-md',
    borderClass: `border-[${accent}] border-opacity-50`
});

const distinctPersonalities: Record<CharacterId, PersonalityObject> = {
    'default': {
        id: 'default',
        name: 'Royal Companion',
        font: 'font-serif',
        colors: createColors('#0f172a', '#e2e8f0', '#c084fc'), // Slate-900, Slate-200, Purple
        bgImage: '', // No default bg image, handled by CSS fallback
        greeting: 'Welcome Home, My Queen.',
        voiceStyle: 'formal, respectful, attentive',
        labels: {
            treasury: 'Treasury',
            knowledge: 'Knowledge',
            memories: 'Memories',
            companion: 'Companion'
        },
        characterImage: '/characters/group_welcome.png'
    },
    'shinobu': {
        id: 'shinobu',
        name: 'Shinobu Kocho',
        font: 'font-serif',
        colors: createColors('#4a0404', '#8b5cf6', '#a78bfa'), // Deep Red/Purple
        bgImage: '/backgrounds/butterfly_mansion.jpg',
        greeting: 'Ara ara, welcome home, my Queen.',
        voiceStyle: 'gentle, mature, slightly teasing but comforting',
        labels: {
            treasury: 'Mansion Budget',
            knowledge: 'Medical Records',
            memories: 'Butterfly Sisters',
            companion: 'Talk to Shinobu'
        },
        characterImage: '/characters/shinobu.png',
        sidekickImage: '/assets/shinobu-full.png'
    },
    'anya': {
        id: 'anya',
        name: 'Anya Forger',
        font: 'font-rounded',
        colors: createColors('#f472b6', '#fbbf24', '#fcd34d', true), // Pink/Gold
        bgImage: '/backgrounds/anya_room.jpg',
        greeting: 'Waku Waku! You are back!',
        voiceStyle: 'childish, excited, talks about peanuts and saving the world',

        characterImage: '/characters/anya.png',
        sidekickImage: '/assets/anya-full.png',
        labels: {
            treasury: 'Spy Mission Fund',
            knowledge: 'School Homework',
            memories: 'Family Album',
            companion: 'Play with Anya'
        }
    },
    'rys': {
        id: 'rys',
        name: 'Rys & Fenrys',
        font: 'font-sans',
        colors: createColors('#1e3a8a', '#93c5fd', '#60a5fa'), // White/Blue
        bgImage: '/backgrounds/forest_house.jpg',
        greeting: 'My darling! I have been waiting for you!',
        voiceStyle: 'loyal, devoted, protective, affectionate',

        characterImage: '/characters/rys.png',
        sidekickImage: '/assets/rys-full.png',
        labels: {
            treasury: 'Kingdom Gold',
            knowledge: 'Magic Spells',
            memories: 'Our Life',
            companion: 'Summon Rys'
        }
    },
    'luffy': {
        id: 'luffy',
        name: 'Monkey D. Luffy',
        font: 'font-bold',
        colors: createColors('#dc2626', '#facc15', '#2563eb'), // Red, Gold, Blue
        bgImage: '/backgrounds/thousand_sunny.jpg',
        greeting: "Shishishi! Welcome back! I bet you're hungry!",
        voiceStyle: 'energetic, loud, careless, protective',

        characterImage: '/characters/luffy.png',
        sidekickImage: '/assets/luffy-full.png',
        labels: {
            treasury: "Nami's Vault",
            knowledge: 'Poneglyphs',
            memories: 'Log Pose History',
            companion: 'Join the Crew'
        }
    },
    'rimuru': {
        id: 'rimuru',
        name: 'Rimuru Tempest',
        font: 'font-sans',
        colors: createColors('#0ea5e9', '#e2e8f0', '#f59e0b'), // Slime Blue, Silver, Gold
        bgImage: '/backgrounds/tempest_city.jpg',
        greeting: 'I am not a bad slime! Relax, you are safe here.',
        voiceStyle: 'polite, logical, kind, leader-like',

        characterImage: '/characters/rimuru.png',
        sidekickImage: '/assets/rimuru-full.png',
        labels: {
            treasury: 'Tempest Treasury',
            knowledge: 'Great Sage',
            memories: 'Reincarnation Log',
            companion: 'Speak to Rimuru'
        }
    },
    'gojo': {
        id: 'gojo',
        name: 'Satoru Gojo',
        font: 'font-mono',
        colors: createColors('#0f172a', '#06b6d4', '#ffffff'), // Deep Void, Infinity Cyan, White
        bgImage: '/backgrounds/infinite_void.jpg',
        greeting: "Don't worry, I'm the strongest. Welcome home.",
        voiceStyle: 'arrogant, playful, teasing, insanely confident',

        characterImage: '/characters/gojo.png',
        sidekickImage: '/assets/gojo-full.png',
        labels: {
            treasury: 'Jujutsu Tech Funds',
            knowledge: 'Infinite Void',
            memories: 'Shibuya Incident',
            companion: 'Consult the Strongest'
        }
    },
    'zoro': {
        id: 'zoro',
        name: 'Roronoa Zoro',
        font: 'font-mono',
        colors: createColors('#183828', '#99D98C', '#000000'), // Dark Green, Light Green, Black
        bgImage: '/assets/zoro-bg.jpg',
        characterImage: '/characters/zoro.png',
        sidekickImage: '/assets/zoro-full.png',
        greeting: "Nothing happened... I was just waiting for you.",
        voiceStyle: "stoic, serious, deeply loyal, directionally challenged",
        labels: {
            treasury: 'Bounty Hunter Fund',
            knowledge: 'Swordsmanship',
            memories: 'Log Journey',
            companion: 'Train with Zoro'
        }
    },
    'kuromi': {
        id: 'kuromi',
        name: 'Kuromi',
        font: 'font-rounded',
        colors: createColors('#2B1B2D', '#F4ACD3', '#D8B4E2'), // Dark Purple, Hot Pink, Light Purple
        bgImage: '/assets/kuromi-bg.jpg',
        characterImage: '/characters/kuromi.png',
        sidekickImage: '/assets/kuromi-full.png',
        greeting: "Cheeky but sweet! Welcome home!",
        voiceStyle: "cheeky, punk-rock, sensitive, energetic",
        labels: {
            treasury: 'Melody Key Stash',
            knowledge: 'Romance Novels',
            memories: 'Kuromi Notes',
            companion: 'Plot with Kuromi'
        }
    },
    'shinchan': {
        id: 'shinchan',
        name: 'Shin-chan',
        font: 'font-sans',
        colors: createColors('#E63946', '#F4A261', '#2A9D8F'), // Red, Yellow/Orange, Green
        bgImage: '/assets/shinchan-bg.jpg',
        characterImage: '/characters/shinchan.png',
        sidekickImage: '/assets/shinchan-full.png',
        greeting: "Oho! Look who is here! Let's have some fun!",
        voiceStyle: "mischievous, shameless, funny, energetic",
        labels: {
            treasury: 'Chocobi Money',
            knowledge: 'Action Kamen Episodes',
            memories: 'Kasukabe Photos',
            companion: 'Play with Shin-chan'
        }
    },

};

interface ThemeContextType {
    currentTheme: CharacterId;
    theme: PersonalityObject;
    setTheme: (id: CharacterId) => void;
    // Keeping mood for backward compat / shared state
    mood: string;
    setMood: (mood: string) => void;
    isSadMode: boolean;
    setSadMode: (isSad: boolean) => void;
    // Backward compat alias
    setIsSadMode: (isSad: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [currentTheme, setCurrentTheme] = useState<CharacterId>('shinobu');
    const [mood, setMood] = useState<string>('');
    const [isSadMode, setIsSadMode] = useState<boolean>(false);

    useEffect(() => {
        // Load persistance
        const savedId = localStorage.getItem('raksha_character_id') as CharacterId;
        if (savedId && distinctPersonalities[savedId]) {
            setCurrentTheme(savedId);
        }

        // Also check sad mode persistence if necessary? User didn't ask for it, but good practice.
        // Skipping sad mode persistence to allow "fresh start" on reload unless in comfort room.
    }, []);

    const handleSetTheme = (id: CharacterId) => {
        setCurrentTheme(id);
        localStorage.setItem('raksha_character_id', id);

        // Backward compatibility: also update raksha_theme for older logic if needed?
        // Let's assume we fully migrate.
    };

    const handleSetSadMode = (isSad: boolean) => {
        setIsSadMode(isSad);
    };

    return (
        <ThemeContext.Provider value={{
            currentTheme,
            theme: distinctPersonalities[currentTheme],
            setTheme: handleSetTheme,
            mood,
            setMood,
            isSadMode,
            setSadMode: handleSetSadMode,
            setIsSadMode: handleSetSadMode // Alias
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
