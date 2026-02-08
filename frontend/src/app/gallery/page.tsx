'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Home, Image as ImageIcon, Book, Settings, Plus } from 'lucide-react';

// Placeholder data - in a real app this would come from a CMS or DB
const memories = [
    {
        id: 1,
        title: 'Paris, Oct 2023',
        subtitle: 'Our favorite sunset',
        src: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', // Paris
        aspectRatio: 'aspect-[3/4]',
    },
    {
        id: 2,
        title: 'Picnic Day',
        subtitle: 'Sunday bliss',
        src: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80', // Picnic
        aspectRatio: 'aspect-[4/3]',
    },
    {
        id: 3,
        title: 'First Date',
        subtitle: 'Where it all began',
        src: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80', // Couple holding hands/flowers
        aspectRatio: 'aspect-[3/4]',
    },
    {
        id: 4,
        title: 'Beach Bonfire',
        subtitle: 'Under the stars',
        src: 'https://images.unsplash.com/photo-1533230408806-646cb0595304?auto=format&fit=crop&w=800&q=80', // Bonfire
        aspectRatio: 'aspect-[3/4]',
    },
    {
        id: 5,
        title: 'Anniversary',
        subtitle: 'Sweet celebration',
        src: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80', // Cake/Wedding
        aspectRatio: 'aspect-[4/3]',
    },
    {
        id: 6,
        title: 'Hiking Trip',
        subtitle: 'Conquering peaks',
        src: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80', // Hiking
        aspectRatio: 'aspect-[3/4]',
    },
];

const categories = ['All Memories', 'Anniversary', 'Trips', 'Dates', 'Summer \'23'];

export default function GalleryPage() {
    const [activeCategory, setActiveCategory] = useState('All Memories');

    return (
        <div className="min-h-screen pb-24 relative overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-pink-500/30">

            {/* Background provided by globals.css .aurora-bg, but let's add a local one just in case or overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--theme-color),_transparent_70%)]" />

            {/* Header */}
            <header className="sticky top-0 z-50 pt-12 pb-4 px-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                            <ImageIcon size={24} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-primary)]">
                            Our Cherished Moments
                        </h1>
                    </div>
                    <button className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-full transition-all shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95 group">
                        <Plus size={24} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-6 relative z-10">
                {/* Categories */}
                <div className="flex overflow-x-auto gap-3 pb-8 no-scrollbar mask-gradient-right">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeCategory === cat
                                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25 scale-105'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Masonry Grid */}
                <div className="columns-2 md:columns-3 gap-6 space-y-6">
                    {memories.map((memory) => (
                        <div
                            key={memory.id}
                            className="relative group break-inside-avoid rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-xl cursor-pointer hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 ease-out"
                        >
                            <div className={`relative w-full ${memory.aspectRatio}`}>
                                <Image
                                    src={memory.src}
                                    alt={memory.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    sizes="(max-width: 768px) 50vw, 33vw"
                                />
                            </div>

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

                            {/* Heart Icon Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                                <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 text-pink-400 drop-shadow-[0_0_15px_rgba(244,114,182,0.6)]">
                                    <Heart size={32} fill="currentColor" />
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                <p className="text-white font-bold text-lg leading-tight drop-shadow-md">{memory.title}</p>
                                <p className="text-white/70 text-xs font-medium uppercase tracking-wider mt-1">{memory.subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Navigation (Sticky Bottom) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
                <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between text-[10px] font-medium text-slate-400">
                    <Link href="/" className="flex flex-col items-center gap-1 hover:text-white transition-colors">
                        <Home size={24} strokeWidth={1.5} />
                        <span>Home</span>
                    </Link>
                    <Link href="/gallery" className="flex flex-col items-center gap-1 text-pink-400">
                        <ImageIcon size={24} strokeWidth={2.5} />
                        <span className="font-bold">Gallery</span>
                    </Link>
                    <Link href="/journal" className="flex flex-col items-center gap-1 hover:text-white transition-colors">
                        <Book size={24} strokeWidth={1.5} />
                        <span>Journal</span>
                    </Link>
                    <Link href="/settings" className="flex flex-col items-center gap-1 hover:text-white transition-colors">
                        <Settings size={24} strokeWidth={1.5} />
                        <span>Settings</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
