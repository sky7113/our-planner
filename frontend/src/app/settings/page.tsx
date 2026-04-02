'use client';

import Link from 'next/link';
import { Settings, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPlaceholderPage() {
    return (
        <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-12 rounded-3xl shadow-2xl max-w-md w-full"
            >
                <div className="p-4 bg-purple-500/20 rounded-full text-purple-400 mb-6 inline-block">
                    <Settings size={48} />
                </div>
                <h1 className="text-3xl font-bold mb-4">Settings</h1>
                <p className="text-slate-400 mb-8">
                    Customize your experience. We're currently building the settings panel.
                </p>
                <Link href="/" className="px-8 py-3 bg-purple-500 hover:bg-purple-600 rounded-full font-bold transition-all inline-flex items-center gap-2">
                    <Home size={20} />
                    Back to Dashboard
                </Link>
            </motion.div>
        </main>
    );
}
