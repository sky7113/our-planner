'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Sparkles, Heart, Save, Book, X, RefreshCw } from 'lucide-react';

interface BridgeMessage {
    id: number;
    sender: 'Amber' | 'Raksha';
    message: string;
    ai_response: string;
    timestamp: string;
}

interface SavedBridgeChat {
    id: number;
    title: string;
    date: string;
    content: BridgeMessage[];
}

export default function BridgePage() {
    const { theme } = useTheme();
    const [currentUser, setCurrentUser] = useState<'Amber' | 'Raksha'>('Amber');
    const [messages, setMessages] = useState<BridgeMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Memory State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [isViewingArchive, setIsViewingArchive] = useState<BridgeMessage[] | null>(null);
    const [saveTitle, setSaveTitle] = useState('');
    const [archives, setArchives] = useState<SavedBridgeChat[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 1. Auto-Reset on Entry
    useEffect(() => {
        const initBridge = async () => {
            try {
                // Clear old session for a fresh start
                await fetch('https://our-backend-api.onrender.com/api/bridge/reset', { method: 'DELETE' });
                setMessages([]);
            } catch (error) {
                console.error("Failed to reset bridge:", error);
            }
        };

        initBridge();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchHistory = async () => {
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/bridge/history');
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading) return;

        // Optimistic UI update (optional, but better to wait for AI response for flow)
        setIsLoading(true);

        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/bridge/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: currentUser,
                    message: inputText
                })
            });

            if (res.ok) {
                // Re-fetch to get AI response and full context
                fetchHistory();
                setInputText('');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Memory Handlers ---

    const handleOpenSave = () => {
        if (messages.length === 0) return; // Don't save empty chats
        setSaveTitle(`Resolution on ${new Date().toLocaleDateString()}`);
        setIsSaveModalOpen(true);
    };

    const handleConfirmSave = async () => {
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/bridge/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: saveTitle,
                    messages: messages // Correctly saves current messages
                })
            });
            if (res.ok) {
                setIsSaveModalOpen(false);
                setSaveTitle('');
                // Optional: success toast could go here
            }
        } catch (e) {
            console.error("Save failed:", e);
        }
    };

    const handleOpenArchive = async () => {
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/bridge/archive');
            if (res.ok) {
                const data = await res.json();
                setArchives(data);
                setIsArchiveOpen(true);
            }
        } catch (e) {
            console.error("Archive fetch failed:", e);
        }
    };

    if (!theme) return null;

    return (
        <main className={`min-h-screen ${theme.colors.backgroundClass} text-white relative overflow-hidden flex flex-col transition-colors duration-700 pb-32`}>

            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/40 to-transparent opacity-50" />
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-white rounded-full"
                        initial={{
                            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                            opacity: Math.random() * 0.5 + 0.1,
                            scale: Math.random() * 0.5 + 0.5
                        }}
                        animate={{
                            y: [null, Math.random() * -20],
                            opacity: [null, Math.random() * 0.3 + 0.1]
                        }}
                        transition={{
                            duration: Math.random() * 5 + 5,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut"
                        }}
                        style={{ width: Math.random() * 3 + 1, height: Math.random() * 3 + 1 }}
                    />
                ))}
            </div>

            {/* Header / Identity Toggle */}
            <div className="w-full p-4 backdrop-blur-md bg-black/20 border-b border-white/5 z-20 flex justify-between items-center sticky top-0">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-light tracking-widest text-indigo-200">THE BRIDGE</span>
                </div>

                <div className="flex bg-black/30 p-1 rounded-full border border-white/10">
                    <button
                        onClick={() => setCurrentUser('Amber')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${currentUser === 'Amber'
                            ? 'bg-blue-500/20 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                            : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        Amber
                    </button>
                    <button
                        onClick={() => setCurrentUser('Raksha')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${currentUser === 'Raksha'
                            ? 'bg-pink-500/20 text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                            : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        Raksha
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenSave}
                        className="p-2 text-white/50 hover:text-indigo-300 transition-colors"
                        title="Archive Resolution"
                    >
                        <Save size={20} />
                    </button>
                    <button
                        onClick={handleOpenArchive}
                        className="p-2 text-white/50 hover:text-indigo-300 transition-colors"
                        title="View Past Resolutions"
                    >
                        <Book size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-20">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-white/30 text-center space-y-4">
                        <Sparkles size={48} className="text-indigo-300/50 animate-pulse" />
                        <p className="font-light max-w-md">The Bridge is open. Speak your heart, and let wisdom guide you back to each other.</p>
                        <span className="text-xs bg-white/5 px-3 py-1 rounded-full">Session Auto-Reset Active</span>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={msg.id} className="space-y-6">
                        {/* User Message */}
                        <div className={`flex ${msg.sender === 'Amber' ? 'justify-start' : 'justify-end'}`}>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl border backdrop-blur-sm shadow-lg ${msg.sender === 'Amber'
                                    ? 'bg-blue-950/30 border-blue-500/30 rounded-tl-none'
                                    : 'bg-pink-950/30 border-pink-500/30 rounded-tr-none'
                                    }`}
                            >
                                <div className={`text-xs font-bold mb-1 uppercase tracking-wider ${msg.sender === 'Amber' ? 'text-blue-400' : 'text-pink-400'
                                    }`}>
                                    {msg.sender}
                                </div>
                                <p className="text-white/90 leading-relaxed font-light">{msg.message}</p>
                            </motion.div>
                        </div>

                        {/* Mediator Response (Center) */}
                        <div className="flex justify-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="max-w-[90%] md:max-w-[60%] p-6 rounded-3xl bg-amber-900/10 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)] text-center relative"
                            >
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 p-1.5 rounded-full border border-amber-500/30">
                                    <Heart size={16} className="text-amber-400 fill-amber-400/20" />
                                </div>
                                <p className="text-amber-100/90 font-serif italic text-lg leading-relaxed">
                                    &quot;{msg.ai_response}&quot;
                                </p>
                            </motion.div>
                        </div>

                        {/* Connector Line (Visual only) */}
                        {index < messages.length - 1 && (
                            <div className="w-px h-8 bg-gradient-to-b from-white/10 to-transparent mx-auto" />
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 z-20 bg-black/60 backdrop-blur-lg border-t border-white/5">
                <div className="max-w-4xl mx-auto relative group">
                    <div className={`absolute -inset-0.5 rounded-2xl blur opacity-30 transition duration-500 group-hover:opacity-60 ${currentUser === 'Amber' ? 'bg-blue-600' : 'bg-pink-600'
                        }`} />
                    <div className="relative flex items-center bg-slate-900 rounded-2xl border border-white/10 p-2 pl-4">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={`Tell the Mediator how you feel, ${currentUser}...`}
                            className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder-white/30 py-2"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading}
                            className={`p-3 rounded-xl transition-all ${isLoading ? 'bg-white/5 cursor-wait' :
                                currentUser === 'Amber' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-pink-600 hover:bg-pink-500 text-white'
                                }`}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {/* Save Modal */}
                {isSaveModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm relative">
                            <h3 className="text-lg font-light text-white mb-4">Archive this Resolution?</h3>
                            <input
                                autoFocus
                                type="text"
                                value={saveTitle}
                                onChange={(e) => setSaveTitle(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white mb-6 focus:outline-none focus:border-indigo-500"
                                placeholder="Give this moment a title..."
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsSaveModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-white/50 hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmSave}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                                >
                                    Archive
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Archive List Modal */}
                {isArchiveOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md h-[70vh] flex flex-col relative">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-light text-white tracking-wide">Past Resolutions</h3>
                                <button onClick={() => setIsArchiveOpen(false)} className="text-white/30 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                                {archives.length === 0 ? (
                                    <div className="text-center text-white/30 mt-12">No archived resolutions found.</div>
                                ) : (
                                    archives.map(chat => (
                                        <button
                                            key={chat.id}
                                            onClick={() => {
                                                setIsViewingArchive(chat.content);
                                                setIsArchiveOpen(false);
                                            }}
                                            className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                                        >
                                            <div className="font-medium text-indigo-200 group-hover:text-indigo-100">{chat.title}</div>
                                            <div className="text-xs text-white/40 mt-1">{chat.date}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Active Archive View Modal (Read Only) */}
                {isViewingArchive && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-slate-950 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                            <span className="text-indigo-300 tracking-widest uppercase text-sm">Archived Memory</span>
                            <button
                                onClick={() => setIsViewingArchive(null)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm"
                            >
                                <X size={16} /> Close
                            </button>
                        </div>

                        {/* Read-Only Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                            {isViewingArchive.map((msg, index) => (
                                <div key={msg.id} className="opacity-80">
                                    {/* User Message */}
                                    <div className={`flex ${msg.sender === 'Amber' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl border ${msg.sender === 'Amber'
                                            ? 'bg-blue-950/20 border-blue-500/20 rounded-tl-none'
                                            : 'bg-pink-950/20 border-pink-500/20 rounded-tr-none'
                                            }`}
                                        >
                                            <div className={`text-xs font-bold mb-1 uppercase tracking-wider ${msg.sender === 'Amber' ? 'text-blue-500' : 'text-pink-500'
                                                }`}>
                                                {msg.sender}
                                            </div>
                                            <p className="text-white/70 leading-relaxed font-light">{msg.message}</p>
                                        </div>
                                    </div>

                                    {/* Mediator Response */}
                                    <div className="flex justify-center mt-6 mb-6">
                                        <div className="max-w-[90%] md:max-w-[60%] p-4 rounded-2xl bg-amber-900/5 border border-amber-500/10 text-center">
                                            <p className="text-amber-100/60 font-serif italic text-base leading-relaxed">
                                                &quot;{msg.ai_response}&quot;
                                            </p>
                                        </div>
                                    </div>

                                    {index < isViewingArchive.length - 1 && (
                                        <div className="w-px h-8 bg-white/5 mx-auto" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>

        </main>
    );
}
