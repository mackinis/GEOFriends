
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquareX, Trash2, Pencil, X, Check, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc, onSnapshot, setDoc } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { deleteMessage, editMessage } from "@/lib/chat";

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp | null;
  isDeleted?: boolean;
  isEdited?: boolean;
  isExpired?: boolean;
}

interface AppUser {
  id: string;
  name: string;
  avatar?: string;
  role?: 'admin' | 'user';
  chatEnabled?: boolean;
}

interface ChatMessageProps {
    message: Message;
    loggedInUser: AppUser;
    members: Record<string, AppUser>;
    isLastUserMessage: boolean;
    countdownEdit: number;
    countdownDelete: number;
    onDelete: (messageId: string) => void;
    onSaveEdit: (messageId: string, newText: string) => void;
}

function ChatMessage({
    message,
    loggedInUser,
    members,
    isLastUserMessage,
    countdownEdit,
    countdownDelete,
    onDelete,
    onSaveEdit,
}: ChatMessageProps) {
    const isSender = message.senderId === loggedInUser.id;
    const sender = members[message.senderId];
    const senderName = isSender ? "Tú" : sender?.name || "Usuario Desconocido";
    const senderAvatar = isSender ? loggedInUser.avatar : sender?.avatar;

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text);
    const [isSaving, setIsSaving] = useState(false);

    const timeLabel = message.timestamp ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true, locale: es }) : 'Enviando...';
    
    const showEditButton = isSender && isLastUserMessage && countdownEdit > 0;
    const showDeleteButton = isSender && isLastUserMessage && countdownDelete > 0;
    const showCountdownText = isSender && isLastUserMessage && (countdownEdit > 0 || countdownDelete > 0);

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveEdit(message.id, editText);
        setIsSaving(false);
        setIsEditing(false);
    };

    return (
        <div className={`group flex items-start gap-3 ${isSender ? "justify-end" : ""}`}>
            {!isSender && (<Avatar className="h-8 w-8"><AvatarImage src={senderAvatar} /><AvatarFallback>{senderName.charAt(0)}</AvatarFallback></Avatar>)}
            <div className={`flex flex-col w-full max-w-xs md:max-w-md ${isSender ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2">
                    {!isSender && <p className="text-sm font-semibold">{senderName}</p>}
                    <p className="text-xs text-muted-foreground">{timeLabel}</p>
                    {isSender && <p className="text-sm font-semibold">{senderName}</p>}
                </div>
                 <div className={`flex items-center gap-2 ${isSender ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center self-center shrink-0`}>
                       {showEditButton && !isEditing && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4" /></Button>}
                       {showDeleteButton && !isEditing && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(message.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                    {isEditing ? (
                        <div className="flex w-full items-center gap-2">
                            <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="h-9" disabled={isSaving}/>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4"/>}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(false)} disabled={isSaving}><X className="h-4 w-4"/></Button>
                        </div>
                     ) : (
                        <div className={`relative inline-block rounded-lg p-3 text-sm break-words ${isSender ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>
                            {message.isDeleted ? <span className="italic text-muted-foreground">Mensaje eliminado</span> : message.text}
                            {message.isEdited && <span className="text-xs text-muted-foreground/80 ml-2">(editado)</span>}
                        </div>
                    )}
                 </div>
                 {showCountdownText && !isEditing && (
                    <span className="text-xs font-mono text-accent mt-1">
                      (E: {countdownEdit}s / B: {countdownDelete}s)
                    </span>
                )}
            </div>
            {isSender && (<Avatar className="h-8 w-8"><AvatarImage src={senderAvatar} /><AvatarFallback>T</AvatarFallback></Avatar>)}
        </div>
    );
}

interface ChatWindowProps {
  loggedInUser: AppUser;
  chatId: string;
  chatPartner?: AppUser | null;
  setUnreadChats: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  messages: Message[];
  countdownEdit: number;
  countdownDelete: number;
}

