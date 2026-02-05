'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, GraduationCap, Image, Wallet, Sparkles, SprayCan, Moon, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

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

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-black/30 backdrop-blur-md border border-white/10 shadow-2xl">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link key={item.path} href={item.path}>
                            <div className="relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 group">
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-pill"
                                        className="absolute inset-0 bg-white/10 rounded-full"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon
                                    size={20}
                                    className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-pink-400' : 'text-slate-400 group-hover:text-slate-200'}`}
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
