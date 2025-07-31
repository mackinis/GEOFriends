
"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, MapPin, Loader2 } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useMapFlyTo } from "@/context/map-fly-to-context";
import { useChat } from "@/context/chat-context";


interface User {
  id: string;
  name: string;
  avatar?: string;
  online: boolean; 
  location: { lat: number; lng: number } | string;
}

export default function MembersPage() {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { setFlyTo } = useMapFlyTo();
    const { openChatWith } = useChat();

    const fetchUsers = useCallback(() => {
        const q = query(collection(db, "users"), where("status", "==", "aprobado"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData = querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name,
                        avatar: data.avatar,
                        online: data.online || false,
                        location: data.location, // Keep the original object
                    } as User;
                })
                .filter(u => u.id !== currentUser?.id);
            
            setUsers(usersData);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser?.id]);

    useEffect(() => {
        const unsubscribe = fetchUsers();
        return () => unsubscribe();
    }, [fetchUsers]);
    
    const handleStartChat = (user: User) => {
        // We need to pass the full user object to the context,
        // but the 'User' type here might be different from the one expected by the chat context.
        // Let's create a compatible object.
        const chatPartner = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
        };
        openChatWith(chatPartner);
    };

    const handleViewOnMap = (user: User) => {
        if (typeof user.location === 'object' && user.location !== null) {
            router.push('/dashboard');
            // Use a timeout to ensure navigation completes before flying
            setTimeout(() => setFlyTo(user.location as { lat: number; lng: number }), 100);
        }
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 p-4 md:p-6">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Miembros del Grupo</CardTitle>
                    <CardDescription>Visualiza todos los miembros de tu grupo.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {users.map(user => {
                        const hasLocation = typeof user.location === 'object' && user.location !== null;
                        return (
                            <Card key={user.id} className="p-4 md:p-6 flex flex-col items-center text-center shadow-lg hover:shadow-accent/20 transition-shadow">
                                <Avatar className="w-20 h-20 mb-4 border-2 border-transparent group-hover:border-accent transition-colors">
                                    <AvatarImage src={user.avatar || `https://placehold.co/80x80.png?text=${user.name.charAt(0)}`} data-ai-hint="person avatar" />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h3 className="font-semibold text-lg">{user.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <span className={`h-2.5 w-2.5 rounded-full ${user.online ? 'bg-accent' : 'bg-muted-foreground'}`}></span>
                                    {user.online ? 'En línea' : 'Desconectado'}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                    <MapPin className="h-4 w-4" />
                                    {hasLocation ? "Ubicación compartida" : "Ubicación desconocida"}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleStartChat(user)}>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Mensaje
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleViewOnMap(user)} disabled={!hasLocation}>
                                        Ver en Mapa
                                    </Button>
                                </div>
                            </Card>
                        )
                    })}
                     {users.length === 0 && (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            No hay otros miembros en el grupo.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
