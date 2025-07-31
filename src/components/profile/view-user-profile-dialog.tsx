"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

// This should match the full user object structure
interface AppUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  country?: string;
  avatar?: string;
}

interface ViewUserProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: AppUser | null;
}

export default function ViewUserProfileDialog({
  isOpen,
  onOpenChange,
  user: initialUser,
}: ViewUserProfileDialogProps) {
  
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFullUserData() {
      if (initialUser?.id) {
        setLoading(true);
        const userRef = doc(db, "users", initialUser.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ id: userSnap.id, ...userSnap.data() } as AppUser);
        } else {
          setUser(initialUser); // Fallback to initial props
        }
        setLoading(false);
      }
    }
    
    if(isOpen) {
        fetchFullUserData();
    }
  }, [isOpen, initialUser]);
  
  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Perfil de Usuario</DialogTitle>
          <DialogDescription>
            Información del perfil del usuario seleccionado.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] no-scrollbar">
            <div className="px-6 pb-6">
                 {loading ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                <>
                    <div className="flex justify-center pt-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={user.avatar || undefined} alt={user.name} />
                            <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">Nombre</Label>
                                <Input id="firstName" value={user.firstName || ''} readOnly />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Apellido</Label>
                                <Input id="lastName" value={user.lastName || ''} readOnly />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input id="email" value={user.email || 'No disponible'} readOnly />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" value={user.phone || ''} readOnly />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input id="address" value={user.address || ''} readOnly />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="postalCode">Código Postal</Label>
                                <Input id="postalCode" value={user.postalCode || ''} readOnly />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">Ciudad</Label>
                                <Input id="city" value={user.city || ''} readOnly />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="province">Provincia</Label>
                                <Input id="province" value={user.province || ''} readOnly />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">País</Label>
                                <Input id="country" value={user.country || ''} readOnly />
                            </div>
                        </div>
                    </div>
                </>
                )}
            </div>
        </ScrollArea>
        
        <DialogFooter className="px-6 pb-6 pt-2 border-t">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
