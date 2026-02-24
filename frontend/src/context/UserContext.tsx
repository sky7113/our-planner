'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UserProfile {
    id: number;
    clerk_id: string;
    is_admin: boolean;
    display_name: string | null;
    partner_nickname: string | null;
    date_of_birth: string | null;
    gender: string | null;
    college_or_profession: string | null;
    couple: any;
}

interface UserContextType {
    profile: UserProfile | null;
    setProfile: (profile: UserProfile | null) => void;
    refreshProfile: () => Promise<void>;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { isSignedIn, isLoaded, getToken, userId } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = async () => {
        if (!userId) return;
        try {
            setIsLoading(true);
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: { 'x-clerk-user-id': userId }
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoaded) {
            if (isSignedIn) {
                refreshProfile();
            } else {
                setProfile(null);
                setIsLoading(false);
            }
        }
    }, [isLoaded, isSignedIn, userId]);

    return (
        <UserContext.Provider value={{ profile, setProfile, refreshProfile, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUserProfile() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProvider');
    }
    return context;
}
