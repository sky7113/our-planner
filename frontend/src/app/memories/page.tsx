'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Home, Image as ImageIcon, Book, Settings, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function MemoriesPage() {
    const [activeCategory, setActiveCategory] = useState('All Memories');
    const [albums, setAlbums] = useState<string[]>(['All Memories']);
    const [localMemories, setLocalMemories] = useState<any[]>([]);
    const [selectedAlbumForUpload, setSelectedAlbumForUpload] = useState<string>('Uncategorized');

    // Upload State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Fetch Memories & Albums on Mount
    useEffect(() => {
        fetchMemories();
        fetchAlbums();
    }, []);

    const fetchAlbums = async () => {
        try {
            // Fetch persistent albums from nuclear API
            const res = await axios.get(`${API_BASE_URL}/api/albums`);
            const persistentAlbums = res.data.map((a: any) => a.name);

            // Add 'All Memories' and deduplicate
            const uniqueAlbums = Array.from(new Set(['All Memories', ...persistentAlbums]));
            setAlbums(uniqueAlbums);
        } catch (error) {
            console.error("Error fetching albums:", error);
        }
    };

    const fetchMemories = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/memories`);
            setLocalMemories(res.data);
        } catch (error) {
            console.error("Error fetching memories:", error);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleCreateAlbum = async () => {
        const name = prompt("Enter new album name:");
        if (!name) return;

        if (albums.includes(name)) {
            alert("Album already exists!");
            return;
        }

        try {
            console.log("Creating album with name:", name); // LOG THE REQUEST
            const payload = { name };
            console.log("Payload:", payload);

            await axios.post(`${API_BASE_URL}/api/albums`, payload);
            setAlbums(prev => [...prev, name]);
            setSelectedAlbumForUpload(name); // Auto-select
            setActiveCategory(name); // Switch view
        } catch (error) {
            console.error("Error creating album:", error);
            alert("Failed to create album. Please try again.");
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);
        setUploadProgress(0);

        const BATCH_SIZE = 5;

        try {
            for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
                const batch = selectedFiles.slice(i, i + BATCH_SIZE);

                await Promise.all(batch.map(async (file) => {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('title', 'New Memory');
                    formData.append('album', selectedAlbumForUpload);

                    try {
                        await axios.post(`${API_BASE_URL}/api/memories`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        setUploadProgress((prev) => prev + 1);
                    } catch (err) {
                        console.error(`Failed to upload ${file.name}`, err);
                    }
                }));
            }

            // Refresh grid & albums
            await fetchMemories();
            await fetchAlbums();

            // Reset after success
            setSelectedFiles([]);
            setUploadProgress(0);
        } catch (error) {
            console.error("Batch upload failed", error);
            alert("Some images may have failed to upload. Check console.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen pb-24 relative overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-pink-500/30">

            {/* Background provided by globals.css .aurora-bg, but let's add a local one just in case or overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--theme-color),_transparent_70%)]" />

            {/* Hidden Input for Multi-Select */}
            <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="gallery-upload"
                onChange={handleFileSelect}
            />

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
                    <label
                        htmlFor="gallery-upload"
                        className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-full transition-all shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95 group cursor-pointer"
                    >
                        <Plus size={24} className="group-hover:rotate-90 transition-transform" />
                    </label>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-6 relative z-10">
                {/* Categories & Create Album */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar mask-gradient-right flex-1">
                        {albums.map((album) => (
                            <button
                                key={album}
                                onClick={() => setActiveCategory(album)}
                                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeCategory === album
                                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25 scale-105'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                    }`}
                            >
                                {album}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleCreateAlbum}
                        className="flex-shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-pink-500/20 text-slate-400 hover:text-pink-400 transition-all border border-white/5"
                        title="Create New Album"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Masonry Grid */}
                <div className="columns-2 md:columns-3 gap-6 space-y-6">
                    {localMemories
                        .filter(m => activeCategory === 'All Memories' || m.album === activeCategory)
                        .map((memory) => (
                            <div
                                key={memory.id}
                                className="relative group break-inside-avoid rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-xl cursor-pointer hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 ease-out"
                            >
                                <div className={`relative w-full ${memory.aspectRatio || 'aspect-[3/4]'}`}>
                                    <Image
                                        src={memory.src.startsWith('http') ? memory.src : `${API_BASE_URL}${memory.src}`}
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

            {/* Upload Modal Overlay */}
            <AnimatePresence>
                {
                    selectedFiles.length > 0 && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl"
                            >
                                <h2 className="text-xl font-bold text-white mb-4">
                                    {isUploading ? 'Uploading...' : `Upload to Album`}
                                </h2>

                                {/* Album Selector */}
                                {!isUploading && (
                                    <div className="mb-4">
                                        <label className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2 block">Select Album</label>
                                        <select
                                            value={selectedAlbumForUpload}
                                            onChange={(e) => setSelectedAlbumForUpload(e.target.value)}
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-pink-500 transition-colors"
                                        >
                                            <option value="Uncategorized">Uncategorized</option>
                                            {albums.filter(a => a !== 'All Memories').map(a => (
                                                <option key={a} value={a}>{a}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Preview Grid */}
                                <div className="grid grid-cols-3 gap-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar">
                                    {selectedFiles.map((file, i) => (
                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt="preview"
                                                className="w-full h-full object-cover"
                                            />
                                            {isUploading && i < uploadProgress && (
                                                <div className="absolute inset-0 bg-emerald-500/50 flex items-center justify-center">
                                                    <div className="bg-white/90 rounded-full p-1">
                                                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Progress Bar (if uploading) */}
                                {isUploading && (
                                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                                        <div
                                            className="h-full bg-pink-500 transition-all duration-300 ease-out"
                                            style={{ width: `${(uploadProgress / selectedFiles.length) * 100}%` }}
                                        />
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedFiles([])}
                                        disabled={isUploading}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-medium transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={isUploading}
                                        className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUploading ? `Uploading ${uploadProgress}/${selectedFiles.length}...` : 'Upload All'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence>

            {/* Navigation (Sticky Bottom) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
                <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between text-[10px] font-medium text-slate-400">
                    <Link href="/" className="flex flex-col items-center gap-1 hover:text-white transition-colors">
                        <Home size={24} strokeWidth={1.5} />
                        <span>Home</span>
                    </Link>
                    <Link href="/memories" className="flex flex-col items-center gap-1 text-pink-400">
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
