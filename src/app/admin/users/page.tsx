
"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, Eye } from "lucide-react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import ViewUserProfileDialog from "@/components/profile/view-user-profile-dialog";

interface User {
  id: string;
  name: string;
  email: string;
  status: 'aprobado' | 'pending' | 'suspended';
  role?: 'admin' | 'user';
  chatEnabled?: boolean;
  avatar?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs
        .map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                name: data.name,
                email: data.email,
                status: data.status,
                role: data.role,
                chatEnabled: data.chatEnabled === undefined ? true : data.chatEnabled,
                avatar: data.avatar,
            } as User
        })
        .filter(user => user.role !== 'admin'); // No mostrar al admin en la lista
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setProfileDialogOpen(true);
  };

  const updateUserStatus = async (userId: string, status: User['status']) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { status });
      toast({
        title: "Éxito",
        description: `El estado del usuario ha sido actualizado.`,
      });
      fetchUsers(); // Refresh users list
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario.",
        variant: "destructive",
      });
    }
  };
  
  const toggleUserChat = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { chatEnabled: !currentStatus });
      toast({
        title: "Éxito",
        description: `El chat para el usuario ha sido ${!currentStatus ? 'habilitado' : 'deshabilitado'}.`,
      });
      fetchUsers(); // Refresh users list
    } catch (error) {
      console.error("Error toggling chat status:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del chat del usuario.",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar a este usuario de forma permanente? Esta acción no se puede deshacer.")) {
        try {
            await deleteDoc(doc(db, "users", userId));
            toast({
                title: "Usuario Eliminado",
                description: "El usuario ha sido eliminado permanentemente.",
            });
            fetchUsers(); // Refresh users list
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({
                title: "Error",
                description: "No se pudo eliminar al usuario.",
                variant: "destructive",
            });
        }
    }
  };


  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'aprobado': return 'default';
      case 'pending': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Usuarios</CardTitle>
          <CardDescription>Aprueba, deniega o suspende usuarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Chat</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar || `https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} data-ai-hint="person portrait" />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(user.status) as any}>{user.status}</Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant={user.chatEnabled ? 'default' : 'secondary'}>{user.chatEnabled ? 'Habilitado' : 'Deshabilitado'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === 'pending' && <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'aprobado')}>Aprobar</DropdownMenuItem>}
                        {user.status === 'aprobado' && <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'suspended')}>Suspender</DropdownMenuItem>}
                        {user.status === 'suspended' && <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'aprobado')}>Quitar Suspensión</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleUserChat(user.id, user.chatEnabled!)}>{user.chatEnabled ? 'Deshabilitar Chat' : 'Habilitar Chat'}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground" onClick={() => deleteUser(user.id)}>Eliminar Usuario</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {users.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                  No hay usuarios registrados aún.
              </div>
          )}
        </CardContent>
      </Card>
      {selectedUser && (
        <ViewUserProfileDialog
          isOpen={isProfileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          user={selectedUser}
        />
      )}
    </>
  );
}
