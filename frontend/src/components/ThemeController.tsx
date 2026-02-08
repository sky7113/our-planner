'use client';

import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeController() {
    const { theme } = useTheme();

    useEffect(() => {
        if (!theme) return;

        const root = document.documentElement;
        // Or use body if preferred, but root is safer for global vars usually

        // 1. Set Font Family
        // Map the friendly name to the variable name
        const fontMap: Record<string, string> = {
            'Outfit': 'var(--font-outfit)',
            'Cinzel': 'var(--font-cinzel)',
            'Fredoka': 'var(--font-fredoka)',
        };

        const fontVar = fontMap[theme.fontFamily] || 'var(--font-outfit)';
        root.style.setProperty('--font-primary', fontVar);

        // 2. Set Theme Color (Glows/Borders)
        root.style.setProperty('--theme-color', theme.accentColor);

        // 3. Set Background Gradient (Aurora)
        root.style.setProperty('--bg-gradient', theme.bgGradient);

        // 4. Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme.accentColor);
        }

    }, [theme]);

    return null; // Logic only component
}
