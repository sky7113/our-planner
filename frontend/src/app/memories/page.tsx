'use client';
export const dynamic = 'force-dynamic';
import MemoryGallery from "../../components/MemoryGallery";

export default function MemoriesPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 pt-8 pb-32 px-4">
            <MemoryGallery />
        </main>
    );
}
