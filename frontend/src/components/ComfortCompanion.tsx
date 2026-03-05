'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, XCircle, ArrowRight, Save, Book, Trash2, Volume2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '@clerk/nextjs';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'companion';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ComfortCompanion() {
    const { theme, setIsSadMode, mood } = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { getToken, userId } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Memory State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [savedChats, setSavedChats] = useState<any[]>([]);
    const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial History Load or Greeting
    useEffect(() => {
        const initSession = async () => {
            // 1. Fetch Chat History 
            try {
                const token = await getToken();
                const historyRes = await fetch(`${API_BASE_URL}/api/history/${theme.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-clerk-user-id': userId || ''
                    }
                });

                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    if (historyData && historyData.length > 0) {
                        setMessages(historyData);
                        return; // Skip greeting if history exists
                    }
                }
            } catch (e) {
                console.error("Failed to load memory:", e);
            }

            // 2. Set Greeting dynamically based on mood (Only if no history)
            let greeting = "I see sadness in your eyes. Tell me everything, I am listening.";
            const currentMood = (mood || '').toLowerCase();

            if (currentMood.includes('happy') || currentMood.includes('smile') || currentMood.includes('good')) {
                greeting = "I see a bright smile! Tell me all about your amazing day!";
            } else if (currentMood.includes('tired') || currentMood.includes('exhausted') || currentMood.includes('sleepy')) {
                greeting = "You look exhausted. Come rest here and tell me about it.";
            } else if (currentMood.includes('angry') || currentMood.includes('stressed') || currentMood.includes('mad')) {
                greeting = "Who upset you? Tell me everything, I am on your side.";
            } else if (currentMood.includes('sad') || currentMood.includes('cry')) {
                greeting = "I see sadness in your eyes. Tell me everything, I am listening.";
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
            const token = await getToken();
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-clerk-user-id': userId || ''
                },
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
                text: `I feel a disturbance in the connection... (${error instanceof Error ? error.message : String(error)})`,
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
            const token = await getToken();
            await fetch(`${API_BASE_URL}/api/chat/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-clerk-user-id': userId || ''
                },
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
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/chat/saved`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-clerk-user-id': userId || ''
                }
            });
            const data = await res.json();
            setSavedChats(data);
            setIsLibraryOpen(true);
        } catch (error) {
            console.error("Library Error:", error);
        }
    };

    const loadSavedChat = async (id: number) => {
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/chat/saved/${id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-clerk-user-id': userId || ''
                }
            });
            const data = await res.json();
            if (data.messages) {
                setMessages(data.messages);
                setIsLibraryOpen(false);
            }
        } catch (error) {
            console.error("Load Chat Error:", error);
        }
    };

    const handleClearChat = async () => {
        if (!confirm("Are you sure you want to delete all memory with this character?")) return;

        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/history/${theme.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-clerk-user-id': userId || ''
                }
            });

            if (res.ok) {
                setMessages([]);

                // Reset Greeting dynamically based on mood
                let greeting = "I see sadness in your eyes. Tell me everything, I am listening.";
                const currentMood = (mood || '').toLowerCase();

                if (currentMood.includes('happy') || currentMood.includes('smile') || currentMood.includes('good')) {
                    greeting = "I see a bright smile! Tell me all about your amazing day!";
                } else if (currentMood.includes('tired') || currentMood.includes('exhausted') || currentMood.includes('sleepy')) {
                    greeting = "You look exhausted. Come rest here and tell me about it.";
                } else if (currentMood.includes('angry') || currentMood.includes('stressed') || currentMood.includes('mad')) {
                    greeting = "Who upset you? Tell me everything, I am on your side.";
                } else if (currentMood.includes('sad') || currentMood.includes('cry')) {
                    greeting = "I see sadness in your eyes. Tell me everything, I am listening.";
                }

                setMessages([{ id: Date.now(), text: greeting, sender: 'companion' }]);
            } else {
                console.error("Failed to clear chat");
            }
        } catch (error) {
            console.error("Clear Chat Error:", error);
        }
    };

    const handlePlayAudio = (text: string, messageId: number) => {
        if (!window.speechSynthesis) {
            console.error("Web Speech API is not supported in this browser.");
            return;
        }

        // Cancel any currently playing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Voice Tuning dynamically based on character
        switch (theme.id.toLowerCase()) {
            case 'shinobu':
                utterance.pitch = 1.3;
                utterance.rate = 0.95;
                break;
            case 'anya':
                utterance.pitch = 1.7;
                utterance.rate = 1.1;
                break;
            case 'gojo':
                utterance.pitch = 0.8;
                utterance.rate = 1.0;
                break;
            case 'luffy':
                utterance.pitch = 1.1;
                utterance.rate = 1.2;
                break;
            case 'rimuru':
                utterance.pitch = 1.1;
                utterance.rate = 1.0;
                break;
            case 'rys':
                utterance.pitch = 1.3;
                utterance.rate = 1.0;
                break;
            case 'zoro':
                utterance.pitch = 0.6;
                utterance.rate = 0.95;
                break;
            case 'kuromi':
                utterance.pitch = 1.4;
                utterance.rate = 1.1;
                break;
            case 'shinchan':
                utterance.pitch = 1.6;
                utterance.rate = 1.15;
                break;
            default:
                utterance.pitch = 1.0;
                utterance.rate = 1.0;
        }

        utterance.onstart = () => setPlayingAudioId(messageId);

        // Clean up visual state when done
        utterance.onend = () => setPlayingAudioId(null);
        utterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            setPlayingAudioId(null);
        };

        window.speechSynthesis.speak(utterance);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[50] flex items-center justify-center overflow-hidden ${theme.font || 'font-sans'}`}
        >
            {/* Background Image Layer */}
            {/* Background Image Layer (Spirit Mode) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                    src={theme.characterImage || `/characters/${theme.id}.png`}
                    alt={theme.name}
                    className="w-full h-full object-cover opacity-20 filter blur-sm scale-110"
                />
                <div className="absolute inset-0 bg-black/60" /> {/* Dimmer */}
            </div>

            {/* Main Content Centered */}
            <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`w-full max-w-3xl h-[85vh] flex flex-col bg-white/10 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100`}
                >
                    {/* Profile Header */}
                    <div className={`p-4 md:p-6 border-b border-white/10 flex items-center justify-between bg-black/20`}>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                                    <img
                                        src={theme.characterImage || `/characters/${theme.id}.png`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black ${isTyping ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white tracking-wide">{theme.name}</h3>
                                <p className="text-xs text-white/50 font-medium uppercase tracking-wider">{isTyping ? 'Typing...' : 'Here for you'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearChat}
                                title="Clear History"
                                className="p-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/10"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button
                                onClick={handleOpenSave}
                                title="Save this Memory"
                                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
                            >
                                <Save size={18} />
                            </button>
                            <button
                                onClick={handleOpenLibrary}
                                title="Open Memory Library"
                                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
                            >
                                <Book size={18} />
                            </button>
                            <button
                                onClick={handleExit}
                                className={`group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-white/70 hover:text-white transition-all`}
                            >
                                <span className="hidden md:inline">I feel better</span>
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
                                    <div className="hidden md:flex w-8 h-8 rounded-full border border-white/10 mr-3 mt-1 overflow-hidden flex-shrink-0 bg-white/5 items-center justify-center">
                                        <img src={theme.characterImage || `/characters/${theme.id}.png`} className="w-full h-full object-cover" alt="Avi" />
                                    </div>
                                )}
                                <div
                                    className={`relative max-w-[85%] p-4 md:p-5 rounded-2xl text-lg md:text-xl leading-relaxed shadow-lg ${msg.sender === 'user'
                                        ? `bg-indigo-600 text-white font-medium rounded-tr-none ml-12 shadow-indigo-500/20`
                                        : `bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-tl-none mr-4 md:mr-12`
                                        }`}
                                >
                                    {msg.text}

                                    {msg.sender === 'companion' && (
                                        <button
                                            onClick={() => handlePlayAudio(msg.text, msg.id)}
                                            disabled={playingAudioId === msg.id}
                                            className="absolute -right-8 bottom-1 p-2 rounded-full bg-white/5 hover:bg-white/20 transition-colors text-white/50 hover:text-white disabled:opacity-50"
                                            title="Play Voice"
                                        >
                                            {playingAudioId === msg.id ? (
                                                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Volume2 size={16} />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {isTyping && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-start items-end"
                            >
                                <div className={`bg-white/5 px-6 py-4 rounded-3xl rounded-tl-none flex gap-1.5 shadow-md border border-white/10 text-white/70`}>
                                    <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className={`p-3 pb-28 md:p-6 flex-shrink-0 border-t border-white/10 bg-black/40`}>
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
                                className={`w-full min-h-[60px] max-h-[120px] bg-white/5 text-white placeholder:text-white/30 border border-white/10 rounded-2xl pl-4 md:pl-6 pr-14 md:pr-16 py-3 md:py-4 focus:outline-none focus:border-white/30 transition-all resize-none shadow-inner text-base`}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim()}
                                className={`absolute bottom-3 right-3 p-3 rounded-xl transition-all ${inputValue.trim()
                                    ? 'hover:scale-110 shadow-lg bg-indigo-600 text-white'
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                                    }`}
                            >
                                <Send size={20} />
                            </button>
                        </div>
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

        </motion.div >
    );
}
