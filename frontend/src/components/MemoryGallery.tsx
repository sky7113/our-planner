'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, Loader2, ArrowLeft, Folder, Trash2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface Album {
    id: number;
    name: string;
    cover: string | null;
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1 }
};

export default function MemoryGallery() {
    const [view, setView] = useState<'gallery' | 'album'>('gallery');
    const [currentAlbum, setCurrentAlbum] = useState<string | null>(null);

    const [albums, setAlbums] = useState<Album[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Methods ---

    const fetchAlbums = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/memory-albums`);
            if (response.ok) {
                setAlbums(await response.json());
            }
        } catch (error) {
            console.error("Failed to load albums:", error);
        }
    };

    const fetchPhotos = async (albumName: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/albums/${albumName}`);
            if (response.ok) {
                setPhotos(await response.json());
            }
        } catch (error) {
            console.error("Failed to load photos:", error);
        }
    };

    // Initial Load
    useEffect(() => {
        if (view === 'gallery') {
            fetchAlbums();
        } else if (view === 'album' && currentAlbum) {
            fetchPhotos(currentAlbum);
        }
    }, [view, currentAlbum]);

    const handleCreateAlbum = async () => {
        const name = prompt("Enter a name for the new album:");
        if (!name) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/memory-albums`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (response.ok) {
                fetchAlbums();
            } else {
                alert("Could not create album. It might already exist.");
            }
        } catch (error) {
            console.error("Create album failed:", error);
        }
    };

    const handleAlbumClick = (name: string) => {
        setCurrentAlbum(name);
        setView('album');
    };

    const handleBackToGallery = () => {
        setView('gallery');
        setCurrentAlbum(null);
        setPhotos([]);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentAlbum) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/albums/${currentAlbum}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                await fetchPhotos(currentAlbum); // Refresh photos
            }
        } catch (error) {
            console.error("Upload failed:", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteAlbum = async (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete album "${name}" and all its photos?`)) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/albums/${name}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setAlbums(prev => prev.filter(a => a.name !== name));
            } else {
                alert("Failed to delete album.");
            }
        } catch (error) {
            console.error("Delete album failed:", error);
            alert("Error deleting album");
        }
    };

    const handleDeletePhoto = async (url: string) => {
        if (!currentAlbum) return;
        const filename = url.split('/').pop();
        if (!filename) return;

        if (!confirm("Delete this photo?")) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums/${currentAlbum}/photos/${filename}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setPhotos(prev => prev.filter(p => p !== url));
            }
        } catch (error) {
            console.error("Delete photo failed:", error);
        }
    };

    // --- Render ---

    return (
        <div className="w-full max-w-4xl mx-auto py-12 px-4 transition-all duration-500">

            {/* Header Section */}
            <div className="text-center mb-10 relative">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-pink-500/20 text-pink-300 mb-4 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                    <Camera size={24} />
                </div>
                <h2 className="text-3xl md:text-4xl font-light text-slate-100 tracking-wide font-serif">
                    {view === 'gallery' ? 'Our Journey' : currentAlbum}
                </h2>
                <p className="text-slate-400 mt-2 font-light">
                    {view === 'gallery' ? 'Collections of cherished moments' : 'Moments frozen in time'}
                </p>

                {view === 'album' && (
                    <button
                        onClick={handleBackToGallery}
                        className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="hidden md:inline">Gallery</span>
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">

                {/* VIEW 1: GALLERY (ALBUMS) */}
                {view === 'gallery' && (
                    <motion.div
                        key="gallery"
                        variants={container}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, x: -50 }}
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                    >
                        {albums.map((album) => (
                            <motion.div
                                key={album.name}
                                variants={item}
                                whileHover={{ scale: 1.03, rotate: -1 }}
                                onClick={() => handleAlbumClick(album.name)}
                                className="group relative bg-white p-3 pb-8 shadow-xl cursor-pointer rotate-1 hover:rotate-0 transition-transform duration-300"
                            >
                                {/* Delete Album Button */}
                                <button
                                    onClick={(e) => handleDeleteAlbum(album.name, e)}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-30 hover:bg-red-600 shadow-md"
                                    title="Delete Album"
                                >
                                    <Trash2 size={16} />
                                </button>
                                {/* Cover Image */}
                                <div className="aspect-4/3 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                    {album.cover ? (
                                        <img src={`${API_BASE_URL}${album.cover}`} alt={album.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Folder size={48} className="text-slate-300" />
                                    )}

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>

                                {/* Footer */}
                                <div className="mt-3 text-center">
                                    <p className="font-serif text-slate-800 text-lg">{album.name}</p>
                                </div>

                                {/* Stack Effect styling */}
                                <div className="absolute inset-0 border border-slate-200 pointer-events-none" />
                                <div className="absolute -bottom-1 -right-1 w-full h-full bg-slate-200 -z-10 rounded-sm" />
                            </motion.div>
                        ))}

                        {/* "Create New" Card */}
                        <motion.div
                            variants={item}
                            whileHover={{ scale: 1.02 }}
                            onClick={handleCreateAlbum}
                            className="group relative bg-white/5 border-2 border-dashed border-white/10 hover:border-pink-500/50 hover:bg-pink-500/5 p-3 flex flex-col items-center justify-center aspect-4/3 sm:aspect-auto sm:h-full min-h-[250px] rounded-lg cursor-pointer transition-all duration-300"
                        >
                            <div className="p-4 rounded-full bg-white/5 group-hover:bg-pink-500/20 transition-colors mb-3">
                                <Plus size={32} className="text-slate-500 group-hover:text-pink-400" />
                            </div>
                            <span className="text-slate-500 group-hover:text-pink-400 text-sm font-medium">Create New Album</span>
                        </motion.div>
                    </motion.div>
                )}

                {/* VIEW 2: ALBUM (PHOTOS) */}
                {view === 'album' && (
                    <motion.div
                        key="album"
                        variants={container}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, x: 50 }}
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                    >
                        {photos.map((url, idx) => (
                            <motion.div
                                key={idx}
                                variants={item}
                                initial="hidden"
                                animate="show"
                                whileHover={{ scale: 1.02 }}
                                className="group relative bg-white p-2 pb-8 shadow-md"
                            >
                                {/* Delete Photo Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePhoto(url);
                                    }}
                                    className="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 shadow-md z-30"
                                    title="Delete Photo"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
                                    <img src={`${API_BASE_URL}${url}`} alt="Memory" className="w-full h-full object-cover" loading="lazy" />
                                </div>
                            </motion.div>
                        ))}

                        {/* "Add Photo" Card (Inside Album) */}
                        <motion.div
                            variants={item}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => fileInputRef.current?.click()}
                            className="group relative bg-white/5 border-2 border-dashed border-white/10 hover:border-pink-500/50 hover:bg-pink-500/5 p-3 flex flex-col items-center justify-center aspect-square rounded-lg cursor-pointer transition-all duration-300 min-h-[200px]"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileSelect}
                            />

                            {isUploading ? (
                                <div className="flex flex-col items-center gap-3 text-pink-400">
                                    <Loader2 size={32} className="animate-spin" />
                                    <span className="text-sm font-medium">Uploading...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-slate-500 group-hover:text-pink-400 transition-colors">
                                    <div className="p-4 rounded-full bg-white/5 group-hover:bg-pink-500/20 transition-colors">
                                        <Plus size={32} />
                                    </div>
                                    <span className="text-sm font-medium">Add Photo</span>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
