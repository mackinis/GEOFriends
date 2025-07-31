
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from "@/app/actions/user";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";


const formSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido."),
  lastName: z.string().min(1, "El apellido es requerido."),
  phone: z.string().min(1, "El teléfono es requerido."),
  address: z.string().min(1, "La dirección es requerida."),
  postalCode: z.string().min(1, "El código postal es requerido."),
  city: z.string().min(1, "La ciudad es requerida."),
  province: z.string().min(1, "La provincia es requerida."),
  country: z.string().min(1, "El país es requerido."),
  avatar: z.string().url("Por favor, introduce una URL de imagen válida.").or(z.literal("")).optional(),
});

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
  role?: 'admin' | 'user';
  chatEnabled?: boolean;
}

interface EditProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: AppUser;
  onProfileUpdate: (user: any) => void;
}

export default function EditProfileDialog({
  isOpen,
  onOpenChange,
  user,
  onProfileUpdate,
}: EditProfileDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      address: user?.address || "",
      postalCode: user?.postalCode || "",
      city: user?.city || "",
      province: user?.province || "",
      country: user?.country || "",
      avatar: user?.avatar || "",
    },
  });

  const avatarPreview = form.watch("avatar");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const result = await updateUserProfile({ ...values, userId: user.id });
      if (result.success) {
        toast({
          title: "¡Perfil Actualizado!",
          description: "Tus cambios han sido guardados.",
        });
        onProfileUpdate(result.user);
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleChangePassword = () => {
      toast({
          title: "Funcionalidad no implementada",
          description: "La funcionalidad para cambiar la contraseña se implementará en una futura versión."
      })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tu información personal.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] no-scrollbar">
            <div className="px-4">
                <div className="flex justify-center py-4">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={avatarPreview} alt={user.name} />
                        <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="avatar"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>URL de la Imagen de Perfil</FormLabel>
                        <FormControl>
                            <Input
                            placeholder="https://ejemplo.com/imagen.png"
                            {...field}
                            disabled={isLoading}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu nombre" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu apellido" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input value={user.email || ''} readOnly disabled />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu teléfono" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu dirección" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Código Postal</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu código postal" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu ciudad" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Provincia</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu provincia" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>País</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu país" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-4">
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                    </DialogFooter>
                </form>
                </Form>
                <Separator className="my-6" />
                <div className="space-y-4 pb-6">
                    <h3 className="text-md font-semibold">Seguridad</h3>
                    <Button variant="outline" className="w-full" onClick={handleChangePassword}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Cambiar Contraseña
                    </Button>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