export function ChatWindow({ 
    loggedInUser, 
    chatId, 
    chatPartner, 
    setUnreadChats,
    messages,
    countdownEdit,
    countdownDelete
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<Record<string, AppUser>>({});
  const { toast } = useToast();
  
  const isChatDisabled = loggedInUser.chatEnabled === false;
  const isGroupChat = !chatPartner;

  const markChatAsRead = useCallback(async () => {
    if (!chatId || !loggedInUser.id) return;

    const unreadKey = isGroupChat ? 'general' : chatPartner?.id;
    if (unreadKey) {
        setUnreadChats(prev => ({...prev, [unreadKey]: false }));
    }

    const userChatStateRef = doc(db, `users/${loggedInUser.id}/chats`, chatId);
    try {
      // Use setDoc with merge:true to create the document if it doesn't exist, or update it if it does.
      await setDoc(userChatStateRef, { lastReadTimestamp: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  }, [chatId, loggedInUser.id, isGroupChat, chatPartner?.id, setUnreadChats]);

  useEffect(() => {
    const membersCollection = collection(db, "users");
    const unsubscribeMembers = onSnapshot(membersCollection, (snapshot) => {
        const membersData: Record<string, AppUser> = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            membersData[doc.id] = { id: doc.id, name: data.name, avatar: data.avatar, role: data.role, chatEnabled: data.chatEnabled };
        });
        setMembers(membersData);
    });
    
    markChatAsRead();

    return () => unsubscribeMembers();
  }, [markChatAsRead]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
        el.scrollTop = el.scrollHeight;
    }
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !chatId || isChatDisabled) return;
    
    const chatRef = doc(db, "chats", chatId);
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      text: newMessage,
      senderId: loggedInUser.id,
      timestamp: serverTimestamp(),
      isExpired: false,
    });
    await updateDoc(chatRef, { lastMessageTimestamp: serverTimestamp(), lastMessageBy: loggedInUser.id, lastMessageText: newMessage });
    setNewMessage("");
  };
  
  const handleDelete = async (messageId: string) => {
    try {
        await deleteMessage(chatId, messageId);
        toast({ title: "Mensaje borrado" });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo borrar el mensaje.", variant: "destructive" });
    }
  };

  const handleSaveEdit = async (messageId: string, newText: string) => {
    try {
        await editMessage(chatId, messageId, newText);
        toast({ title: "Mensaje editado" });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo editar el mensaje.", variant: "destructive" });
    }
  };

  if (isChatDisabled) {
    return (
        <div className="flex h-full flex-col items-center justify-center bg-background p-4 text-center">
            <MessageSquareX className="h-16 w-16 text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-semibold">Chat Deshabilitado</h2>
            <p className="mt-2 text-sm text-muted-foreground">Un administrador ha deshabilitado tu acceso al chat.</p>
        </div>
    )
  }
  
  const lastUserMessage = [...messages].reverse().find(m => m.senderId === loggedInUser.id && !m.isDeleted);

  return (
    <div className="flex h-full flex-col bg-background">
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <div className="space-y-4">
            {messages.map((msg) => (
                <ChatMessage 
                    key={msg.id}
                    message={msg}
                    loggedInUser={loggedInUser}
                    members={members}
                    isLastUserMessage={msg.id === lastUserMessage?.id}
                    countdownEdit={countdownEdit}
                    countdownDelete={countdownDelete}
                    onDelete={handleDelete}
                    onSaveEdit={handleSaveEdit}
                />
            ))}
             {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-10">No hay mensajes aquí. ¡Sé el primero en enviar uno!</div>
            )}
            </div>
      </div>
      <div className="border-t p-4 shrink-0">
        <form onSubmit={handleSendMessage} className="relative">
          <Input placeholder="Escribe un mensaje..." className="pr-12" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
          <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-accent hover:bg-accent/90"><Send className="h-4 w-4" /><span className="sr-only">Enviar</span></Button>
        </form>
      </div>
    </div>
  );
}
