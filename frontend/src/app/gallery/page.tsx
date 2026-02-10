'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Home, Image as ImageIcon, Book, Settings, Plus, Trash2, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Album {
    id: number;
    name: string;
    cover: string | null;
    createdAt?: string;
}

export default function GalleryPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Albums on Mount
    useEffect(() => {
        fetchAlbums();
    }, []);

    const fetchAlbums = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/albums`);
            setAlbums(res.data);
        } catch (error) {
            console.error("Error fetching albums:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAlbum = async (albumName: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent navigation if we add click-to-view later

        if (!confirm(`Are you sure you want to delete album "${albumName}"?`)) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/albums/${albumName}`);

            // Update UI immediately
            setAlbums(prev => prev.filter(a => a.name !== albumName));
        } catch (error) {
            console.error("Failed to delete album:", error);
            alert("Failed to delete album. Please try again.");
        }
    };

    return (
        <div className="min-h-screen pb-24 relative overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-pink-500/30">

            {/* Background */}
            <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--theme-color),_transparent_70%)]" />

            {/* Header */}
            <header className="sticky top-0 z-50 pt-12 pb-4 px-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                            <ImageIcon size={24} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-primary)]">
                            Album Collection
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-6 relative z-10">

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    </div>
                ) : albums.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <p>No albums found.</p>
                    </div>
                ) : (
                    /* Album Grid */
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {albums.map((album) => (
                            <div
                                key={album.id}
                                className="relative group rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 ease-out"
                            >
                                {/* Delete Button */}
                                <button
                                    onClick={(e) => handleDeleteAlbum(album.name, e)}
                                    className="absolute top-3 right-3 z-20 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg transform scale-90 hover:scale-100"
                                    title="Delete Album"
                                >
                                    <Trash2 size={16} />
                                </button>

                                {/* Cover Image */}
                                <div className="relative aspect-[4/3] w-full bg-slate-900/50">
                                    {album.cover ? (
                                        <Image
                                            src={album.cover.startsWith('http') ? album.cover : `${API_BASE_URL}/${album.cover.replace(/^\//, '')}`}
                                            alt={album.name}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-600">
                                            <Folder size={48} />
                                        </div>
                                    )}

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none" />
                                </div>

                                {/* Text Content */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
                                    <p className="text-white font-bold text-lg leading-tight drop-shadow-md truncate">{album.name}</p>
                                    <p className="text-white/60 text-xs mt-1">
                                        {album.createdAt ? new Date(album.createdAt).toLocaleDateString() : 'Unknown date'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Navigation (Sticky Bottom) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
                <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between text-[10px] font-medium text-slate-400">
                    <Link href="/" className="flex flex-col items-center gap-1 hover:text-white transition-colors">
                        <Home size={24} strokeWidth={1.5} />
                        <span>Home</span>
                    </Link>
                    <Link href="/gallery" className="flex flex-col items-center gap-1 text-pink-400">
                        <Folder size={24} strokeWidth={2.5} />
                        <span className="font-bold">Albums</span>
                    </Link>
                    <Link href="/memories" className="flex flex-col items-center gap-1 hover:text-white transition-colors">
                        <ImageIcon size={24} strokeWidth={1.5} />
                        <span>Memories</span>
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
