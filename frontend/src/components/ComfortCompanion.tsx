'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, XCircle, ArrowRight, Save, Book, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'companion';
}

export default function ComfortCompanion() {
    const { theme, setIsSadMode } = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Memory State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [savedChats, setSavedChats] = useState<any[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial History Load or Greeting
    useEffect(() => {
        const initSession = async () => {
            // 1. Reset Backend Memory on Entry
            try {
                await fetch('https://our-backend-api.onrender.com/api/chat/reset', { method: 'DELETE' });
            } catch (e) {
                console.error("Failed to reset memory:", e);
            }

            // 2. Set Greeting
            let greeting = "I am here for you.";
            switch (theme.name) {
                case 'Shinobu Kocho': // Updated name check
                case 'Shinobu':
                    greeting = "I see sadness in your eyes. Tell me everything, I am listening.";
                    break;
                case 'Anya Forger':
                case 'Anya':
                    greeting = "Don't cry! Anya is here! Do you want peanuts? Tell me who was mean!";
                    break;
                case 'Monkey D. Luffy':
                case 'Luffy':
                    greeting = "Who made you cry?! I'm gonna beat them up! You're my Nakama!";
                    break;
                case 'Rys & Fenrys':
                case 'Rys':
                    greeting = "My love, why do you weep? Let me hold you until the storm passes.";
                    break;
                case 'Rimuru Tempest':
                case 'Rimuru':
                    greeting = "It sounds like you've had a tough time. I'm here. Everything will be okay.";
                    break;
                case 'Satoru Gojo':
                    greeting = "Don't worry, I'm the strongest. Welcome home.";
                    break;
                default:
                    greeting = theme.greeting || "I am here for you.";
            }
            setMessages([{ id: Date.now(), text: greeting, sender: 'companion' }]);
        };

        initSession();

        // Check for pre-filled prompt
        const prompt = searchParams.get('prompt');
        if (prompt) {
            setInputValue(prompt);
        }
    }, [theme.id, searchParams]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const newUserMsg: Message = { id: Date.now(), text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');
        setIsTyping(true);

        // Character Response via Gemini API
        setIsTyping(true);

        try {
            const response = await fetch('https://our-backend-api.onrender.com/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: inputValue,
                    characterId: theme.id
                })
            });

            const data = await response.json();
            const aiText = data.response || "I am having trouble hearing you right now...";

            const newAiMsg: Message = { id: Date.now() + 1, text: aiText, sender: 'companion' };
            setMessages(prev => [...prev, newAiMsg]);
        } catch (error) {
            console.error("Chat Error:", error);
            // Fallback
            const fallbackMsg: Message = {
                id: Date.now() + 1,
                text: "I feel a disturbance in the connection... but I am still here with you.",
                sender: 'companion'
            };
            setMessages(prev => [...prev, fallbackMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleExit = () => {
        setIsSadMode(false);
        router.push('/');
    };

    const handleOpenSave = () => {
        setSaveTitle(`Memory on ${new Date().toLocaleDateString()}`);
        setIsSaveModalOpen(true);
    };

    const handleConfirmSave = async () => {
        try {
            await fetch('https://our-backend-api.onrender.com/api/chat/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: saveTitle,
                    messages: messages
                })
            });
            setIsSaveModalOpen(false);
            // Optional: Success toast
        } catch (error) {
            console.error("Save Error:", error);
        }
    };

    const handleOpenLibrary = async () => {
        try {
            const res = await fetch('https://our-backend-api.onrender.com/api/chat/saved');
            const data = await res.json();
            setSavedChats(data);
            setIsLibraryOpen(true);
        } catch (error) {
            console.error("Library Error:", error);
        }
    };

    const loadSavedChat = async (id: number) => {
        try {
            const res = await fetch(`https://our-backend-api.onrender.com/api/chat/saved/${id}`);
            const data = await res.json();
            if (data.messages) {
                setMessages(data.messages);
                setIsLibraryOpen(false);
            }
        } catch (error) {
            console.error("Load Chat Error:", error);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[50] flex items-center justify-center overflow-hidden ${theme.font || 'font-sans'}`}
        >
            {/* Background Image Layer */}
            {theme.bgImage ? (
                <div className="absolute inset-0 z-0">
                    <img src={theme.bgImage} alt="Background" className="w-full h-full object-cover opacity-50 blur-sm scale-110" />
                    <div
                        className={`absolute inset-0 bg-gradient-to-r to-black/60`}
                        style={{ '--tw-gradient-from': theme.colors.primary, '--tw-gradient-stops': 'var(--tw-gradient-from), var(--tw-gradient-to)' } as React.CSSProperties}
                    // Fallback using raw style if tailwind VARs are tricky in this context
                    />
                    <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(to right, ${theme.colors.primary}, rgba(0,0,0,0.6))` }}
                    />
                </div>
            ) : (
                <div className={`absolute inset-0 z-0 ${theme.colors.backgroundClass}`} />
            )}

            {/* Main Content Grid */}
            <div className="relative z-10 w-full max-w-7xl h-screen p-6 md:p-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">

                {/* LEFT COLUMN: Character Avatar */}
                <div className="hidden md:flex md:col-span-5 h-[80vh] flex-col items-center justify-end relative">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="relative w-full h-full flex items-end justify-center"
                    >
                        {/* Character Image Placeholder - In real app, this would be a high-res transparent PNG */}
                        {/* Using dynamically constructed path based on theme.id */}
                        <div
                            className={`relative w-full h-[80%] bg-white/10 rounded-t-full backdrop-blur-sm border-x border-t border-white/30 flex items-end justify-center overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]`}
                            style={{ borderColor: `${theme.colors.accent}40`, backgroundColor: `${theme.colors.accent}10` }}
                        >
                            <img
                                src={`/characters/${theme.id}.png`}
                                alt={theme.name}
                                className="w-full h-full object-cover opacity-80 mix-blend-overlay"
                                onError={(e) => {
                                    e.currentTarget.src = '/characters/shinobu.png'; // One-time fallback
                                    e.currentTarget.onerror = null; // Prevent loop
                                }}
                            />
                            <div className="absolute bottom-12 text-center p-6 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 mx-6">
                                <h2 className={`text-4xl font-bold ${theme.colors.textClass} mb-2`}>{theme.name}</h2>
                                <p className={`text-lg opacity-80 ${theme.colors.textClass}`}>&quot;I am here for you.&quot;</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT/CENTER COLUMN: Chat Interface */}
                <div className="col-span-1 md:col-span-7 h-full max-h-[85vh] flex flex-col justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className={`w-full h-full md:h-[80vh] flex flex-col bg-white/90 border border-white/20 rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-800`}
                    >
                        {/* Header */}
                        <div className={`p-6 border-b border-black/5 flex items-center justify-between bg-white/5`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${isTyping ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                                <span className={`text-sm opacity-70 font-medium text-slate-700`}>{isTyping ? 'Typing...' : 'Online'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleOpenSave}
                                    title="Save this Memory"
                                    className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                >
                                    <Save size={18} />
                                </button>
                                <button
                                    onClick={handleOpenLibrary}
                                    title="Open Memory Library"
                                    className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                >
                                    <Book size={18} />
                                </button>
                                <button
                                    onClick={handleExit}
                                    className={`group flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 hover:scale-105 transition-all border border-slate-200 text-sm font-medium text-slate-700`}
                                >
                                    <span>I feel a little better now</span>
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide"
                        >
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.sender === 'companion' && (
                                        <div className={`w-8 h-8 rounded-full border border-slate-300 mr-3 mt-1 overflow-hidden flex-shrink-0 bg-slate-200 flex items-center justify-center`}>
                                            <span className={`text-xs font-bold text-slate-700`}>{theme.name[0]}</span>
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[85%] p-5 rounded-3xl text-lg md:text-xl leading-relaxed shadow-sm ${msg.sender === 'user'
                                            ? `bg-purple-600 text-white font-medium rounded-tr-none ml-12`
                                            : `bg-white shadow-md text-slate-800 border border-slate-100 rounded-tl-none mr-12`
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}

                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start items-end"
                                >
                                    <div className={`w-8 h-8 rounded-full border border-slate-300 mr-3 overflow-hidden flex-shrink-0 bg-slate-200 flex items-center justify-center`}>
                                        <span className={`text-xs font-bold text-slate-700`}>{theme.name[0]}</span>
                                    </div>
                                    <div className={`bg-white px-6 py-4 rounded-3xl rounded-tl-none flex gap-1.5 shadow-md border border-slate-100 text-slate-800`}>
                                        <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className={`p-6 border-t ${theme.colors.borderClass} bg-black/20`}>
                            <div className="relative">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Pour your heart out here..."
                                    className={`w-full min-h-[60px] max-h-[120px] bg-slate-100 text-slate-900 placeholder:text-slate-500 border-2 border-slate-200 rounded-2xl pl-6 pr-16 py-4 focus:outline-none focus:border-purple-500 transition-all resize-none shadow-inner`}
                                    style={{ '--tw-ring-color': theme.colors.accent } as React.CSSProperties}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim()}
                                    className={`absolute bottom-3 right-3 p-3 rounded-xl transition-all ${inputValue.trim()
                                        ? 'hover:scale-110 shadow-lg bg-purple-600 text-white'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                            <p className="text-center text-xs opacity-40 mt-3 text-white">Press Enter to share</p>
                        </div>
                    </motion.div>
                </div>

                {/* MODALS */}
                <AnimatePresence>
                    {isSaveModalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        >
                            <div className="bg-white p-6 rounded-3xl w-full max-w-sm m-4 shadow-2xl">
                                <h3 className="text-xl font-bold text-slate-800 mb-4">Name this Memory</h3>
                                <input
                                    autoFocus
                                    type="text"
                                    value={saveTitle}
                                    onChange={(e) => setSaveTitle(e.target.value)}
                                    className="w-full p-3 bg-slate-100 rounded-xl mb-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setIsSaveModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmSave}
                                        className="px-6 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-medium"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {isLibraryOpen && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        >
                            <div className="bg-white p-6 rounded-3xl w-full max-w-md m-4 shadow-2xl max-h-[80vh] flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-800">Memory Library</h3>
                                    <button onClick={() => setIsLibraryOpen(false)} className="text-slate-400 hover:text-slate-600">
                                        <XCircle size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                    {savedChats.length === 0 ? (
                                        <p className="text-center text-slate-400 py-8">No saved memories yet.</p>
                                    ) : (
                                        savedChats.map((chat) => (
                                            <button
                                                key={chat.id}
                                                onClick={() => loadSavedChat(chat.id)}
                                                className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-100 transition-colors group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="font-medium text-slate-800 group-hover:text-purple-700">{chat.title}</span>
                                                    <span className="text-xs text-slate-400">{chat.date}</span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </motion.div>
    );
}
