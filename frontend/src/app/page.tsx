'use client';
export const dynamic = 'force-dynamic';


import Link from 'next/link';
import { Image, Wallet, GraduationCap, SprayCan, Settings, MessageCircle, Moon, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import GrandEntrance from '../components/GrandEntrance';
import SettingsModal from '../components/SettingsModal';
import LiveAvatar from '../components/LiveAvatar';
import Sidekick from '../components/Sidekick';
import { useTheme } from '../context/ThemeContext';
import { useUserProfile } from '../context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useClerk } from '@clerk/nextjs';

const MotionLink = motion.create(Link);

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focusedCard, setFocusedCard] = useState<string | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const { theme } = useTheme();
  const { profile, isLoading } = useUserProfile();
  const { isSignedIn, isLoaded } = useAuth();
  const clerk = useClerk();

  // Trigger Sign-in when entry animation finishes if the user is not authenticated
  useEffect(() => {
    if (hasEntered && isLoaded && !isSignedIn) {
      clerk.openSignIn();
    }
  }, [hasEntered, isLoaded, isSignedIn, clerk]);

  // Intercept settings click
  const handleSettingsClick = () => {
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }
    setIsSettingsOpen(true);
  };

  // Intercept protected link clicks
  const handleProtectedLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!isSignedIn) {
      e.preventDefault();
      clerk.openSignIn();
    }
  };

  return (
    <main
      className={`min-h-dvh flex flex-col items-center justify-center aurora-bg ${theme.colors.textClass} px-4 pb-44 md:p-6 md:pb-48 transition-colors duration-700`}
      style={{
        '--theme-color': theme.colors.accent,
      } as React.CSSProperties}
    >

      <GrandEntrance onEnterComplete={() => setHasEntered(true)} />

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
          onClick={handleSettingsClick}
          className={`p-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors text-gray-800 dark:text-white`}
        >
          <Settings size={32} />
        </button>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="w-full max-w-md mb-12 z-10 relative flex flex-col items-center">
        {(!isLoaded || (isSignedIn && isLoading)) ? (
          <>
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full mb-6 bg-white/10 animate-pulse shadow-2xl shadow-white/10" />
            <div className="w-full text-center md:text-left px-4 md:pl-6 flex flex-col items-center md:items-start space-y-3">
              <div className="h-10 md:h-12 w-3/4 bg-white/10 rounded-lg animate-pulse" />
              <div className="h-6 md:h-6 w-1/2 bg-white/5 rounded-md animate-pulse" />
            </div>
          </>
        ) : (
          <>
            <div className="relative group">
              <LiveAvatar
                size="w-24 h-24 md:w-32 md:h-32"
                className="mb-6 shadow-2xl shadow-white/10"
                isPointing={!!focusedCard}
              />

              {/* Speech Bubble */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -right-4 md:-right-24 -top-8 md:-top-4 bg-white text-slate-900 px-2 py-1 md:px-3 md:py-2 rounded-xl rounded-bl-none text-[10px] md:text-xs font-medium shadow-lg pointer-events-none"
              >
                Welcome back, {profile?.display_name || 'Traveler'}!
              </motion.div>
            </div>
            <div className="w-full text-center md:text-left px-4 md:pl-6">
              <h1
                className="text-3xl md:text-5xl font-light mb-3 drop-shadow-lg transition-colors duration-500 text-gray-900 dark:text-white pt-4 pb-4 md:py-4"
                style={{
                  fontFamily: theme?.font
                }}
              >
                {theme?.id === 'default' ? 'The Royal Dominion' : theme?.name}
              </h1>
              <p className={`text-base md:text-lg opacity-80 text-gray-700 dark:text-gray-300 font-light tracking-wider`}>
                {theme?.greeting ? theme.greeting.replace(/My Queen|My Lady|Princess Raksha/gi, profile?.display_name || 'Traveler') : `Welcome Home, ${profile?.display_name || 'Traveler'}`}
              </p>
            </div>
          </>
        )}
      </div>

      {hasEntered && (
        <Sidekick
          className="z-0!"
          image={theme.sidekickImage || theme.characterImage}
          themeId={theme.id}
        />
      )}

      <div className="flex flex-col space-y-6 w-full max-w-md mx-auto z-10 px-4">
        {isLoading ? (
          // Skeleton loaders for navigation cards
          Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl min-h-[180px] w-full bg-white/5 border border-white/10 animate-pulse flex flex-col justify-end"
            >
              <div className="w-16 h-16 bg-white/10 rounded-xl mb-3" />
              <div className="h-6 w-1/2 bg-white/10 rounded-md mb-2" />
              <div className="h-4 w-3/4 bg-white/5 rounded-md" />
            </div>
          ))
        ) : (
          [
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
            <MotionLink
              key={item.name}
              href={item.href}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => handleProtectedLinkClick(e, item.href)}
              onMouseEnter={() => setFocusedCard(item.name)}
              onMouseLeave={() => setFocusedCard(null)}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className={`
                group relative overflow-hidden
                p-6 rounded-2xl
                transition-all duration-300
                min-h-[180px] w-full
                bg-white/60 dark:bg-white/5
                backdrop-blur-lg dark:backdrop-blur-xl
                border border-white/40 dark:border-white/10
                shadow-xl shadow-indigo-100/50 dark:shadow-2xl dark:shadow-black/50
                hover:border-(--glow-color) hover:shadow-[0_0_20px_var(--glow-alpha)]
              `}
              style={{
                '--glow-color': theme.colors.accent,
                '--glow-alpha': `${theme.colors.accent}40`, // 25% opacity
              } as React.CSSProperties}
            >
              <div
                className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-gray-800 dark:text-white/80`}
                style={{ color: theme.id === 'default' ? undefined : theme.colors.primary }}
              >
                <item.icon size={64} />
              </div>

              <div className="relative z-10">
                <div
                  className={`mb-3 p-3 rounded-xl bg-white/5 w-fit group-hover:bg-white/10 transition-colors text-gray-800 dark:text-white/80`}
                  style={{ color: theme.id === 'default' ? undefined : theme.colors.primary }}
                >
                  <item.icon size={40} />
                </div>
                <h3
                  className="text-xl md:text-2xl font-bold mb-1 text-gray-900 dark:text-gray-100"
                >
                  {item.name}
                </h3>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                  {item.desc}
                </p>
              </div>
            </MotionLink>
          ))
        )}
      </div>

    </main>
  );
}