
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  MessageSquare,
  Map,
  LogOut,
  Shield,
  Settings,
  HelpCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GeolocationProvider } from '@/context/geolocation-context';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, onSnapshot, doc, Timestamp, getDoc, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { FloatingChat } from '@/components/chat/floating-chat';
import { getGeneralChat, getOrCreatePrivateChat, setMessageAsExpired } from '@/lib/chat';
import EditProfileDialog from '@/components/profile/edit-profile-dialog';
import { BrandingSettings, getBrandingSettings, getTimingSettings, TimingSettings } from '../actions/settings';
import LocationTracker from '@/components/location-tracker';
import { useMapFlyTo, MapFlyToProvider } from '@/context/map-fly-to-context';
import { ChatProvider } from '@/context/chat-context';
import SupportModal from '@/components/support/support-modal';

interface AppUser {
  id: string;
  name: string;
  email?: string | null;
  avatar?: string;
  role?: 'admin' | 'user';
  chatEnabled?: boolean;
  location?: { lat: number; lng: number };
}

interface Message {
    id: string;
    senderId: string;
    text: string;
    isDeleted?: boolean;
    isEdited?: boolean;
    isExpired?: boolean;
    timestamp: Timestamp | null;
}

interface Chat {
    id: string;
    lastMessageTimestamp?: Timestamp;
    lastMessageBy?: string;
    isGroup?: boolean;
    memberIds?: string[];
}

interface UserChatState {
    lastReadTimestamp?: Timestamp;
}

