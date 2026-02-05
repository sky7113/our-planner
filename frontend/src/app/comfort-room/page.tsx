export const dynamic = 'force-dynamic';
'use client';

import { Suspense } from 'react';
import ComfortCompanion from '../../components/ComfortCompanion';

export default function ComfortRoomPage() {
    return (
        <main className="w-full h-screen overflow-hidden">
            {/* This Suspense wrapper prevents the build crash */}
            <Suspense fallback={<div className="flex h-full items-center justify-center text-white">Loading...</div>}>
                <ComfortCompanion />
            </Suspense>
        </main>
    );
}