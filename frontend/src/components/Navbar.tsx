'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, GraduationCap, Image, Wallet, Sparkles, SprayCan, Moon, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth, useClerk } from '@clerk/nextjs';

const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Future Planner', path: '/planner', icon: GraduationCap },
    { name: 'Memories', path: '/memories', icon: Image },
    { name: 'Budget', path: '/budget', icon: Wallet },
    { name: 'Cycle', path: '/period-tracker', icon: Moon },

    { name: 'Skincare', path: '/skincare', icon: SprayCan },
    { name: 'The Bridge', path: '/bridge', icon: Heart },
];

export default function Navbar() {
    const pathname = usePathname();
    const { isSignedIn } = useAuth();
    const clerk = useClerk();

    const handleProtectedLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        if (path !== '/' && !isSignedIn) {
            e.preventDefault();
            clerk.openSignIn();
        }
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-110 w-[90%] max-w-md pb-2">
            <div className="flex items-center justify-around w-full gap-1 sm:gap-3 px-2 sm:px-6 py-3 sm:py-4 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 shadow-xl">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            onClick={(e) => handleProtectedLinkClick(e, item.path)}
                            className="shrink-0"
                        >
                            <div className="relative flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-300 group">
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-pill"
                                        className="absolute inset-0 bg-white/10 rounded-full"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon
                                    className={`relative z-10 w-7 h-7 sm:w-9 sm:h-9 transition-colors duration-300 ${isActive ? 'text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white'}`}
                                />
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-dot"
                                        className="absolute -bottom-1 w-1 h-1 bg-pink-500 rounded-full"
                                    />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
