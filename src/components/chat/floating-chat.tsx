
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChatWindow } from "./chat-window";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import React, { useState } from "react";
import { requestChatClear } from "@/lib/chat";
import { deleteChatRecursively } from "@/lib/chat";
import { Timestamp } from "firebase/firestore";


interface AppUser {
    id: string;
    name: string;
    avatar?: string;
    role?: 'admin' | 'user';
    chatEnabled?: boolean;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp | null;
  isDeleted?: boolean;
  isEdited?: boolean;
  isExpired?: boolean;
}

interface FloatingChatProps {
    isOpen: boolean;
    onClose: () => void;
    loggedInUser: AppUser;
    chatId: string;
    chatPartner: AppUser | null; // null for general chat
    setUnreadChats: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    messages: Message[];
    countdownEdit: number;
    countdownDelete: number;
}

export function FloatingChat({ 
    isOpen, 
    onClose, 
    loggedInUser, 
    chatId, 
    chatPartner, 
    setUnreadChats,
    messages,
    countdownEdit,
    countdownDelete
}: FloatingChatProps) {
    const { toast } = useToast();
    const [clearingChatId, setClearingChatId] = useState<string | null>(null);

    const isGroupChat = !chatPartner;
    const headerTitle = isGroupChat ? "Chat General" : chatPartner.name;
    const headerAvatar = isGroupChat ? "https://placehold.co/40x40.png?text=G" : chatPartner.avatar;
    const headerFallback = isGroupChat ? 'G' : (chatPartner.name?.charAt(0) || 'U');

    const handleClearRequest = async () => {
        if (!chatId || !loggedInUser?.id) return;
        try {
            await requestChatClear(chatId, loggedInUser.id);
            toast({ title: "Solicitud Enviada", description: "Se ha notificado al administrador tu solicitud para borrar este chat." });
        } catch (error) {
            console.error("Error requesting chat clear:", error);
            const errorMessage = error instanceof Error ? error.message : "No se pudo enviar la solicitud.";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        }
    };
    
    const handleClearAdmin = async (chatIdToClear: string) => {
        setClearingChatId(chatIdToClear);
        try {
          await deleteChatRecursively(chatIdToClear);
          toast({ title: "Éxito", description: "El chat ha sido eliminado permanentemente." });
          if (isGroupChat) {
              onClose(); // Cierra el chat general si se borra el historial
          }
        } catch (error) {
          console.error("Error clearing chat:", error);
          const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado al eliminar el chat.";
          toast({ title: "Error", description: errorMessage, variant: "destructive" });
        } finally {
          setClearingChatId(null);
        }
      };


    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
                 <SheetHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={headerAvatar || undefined} />
                                <AvatarFallback>{headerFallback}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <SheetTitle className="text-lg font-semibold">{headerTitle}</SheetTitle>
                                    {isGroupChat && loggedInUser?.role === 'admin' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Borrar historial del chat general">
                                                    {clearingChatId === chatId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Borrar Chat General?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción borrará permanentemente todos los mensajes del chat general para todos los usuarios. Esta acción es irreversible.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleClearAdmin(chatId)} className="bg-destructive hover:bg-destructive/90">Borrar Chat</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                    {!isGroupChat && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Solicitar borrado de chat">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Solicitar Borrado de Chat?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esto enviará una solicitud al administrador para borrar el historial de este chat. El chat se borrará una vez que el administrador apruebe la solicitud.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleClearRequest}>Enviar Solicitud</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">{isGroupChat ? "Habla con todos en el grupo" : "Conversación privada"}</p>
                            </div>
                        </div>
                    </div>
                </SheetHeader>
                <div className="flex-1 h-full min-h-0">
                    <ChatWindow
                        loggedInUser={loggedInUser}
                        chatId={chatId}
                        chatPartner={chatPartner}
                        setUnreadChats={setUnreadChats}
                        messages={messages}
                        countdownEdit={countdownEdit}
                        countdownDelete={countdownDelete}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
