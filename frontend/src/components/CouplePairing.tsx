'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Copy, Check, Link2, Shield, Image as ImageIcon, Book, MessageCircle, AlertCircle } from 'lucide-react';

interface CoupleData {
    id: number;
    pairing_code: string;
    partner_can_chat: boolean;
    partner_can_gallery: boolean;
    partner_can_journal: boolean;
}

interface UserProfile {
    id: number;
    clerk_id: string;
    is_admin: boolean;
    couple: CoupleData | null;
}

export default function CouplePairing() {
    const { userId, isLoaded } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Joiner state
    const [joinCode, setJoinCode] = useState('');
    const [joinSuccess, setJoinSuccess] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);

    // Admin state
    const [copied, setCopied] = useState(false);
    const [updatingPermissions, setUpdatingPermissions] = useState(false);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        if (isLoaded && userId) {
            fetchProfile();
        } else if (isLoaded && !userId) {
            setLoading(false);
        }
    }, [isLoaded, userId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    'x-clerk-user-id': userId as string
                }
            });

            if (!res.ok) throw new Error('Failed to fetch profile');

            const data = await res.json();
            setProfile(data);
        } catch (err: any) {
            console.error('Error fetching profile:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = async () => {
        if (profile?.couple?.pairing_code) {
            await navigator.clipboard.writeText(profile.couple.pairing_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim() || !userId) return;

        try {
            setJoinLoading(true);
            setError(null);
            const res = await fetch(`${API_BASE_URL}/api/users/pair`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId
                },
                body: JSON.stringify({ pairing_code: joinCode.trim() })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Failed to link accounts');
            }

            setJoinSuccess(true);
            await fetchProfile(); // Refresh to get updated couple data
        } catch (err: any) {
            setError(err.message);
        } finally {
            setJoinLoading(false);
        }
    };

    const togglePermission = async (field: keyof CoupleData) => {
        if (!profile?.couple || !profile.is_admin || !userId) return;

        // Optimistic update
        const updatedCouple = { ...profile.couple, [field]: !profile.couple[field] };
        setProfile({ ...profile, couple: updatedCouple });

        try {
            setUpdatingPermissions(true);
            const res = await fetch(`${API_BASE_URL}/api/couple/permissions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clerk-user-id': userId
                },
                body: JSON.stringify({
                    partner_can_chat: updatedCouple.partner_can_chat,
                    partner_can_gallery: updatedCouple.partner_can_gallery,
                    partner_can_journal: updatedCouple.partner_can_journal
                })
            });

            if (!res.ok) {
                throw new Error('Failed to update permissions');
            }
        } catch (err) {
            console.error('Permission update failed:', err);
            // Revert optimistic update
            const revertedCouple = { ...profile.couple, [field]: profile.couple[field] };
            setProfile({ ...profile, couple: revertedCouple });
        } finally {
            setUpdatingPermissions(false);
        }
    };

    if (!isLoaded || loading) {
        return (
            <div className="flex justify-center items-center h-48 w-full">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="p-6 bg-black/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl text-center">
                <p className="text-white/70">Please sign in to manage pairing.</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="p-6 bg-black/40 backdrop-blur-xl border border-red-500/20 rounded-3xl text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <p className="text-red-200">Failed to load profile data.</p>
            </div>
        );
    }

    const isAdmin = profile.is_admin;
    const hasPartner = profile.couple !== null && !isAdmin && profile.couple.id !== profile.id; // basic heuristic if not admin
    const trulyPaired = profile.couple && (!isAdmin || (isAdmin && false)); // Usually we'd check if couple has 2 members, but based on current API, if joiner, couple is set.

    return (
        <div className="w-full max-w-md mx-auto p-6 md:p-8 bg-black/40 backdrop-blur-2xl border border-purple-500/20 rounded-[2rem] shadow-[0_0_40px_rgba(168,85,247,0.1)] text-white">
            <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner">
                    <Shield className="w-8 h-8 text-purple-300" />
                </div>
                <h2 className="text-2xl tracking-wide font-light">Partner Connection</h2>
                <p className="text-sm text-purple-200/60 mt-1">Manage your shared digital sanctuary</p>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-200 flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Success State for Joiner */}
            {(!isAdmin && profile.couple) || joinSuccess ? (
                <div className="text-center p-6 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-3xl border border-purple-500/30">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mx-auto flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                        <Check className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-medium text-purple-100 mb-2">Beautifully Linked</h3>
                    <p className="text-sm text-purple-200/70">
                        You are successfully connected with your partner&apos;s sanctuary. They manage your access permissions.
                    </p>
                </div>
            ) : isAdmin ? (
                /* Admin View */
                <div className="space-y-8">
                    {/* Code Display */}
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />

                        <p className="text-xs uppercase tracking-widest text-purple-300/60 mb-3 font-medium">Your Pairing Code</p>

                        <div className="flex items-center justify-between gap-4">
                            <span className="text-4xl font-mono tracking-[0.2em] text-white">
                                {profile.couple?.pairing_code}
                            </span>
                            <button
                                onClick={handleCopyCode}
                                className="p-3 bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 rounded-xl transition-all border border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-xs text-white/40 mt-4 leading-relaxed">
                            Share this elite code with your partner to grant them access to your world.
                        </p>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-4">
                        <p className="text-sm font-medium uppercase tracking-widest text-purple-300/60 pl-2">Partner Permissions</p>

                        <div className="bg-black/20 rounded-3xl border border-white/5 p-2 space-y-1">
                            {/* Chat Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="bg-purple-900/50 p-2.5 rounded-xl border border-purple-500/20">
                                        <MessageCircle className="w-5 h-5 text-purple-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-purple-100 font-medium text-sm">Chat Access</h4>
                                        <p className="text-xs text-purple-200/50 mt-0.5">Allow interacting with AI</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={profile.couple?.partner_can_chat || false}
                                        onChange={() => togglePermission('partner_can_chat')}
                                        disabled={updatingPermissions}
                                    />
                                    <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500 border border-white/10"></div>
                                </label>
                            </div>

                            {/* Gallery Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="bg-pink-900/50 p-2.5 rounded-xl border border-pink-500/20">
                                        <ImageIcon className="w-5 h-5 text-pink-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-purple-100 font-medium text-sm">Gallery Access</h4>
                                        <p className="text-xs text-purple-200/50 mt-0.5">View shared memories</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={profile.couple?.partner_can_gallery || false}
                                        onChange={() => togglePermission('partner_can_gallery')}
                                        disabled={updatingPermissions}
                                    />
                                    <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 border border-white/10"></div>
                                </label>
                            </div>

                            {/* Journal Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-900/50 p-2.5 rounded-xl border border-indigo-500/20">
                                        <Book className="w-5 h-5 text-indigo-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-purple-100 font-medium text-sm">Journal Access</h4>
                                        <p className="text-xs text-purple-200/50 mt-0.5">Read private entries</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={profile.couple?.partner_can_journal || false}
                                        onChange={() => togglePermission('partner_can_journal')}
                                        disabled={updatingPermissions}
                                    />
                                    <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 border border-white/10"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Joiner View */
                <form onSubmit={handleJoin} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="joinCode" className="block text-sm font-medium uppercase tracking-widest text-purple-300/80 pl-2">
                            Have a partner code?
                        </label>
                        <div className="relative">
                            <input
                                id="joinCode"
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="ENTER 6-DIGIT CODE"
                                maxLength={6}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl tracking-[0.2em] font-mono text-center text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all uppercase"
                                disabled={joinLoading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={joinLoading || joinCode.length < 6}
                        className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                        <div className="relative flex items-center justify-center gap-3 bg-black/40 backdrop-blur-sm px-6 py-4 rounded-2xl group-hover:bg-transparent transition-colors">
                            {joinLoading ? (
                                <div className="w-6 h-6 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Link2 className="w-5 h-5 text-white" />
                                    <span className="font-semibold tracking-wide text-white">Link Accounts</span>
                                </>
                            )}
                        </div>
                    </button>
                    <p className="text-center text-xs text-white/40 leading-relaxed px-4">
                        Linking your account will give you access based on your partner&apos;s configured permissions.
                    </p>
                </form>
            )}
        </div>
    );
}
