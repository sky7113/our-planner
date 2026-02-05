'use client';

import Link from 'next/link';
import { Image, Wallet, GraduationCap, SprayCan, Settings, MessageCircle, Moon, Heart } from 'lucide-react';
import { useState } from 'react';
import GrandEntrance from '../components/GrandEntrance';
import SettingsModal from '../components/SettingsModal';
import LiveAvatar from '../components/LiveAvatar';
import Sidekick from '../components/Sidekick';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focusedCard, setFocusedCard] = useState<string | null>(null);
  const { theme } = useTheme();

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center ${theme.colors.backgroundClass} ${theme.colors.textClass} p-6 pb-32 transition-colors duration-700`}>

      <GrandEntrance />

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: theme.colors.secondary }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: theme.colors.accent }}
        />
      </div>

      <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className={`p-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors ${theme.colors.textClass}`}
        >
          <Settings size={20} />
        </button>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="w-full max-w-md text-center mb-12 z-10 relative">
        <div className="relative inline-block group">
          <LiveAvatar
            size="w-24 h-24"
            className="mx-auto mb-6 shadow-2xl shadow-white/10"
            isPointing={!!focusedCard}
          />

          {/* Speech Bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute -right-24 top-0 bg-white text-slate-900 px-3 py-2 rounded-xl rounded-bl-none text-xs font-medium shadow-lg pointer-events-none"
          >
            Welcome back, My Lady!
          </motion.div>
        </div>
        <h1
          className="text-5xl font-light mb-3 drop-shadow-lg transition-colors duration-500"
          style={{
            fontFamily: theme?.font,
            color: theme?.colors?.secondary
          }}
        >
          {theme?.id === 'default' ? 'The Royal Dominion' : theme?.name}
        </h1>
        <p className={`text-lg opacity-80 ${theme?.colors?.textClass} font-light tracking-wider`}>
          {theme?.greeting || "Welcome Home, My Queen"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl z-10">
        {[
          {
            name: theme?.labels?.companion || `${(theme?.id || 'royal').charAt(0).toUpperCase() + (theme?.id || 'royal').slice(1)} Companion`,
            icon: MessageCircle,
            href: '/comfort-room',
            desc: theme?.labels?.companion ? 'Your Faithful Servant' : 'Share your thoughts, happy or sad.'
          },
          { name: theme?.labels?.treasury || 'Treasury', icon: Wallet, href: '/budget', desc: 'Royal Finances' },
          { name: theme?.labels?.knowledge || 'Knowledge', icon: GraduationCap, href: '/planner', desc: 'Academic Strategy & Life Planning' },
          { name: theme?.labels?.memories || 'Memories', icon: Image, href: '/memories', desc: 'Cherished Moments' },
          { name: 'Skincare', icon: SprayCan, href: '/skincare', desc: 'Royal Glow' },
          { name: 'Moon Cycle', icon: Moon, href: '/period-tracker', desc: 'Track your cycle & health' },
          { name: 'The Bridge', icon: Heart, href: '/bridge', desc: 'When words fail us, meet me here.' },
        ].map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onMouseEnter={() => setFocusedCard(item.name)}
            onMouseLeave={() => setFocusedCard(null)}
            className={`group relative overflow-hidden backdrop-blur-md bg-white/5 border p-6 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]`}
            style={{
              boxShadow: `0 0 20px ${theme?.colors?.accent}20`,
              borderColor: theme?.colors?.secondary
            }}
          >
            <div
              className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}
              style={{ color: theme?.colors?.primary }}
            >
              <item.icon size={64} />
            </div>

            <div className="relative z-10">
              <div
                className={`mb-3 p-3 rounded-xl bg-white/5 w-fit group-hover:bg-white/10 transition-colors`}
                style={{ color: theme?.colors?.primary }}
              >
                <item.icon size={24} />
              </div>
              <h3
                className="text-xl font-bold mb-1 text-white"
              >
                {item.name}
              </h3>
              <p className="text-sm text-gray-300">
                {item.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <Sidekick
        className="!z-0"
        image={theme.sidekickImage || theme.characterImage}
        themeId={theme.id}
      />
    </main>
  );
}