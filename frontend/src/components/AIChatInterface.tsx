"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatProps {
  partnerName?: string;
  gender?: string;
}

export default function AIChatInterface({ partnerName, gender }: ChatProps) {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // Optimistic UI update
    setChatLog((prev) => [...prev, { role: "user", text: message }]);
    setIsThinking(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message: message,
          partner_name: partnerName,
          gender: gender,
        }),
      });

      if (!response.ok) throw new Error("Failed to reach the Mansion's servers.");

      const data = await response.json();
      
      // Strict state sync
      setChatLog((prev) => [...prev, { role: "ai", text: data.message }]);
    } catch (error) {
      setChatLog((prev) => [
        ...prev,
        { role: "ai", text: "The connection to the local realm was disrupted. Let us try again. 🦋" },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 relative">
      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-24">
        <AnimatePresence>
          {chatLog.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl max-w-[80%] ${
                msg.role === "user"
                  ? "ml-auto bg-pink-600/20 border border-pink-500/30 text-white"
                  : "mr-auto bg-indigo-900/40 border border-indigo-500/30 text-purple-100 backdrop-blur-md"
              }`}
            >
              {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Loading State (No Z-Index Wars) */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[40] flex items-center gap-3 px-6 py-3 bg-slate-900/80 border border-pink-500/50 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.3)] backdrop-blur-xl"
          >
            <motion.span
              animate={{ 
                rotate: [0, -10, 10, 0],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-pink-400 text-xl"
            >
              🦋
            </motion.span>
            <span className="text-sm font-medium text-pink-200 tracking-wider">
              Shinobu is thinking...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-white/10 rounded-2xl p-2 flex items-center backdrop-blur-lg z-[50]">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Speak with the Celestial Mediator..."
          disabled={isThinking}
          className="flex-1 bg-transparent border-none text-white px-4 focus:ring-0 outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSendMessage}
          disabled={isThinking || !message.trim()}
          className="p-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-pink-600 shadow-lg shadow-pink-500/20"
        >
          Send
        </button>
      </div>
    </div>
  );
}
