'use client';
export const dynamic = 'force-dynamic';
import CareerRoadmap from "../../components/CareerRoadmap";
import { Trophy } from 'lucide-react';

export default function CareerPage() {
    return (
        <main className="min-h-screen bg-slate-950 pt-12 pb-32 px-4 flex flex-col items-center gap-8">
            <div className="text-center">
                <h1 className="text-4xl font-light text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200 flex items-center justify-center gap-3">
                    <Trophy className="text-blue-300" /> Path to Victory
                </h1>
                <p className="text-slate-400 mt-2 font-light">Career Milestones & Achievements</p>
            </div>

            <div className="w-full max-w-4xl">
                <CareerRoadmap />
            </div>
        </main>
    );
}
