
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { deleteChatRecursively } from "@/lib/chat";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface User {
  id: string;
  name: string;
}

interface Chat {
  id: string;
  memberIds: string[];
  members: User[];
  clearRequestBy: string[];
}

export default function AdminChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingChatId, setClearingChatId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleClearChat = async (chatId: string) => {
    setClearingChatId(chatId);
    try {
      await deleteChatRecursively(chatId);
      toast({ title: "Éxito", description: "El chat ha sido eliminado permanentemente." });
    } catch (error) {
      console.error("Error clearing chat:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado al eliminar el chat.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setClearingChatId(null);
    }
  };
  
  useEffect(() => {
    setLoading(true);
    const usersMap = new Map<string, string>();

    const fetchUsersAndListenToChats = async () => {
        try {
            const usersSnapshot = await getDocs(collection(db, "users"));
            usersSnapshot.forEach(doc => {
                 usersMap.set(doc.id, doc.data().name);
            });

            const chatsRef = collection(db, "chats");
            const q = query(chatsRef, where("isGroup", "==", false));
            
            const unsubscribeChats = onSnapshot(q, (chatsSnapshot) => {
                const chatsData = chatsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const memberIds = data.memberIds as string[];
                    const members = memberIds.map(id => ({ id, name: usersMap.get(id) || 'Usuario Desconocido' }));
                    return {
                        id: doc.id,
                        memberIds,
                        members,
                        clearRequestBy: data.clearRequestBy || [],
                    } as Chat;
                });
                setChats(chatsData);
                setLoading(false);
            }, (err) => {
                console.error("Error en snapshot de chats: ", err);
                toast({ title: "Error", description: "No se pudieron escuchar los cambios en los chats.", variant: "destructive" });
                setLoading(false);
            });
            return unsubscribeChats;
        } catch (error) {
             console.error("Error fetching users for chat list: ", error);
             toast({ title: "Error", description: "No se pudieron cargar los datos de los usuarios.", variant: "destructive" });
             setLoading(false);
             return () => {};
        }
    };
    
    const unsubscribePromise = fetchUsersAndListenToChats();

    return () => {
      unsubscribePromise.then(unsub => unsub && unsub());
    };
  }, [toast]);


  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Chats</CardTitle>
        <CardDescription>Administra los chats privados entre usuarios. Los chats borrados se eliminan permanentemente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {chats.length > 0 ? (
          chats.map(chat => (
            <div key={chat.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <h3 className="font-semibold">{chat.members.map(m => m.name).join(' y ')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {chat.clearRequestBy.length > 0 ? 
                         `Solicitado por: ${chat.members.filter(m => chat.clearRequestBy.includes(m.id)).map(m => m.name).join(', ')}`
                         : "Sin solicitudes de borrado"}
                    </p>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button 
                            variant="destructive" 
                            size="sm" 
                            disabled={clearingChatId === chat.id}
                            title={"Borrar historial del chat"}
                        >
                            {clearingChatId === chat.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">{clearingChatId === chat.id ? "Borrando..." : "Borrar Chat"}</span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto borrará permanentemente la conversación entre <span className="font-semibold">{chat.members.map(m => m.name).join(' y ')}</span>.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => handleClearChat(chat.id)}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Sí, borrar chat
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          ))
        ) : (
             <div className="text-center py-10 text-muted-foreground">
                No hay chats privados aún.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