function DashboardHeader({ onProfileOpen, onSupportOpen, user, loading }: { onProfileOpen: () => void, onSupportOpen: () => void, user: AppUser | null, loading: boolean }) {
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.removeItem('userEmail');
    router.push('/');
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur-sm sticky top-0 z-20">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        {/* Can add breadcrumbs or page title here */}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            disabled={loading}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user?.avatar || "https://placehold.co/40x40.png"}
                data-ai-hint="user avatar"
                alt={user?.name || "Usuario"}
              />
              <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onProfileOpen}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSupportOpen}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Soporte</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, setUser } = useAuth();
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setChatOpen] = useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isSupportModalOpen, setSupportModalOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatPartner, setChatPartner] = useState<AppUser | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [timingSettings, setTimingSettings] = useState<TimingSettings | null>(null);
  const [unreadChats, setUnreadChats] = useState<Record<string, boolean>>({});
  const [hasClearRequests, setHasClearRequests] = useState(false);
  const { setFlyTo } = useMapFlyTo();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [countdownEdit, setCountdownEdit] = useState(0);
  const [countdownDelete, setCountdownDelete] = useState(0);
  
  const router = useRouter();

  const handleLogoutClick = () => {
    sessionStorage.removeItem('userEmail');
    router.push('/');
  };
  
  useEffect(() => {
    getTimingSettings().then(setTimingSettings);
  }, []);

  useEffect(() => {
      let timer: NodeJS.Timeout;
      if (countdownEdit > 0 || countdownDelete > 0) {
          timer = setInterval(() => {
              setCountdownEdit(prev => Math.max(0, prev - 1));
              setCountdownDelete(prev => Math.max(0, prev - 1));
          }, 1000);
      }
      return () => clearInterval(timer);
  }, [countdownEdit, countdownDelete]);

  useEffect(() => {
      if (!activeChatId || !user) return;

      const messagesQuery = query(collection(db, `chats/${activeChatId}/messages`), orderBy("timestamp", "asc"));
      const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
          const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
          setMessages(msgs);
      });

      return () => unsubscribe();
  }, [activeChatId, user]);
  
  useEffect(() => {
    if (!timingSettings || !user || !messages.length || !activeChatId) return;

    const lastUserMessage = [...messages].reverse().find(m => m.senderId === user.id && !m.isDeleted);
    
    if (lastUserMessage && !lastUserMessage.isExpired) {
        setCountdownEdit(Number(timingSettings.editMessageTime) || 0);
        setCountdownDelete(Number(timingSettings.deleteMessageTime) || 0);
        setMessageAsExpired(activeChatId, lastUserMessage.id);
    }
  }, [messages, user, timingSettings, activeChatId]);


  useEffect(() => {
    if (authLoading || !user) {
        setLoading(authLoading);
        return;
    };
    
    setLoading(true);

    const q = query(collection(db, "users"), where("status", "==", "aprobado"));
    const unsubscribeUsers = onSnapshot(q, async (querySnapshot) => {
      const usersData: AppUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          role: data.role,
          chatEnabled: data.chatEnabled,
          location: data.location
        });
      });
      setAllUsers(usersData);
      
      const currentUserData = usersData.find(u => u.id === user.id);
      if(currentUserData){
          setUser(currentUserData);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error fetching users in real-time:", error);
        setLoading(false);
    });
    
    let unsubscribeChats: (() => void) | undefined;
    let unsubscribeClearRequests: (() => void) | undefined;
    if (user?.id) {
        const chatsRef = collection(db, 'chats');
        
        const checkUnreadStatus = async (chatDoc: any) => {
            const chatData = chatDoc.data() as Chat;
            
            if (chatData.lastMessageBy === user.id || !chatData.lastMessageTimestamp) {
                return { key: null, unread: false };
            }

            const userChatStateRef = doc(db, `users/${user.id}/chats`, chatDoc.id);
            const userChatStateSnap = await getDoc(userChatStateRef);
            const userChatStateData = userChatStateSnap.data() as UserChatState;

            const lastMessageTime = chatData.lastMessageTimestamp.toDate();
            const lastReadTime = userChatStateData?.lastReadTimestamp?.toDate() ?? new Date(0);
            
            const isUnread = lastMessageTime > lastReadTime;
            
            if (chatData.isGroup) {
                return { key: 'general', unread: isUnread };
            } else {
                const partnerId = chatData.memberIds?.find((id: string) => id !== user.id);
                return { key: partnerId, unread: isUnread };
            }
        };
        
        const qChats = query(chatsRef, where('memberIds', 'array-contains', user.id));
        unsubscribeChats = onSnapshot(qChats, async (snapshot) => {
            for (const chatDoc of snapshot.docs) {
                const { key, unread } = await checkUnreadStatus(chatDoc);
                if (key) {
                   setUnreadChats(prev => ({ ...prev, [key]: unread }));
                }
            }
        });

        if (user.role === 'admin') {
            const qClear = query(chatsRef, where("clearRequestBy", "!=", []));
            unsubscribeClearRequests = onSnapshot(qClear, (snapshot) => {
                setHasClearRequests(!snapshot.empty);
            });
        }
    }

    return () => {
        unsubscribeUsers();
        if (unsubscribeChats) unsubscribeChats();
        if (unsubscribeClearRequests) unsubscribeClearRequests();
    };
  }, [user?.id, authLoading, setUser, user?.role]);

  useEffect(() => {
    async function fetchBranding() {
        const settings = await getBrandingSettings();
        setBranding(settings);
        if(settings?.siteName){
            document.title = settings.siteName;
        }
    }
    fetchBranding();
  }, []);

  const handleOpenGeneralChat = async () => {
    try {
      const generalChat = await getGeneralChat();
      setActiveChatId(generalChat.id);
      setChatPartner(null);
      setChatOpen(true);
    } catch (error) {
      console.error("Error opening general chat:", error);
    }
  };
  
  const handleOpenPrivateChat = useCallback(async (partner: AppUser) => {
    if (!user) return;
    try {
      const chat = await getOrCreatePrivateChat(user.id, partner.id);
      setActiveChatId(chat.id);
      setChatPartner(partner);
      setChatOpen(true);
    } catch(error) {
       console.error("Error opening private chat:", error);
    }
  }, [user]);
  
  const handleProfileUpdate = (updatedUser: AppUser) => {
      setUser(updatedUser);
      setAllUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
  }
  
  const handleCenterOnUser = useCallback((userToCenter: AppUser) => {
    if (userToCenter.location) {
        router.push('/dashboard'); 
        setTimeout(() => setFlyTo(userToCenter.location), 100); 
    }
  }, [router, setFlyTo]);

  const otherUsers = useMemo(() => allUsers.filter(u => u.id !== user?.id), [allUsers, user]);

  if (loading || authLoading || !branding) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <GeolocationProvider>
      <ChatProvider openChatWith={handleOpenPrivateChat}>
        <LocationTracker />
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <Map className="size-6 text-accent" />
                <h1 className="text-xl font-semibold text-white group-data-[collapsible=icon]:hidden text-glow">
                  {branding?.siteName || "GeoFriends"}
                </h1>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Vista de Mapa">
                    <Link href="/dashboard">
                      <Map />
                      <span>Vista de Mapa</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Chat General" onClick={handleOpenGeneralChat} className="relative">
                     {unreadChats['general'] && <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-green-500" />}
                    <MessageSquare />
                    <span>Chat General</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Miembros">
                    <Link href="/dashboard/users">
                      <Users />
                      <span>Miembros</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>

              <div className="flex-1 overflow-y-auto">
                <p className="px-4 py-2 text-sm font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">
                  Miembros
                </p>
                <SidebarMenu>
                  {otherUsers.map((u) => (
                    <SidebarMenuItem key={u.id}>
                      <SidebarMenuButton
                        onClick={() => handleCenterOnUser(u)}
                        size="lg"
                        tooltip={{
                          children: u.name,
                          className:
                            "bg-accent text-accent-foreground border-accent",
                        }}
                        className="relative"
                      >
                         {unreadChats[u.id] && <div className="absolute top-1 left-7 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background z-10" />}
                        <Avatar className="size-8">
                          <AvatarImage src={u.avatar} alt={u.name} data-ai-hint="person portrait" />
                          <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{u.name}</span>
                      </SidebarMenuButton>
                       <SidebarMenuAction
                          onClick={() => handleOpenPrivateChat(u)}
                          tooltip={{ children: `Chatear con ${u.name}` }}
                        >
                         <MessageSquare />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
               {user?.role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Panel de Admin" className="relative">
                    <Link href="/admin">
                       {hasClearRequests && (
                        <div className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                      )}
                      <Shield />
                      <span>Panel de Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
               )}
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogoutClick} tooltip="Cerrar Sesión">
                      <LogOut />
                      <span>Cerrar Sesión</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <DashboardHeader 
              onProfileOpen={() => setProfileDialogOpen(true)}
              onSupportOpen={() => setSupportModalOpen(true)}
              user={user}
              loading={authLoading}
            />
            <main className="flex-1 overflow-auto relative">{children}
               <footer className="absolute bottom-2 left-1/2 -translate-x-1/2 w-auto px-4 py-1.5 bg-background/50 backdrop-blur-sm rounded-md text-xs text-muted-foreground z-10 text-center flex flex-wrap justify-center">
                  <span className="mr-1">{branding.copyright}</span>
                  <a href={branding.developerWeb} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline ml-1">{branding.developer}</a>
               </footer>
            </main>
          </SidebarInset>
          {user && activeChatId && (
              <FloatingChat
                  isOpen={isChatOpen}
                  onClose={() => setChatOpen(false)}
                  loggedInUser={user}
                  chatId={activeChatId}
                  chatPartner={chatPartner}
                  setUnreadChats={setUnreadChats}
                  messages={messages}
                  countdownEdit={countdownEdit}
                  countdownDelete={countdownDelete}
              />
          )}
          {user && (
              <EditProfileDialog
                  isOpen={isProfileDialogOpen}
                  onOpenChange={setProfileDialogOpen}
                  user={user}
                  onProfileUpdate={handleProfileUpdate}
              />
          )}
          {user && (
              <SupportModal
                  isOpen={isSupportModalOpen}
                  onOpenChange={setSupportModalOpen}
                  user={user}
              />
          )}
        </SidebarProvider>
      </ChatProvider>
    </GeolocationProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MapFlyToProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </MapFlyToProvider>
  );
}
