export default function Loading() {
    return (
        <main className="min-h-screen bg-slate-950 flex justify-center pt-8 pb-32 px-4">
            <div className="w-full max-w-3xl mx-auto p-4 md:p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl relative animate-pulse">

                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20" />
                        <div className="space-y-2">
                            <div className="h-6 w-32 bg-slate-700/50 rounded" />
                            <div className="h-3 w-24 bg-slate-700/30 rounded" />
                        </div>
                    </div>
                </div>

                {/* Timeframe Tabs Skeleton */}
                <div className="flex bg-white/5 rounded-lg p-1 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 h-8 mx-1 bg-slate-700/20 rounded-md" />
                    ))}
                </div>

                {/* Budget Gauge Skeleton */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <div className="h-8 w-48 bg-slate-700/50 rounded" />
                        <div className="h-10 w-32 bg-slate-700/50 rounded" />
                    </div>
                    <div className="h-4 w-full bg-slate-700/30 rounded-full" />
                </div>

                {/* Quick Actions Skeleton */}
                <div className="mb-6">
                    <div className="h-3 w-24 bg-slate-700/30 rounded mb-2" />
                    <div className="flex gap-3 justify-center">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-24 flex-1 min-w-[100px] rounded-2xl bg-white/5 border border-white/5" />
                        ))}
                    </div>
                </div>

                {/* Add Expense Form Skeleton */}
                <div className="mb-10 flex gap-3">
                    <div className="flex-1 h-14 bg-white/5 rounded-2xl border border-white/10" />
                    <div className="w-28 h-14 bg-white/5 rounded-2xl border border-white/10" />
                    <div className="w-14 h-14 bg-slate-700/50 rounded-2xl" />
                </div>

                {/* AI Insight Skeleton */}
                <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/5 flex gap-3 h-24">
                    <div className="w-5 h-5 bg-indigo-500/20 rounded" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-20 bg-indigo-500/20 rounded" />
                        <div className="h-2 w-full bg-slate-700/30 rounded" />
                        <div className="h-2 w-3/4 bg-slate-700/30 rounded" />
                    </div>
                </div>

                {/* Transactions List Skeleton */}
                <div className="space-y-3">
                    <div className="flex justify-between mb-2">
                        <div className="h-4 w-32 bg-slate-700/30 rounded" />
                    </div>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 h-16">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-md bg-slate-700/30" />
                                <div className="space-y-2">
                                    <div className="h-4 w-24 bg-slate-700/30 rounded" />
                                    <div className="h-2 w-16 bg-slate-700/20 rounded" />
                                </div>
                            </div>
                            <div className="h-5 w-16 bg-slate-700/30 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
