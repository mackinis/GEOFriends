
"use client";

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
} from "@/components/ui/sidebar";
import { Users, Palette, Settings, Shield, Map, LogOut, MessageSquare, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { GeolocationProvider } from "@/context/geolocation-context";
import LocationTracker from "@/components/location-tracker";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hasClearRequests, setHasClearRequests] = useState(false);

  useEffect(() => {
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("clearRequestBy", "!=", []));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasClearRequests(!snapshot.empty);
    });

    return () => unsubscribe();
  }, []);

  const handleLogoutClick = () => {
    sessionStorage.removeItem('userEmail');
    router.push('/');
  };

  return (
    <GeolocationProvider>
      <LocationTracker />
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <Shield className="size-6 text-accent" />
              <h1 className="text-xl font-semibold text-white group-data-[collapsible=icon]:hidden">
                Panel de Admin
              </h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dashboard">
                      <Link href="/admin">
                          <Settings />
                          <span>Dashboard</span>
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Gestión de Usuarios">
                  <Link href="/admin/users">
                    <Users />
                    <span>Usuarios</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Chats">
                  <Link href="/admin/chats" className="relative">
                    {hasClearRequests && (
                      <div className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                    )}
                    <MessageSquare />
                    <span>Chats</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Marca">
                  <Link href="/admin/settings">
                    <Palette />
                    <span>Marca</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Tiempos">
                  <Link href="/admin/timings">
                    <Timer />
                    <span>Tiempos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Configuración">
                  <Link href="/admin/app-settings">
                    <Settings />
                    <span>Configuración</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Volver a la App">
                  <Link href="/dashboard">
                    <Map />
                    <span>Volver a la App</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
          <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur-sm">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
               <h1 className="text-lg font-semibold">Dashboard de Admin</h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </GeolocationProvider>
  );
}
