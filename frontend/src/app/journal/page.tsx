'use client';

import Link from 'next/link';
import { Book, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JournalPage() {
    return (
        <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-12 rounded-3xl shadow-2xl max-w-md w-full"
            >
                <div className="p-4 bg-pink-500/20 rounded-full text-pink-400 mb-6 inline-block">
                    <Book size={48} />
                </div>
                <h1 className="text-3xl font-bold mb-4">Journal</h1>
                <p className="text-slate-400 mb-8">
                    Your personal space for thoughts and memories is coming soon.
                </p>
                <Link href="/" className="px-8 py-3 bg-pink-500 hover:bg-pink-600 rounded-full font-bold transition-all inline-flex items-center gap-2">
                    <Home size={20} />
                    Back to Dashboard
                </Link>
            </motion.div>
        </main>
    );
}
