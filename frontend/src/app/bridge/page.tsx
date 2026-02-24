'use client';
export const dynamic = 'force-dynamic';


import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useUserProfile } from '../../context/UserContext';
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
    const { profile } = useUserProfile();
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
    const [particles, setParticles] = useState<any[]>([]); // New state for particles

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

    // Generate particles on client-side only to fix hydration mismatch
    useEffect(() => {
        const newParticles = Array.from({ length: 20 }).map(() => ({
            id: Math.random(),
            initialX: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            initialY: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            opacity: Math.random() * 0.5 + 0.1,
            scale: Math.random() * 0.5 + 0.5,
            duration: Math.random() * 5 + 5,
            moveY: Math.random() * -20,
            finalOpacity: Math.random() * 0.3 + 0.1,
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1
        }));
        setParticles(newParticles);
    }, []);

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

    const amberName = profile?.partner_nickname || 'Amber';
    const rakshaName = profile?.display_name || 'Raksha';

    return (
        <main className={`min-h-screen ${theme.colors.backgroundClass} text-white relative overflow-hidden flex flex-col transition-colors duration-700 pb-32`}>

            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/40 to-transparent opacity-50" />
                {[...particles].map((p, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-white rounded-full"
                        initial={{
                            x: p.initialX,
                            y: p.initialY,
                            opacity: p.opacity,
                            scale: p.scale
                        }}
                        animate={{
                            y: [null, p.moveY],
                            opacity: [null, p.finalOpacity]
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut"
                        }}
                        style={{ width: p.width, height: p.height }}
                    />
                ))}
            </div>

            {/* Header / Identity Toggle */}
            {/* Header / Identity Toggle */}
            <div className="w-full py-4 px-4 backdrop-blur-xl bg-black/30 border-b border-white/5 z-20 flex flex-col items-center sticky top-0">
                <span className="text-3xl md:text-4xl font-light tracking-[0.2em] text-indigo-100 text-center mb-4 pt-2">
                    THE BRIDGE
                </span>

                <div className="w-full max-w-2xl flex justify-between items-center relative">
                    {/* Ghost Divider for centering */}
                    <div className="w-20" />

                    <div className="flex bg-black/40 p-1.5 rounded-full border border-white/10 shadow-inner">
                        <button
                            onClick={() => setCurrentUser('Amber')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${currentUser === 'Amber'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            {amberName}
                        </button>
                        <button
                            onClick={() => setCurrentUser('Raksha')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${currentUser === 'Raksha'
                                ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/50'
                                : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            {rakshaName}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenSave}
                            className="p-3 text-white/50 hover:text-indigo-300 transition-colors bg-white/5 rounded-full hover:bg-white/10"
                            title="Archive Resolution"
                        >
                            <Save size={20} />
                        </button>
                        <button
                            onClick={handleOpenArchive}
                            className="p-3 text-white/50 hover:text-indigo-300 transition-colors bg-white/5 rounded-full hover:bg-white/10"
                            title="View Past Resolutions"
                        >
                            <Book size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-32">
                <div className="max-w-2xl mx-auto w-full space-y-8">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-white/30 text-center space-y-6 mt-20">
                            <Sparkles size={96} className="text-indigo-300/50 animate-pulse stroke-1" />
                            <p className="font-light text-xl max-w-md leading-relaxed text-indigo-100/80">
                                The Bridge is open. Speak your heart, and let wisdom guide you back to each other.
                            </p>
                            <span className="text-xs bg-white/5 px-4 py-1.5 rounded-full uppercase tracking-widest text-indigo-300/50 border border-white/5">
                                Session Auto-Reset Active
                            </span>
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
                                        {msg.sender === 'Amber' ? amberName : rakshaName}
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
            </div>

            {/* Input Area */}
            <div className="p-4 pb-8 md:p-6 md:pb-10 z-20 bg-black/60 backdrop-blur-xl border-t border-white/5">
                <div className="max-w-2xl mx-auto relative group">
                    <div className={`absolute -inset-0.5 rounded-3xl blur opacity-20 transition duration-500 group-hover:opacity-50 ${currentUser === 'Amber' ? 'bg-blue-600' : 'bg-pink-600'
                        }`} />
                    <div className="relative flex items-center bg-slate-900 rounded-3xl border border-white/10 p-2 pl-6 h-20 shadow-2xl">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={`Tell the Mediator how you feel, ${currentUser === 'Amber' ? amberName : rakshaName}...`}
                            className="flex-1 bg-transparent border-none focus:outline-none text-white text-lg placeholder-white/30 h-full"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading}
                            className={`h-14 w-14 flex items-center justify-center rounded-2xl transition-all ml-2 ${isLoading ? 'bg-white/5 cursor-wait' :
                                currentUser === 'Amber' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                                }`}
                        >
                            <Send size={28} />
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
                                                {msg.sender === 'Amber' ? amberName : rakshaName}
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
