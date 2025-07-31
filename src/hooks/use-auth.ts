
"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export interface AppUser {
    id: string;
    email: string | null;
    name: string | null;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    province?: string;
    country?: string;
    avatar?: string;
    role?: 'admin' | 'user';
    chatEnabled?: boolean;
}


// A custom hook to manage a "session" across client components.
// It uses sessionStorage to persist the logged-in user's ID.
// This is a workaround for not having a full-fledged server-side session management.
export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const userEmail = sessionStorage.getItem('userEmail');

      if (userEmail) {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", userEmail));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();

                 // Check for suspension or pending status
                if (userData.status === 'suspended' || userData.status === 'pending') {
                    sessionStorage.removeItem('userEmail');
                    setUser(null);
                    router.push('/');
                    return;
                }

                setUser({
                    id: userDoc.id,
                    email: userData.email,
                    name: userData.name,
                    avatar: userData.avatar,
                    role: userData.role,
                    chatEnabled: userData.chatEnabled,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phone: userData.phone,
                    address: userData.address,
                    postalCode: userData.postalCode,
                    city: userData.city,
                    province: userData.province,
                    country: userData.country,
                });
            } else {
                 sessionStorage.removeItem('userEmail');
                 setUser(null);
                 router.push('/');
            }
        } catch(error){
            console.error("Auth check failed:", error);
            sessionStorage.removeItem('userEmail');
            setUser(null);
            router.push('/');
        }
      } else {
        // No user in session storage, potentially redirect to login
        // But we let pages handle the redirect to avoid loop issues.
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  return { user, setUser, loading };
}
