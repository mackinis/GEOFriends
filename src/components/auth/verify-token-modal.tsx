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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { verifyUserToken, resendVerificationToken } from "@/app/actions/auth";

const formSchema = z.object({
  token: z
    .string()
    .length(24, { message: "El token debe tener 24 caracteres." }),
});

interface VerifyTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onSuccess: (isAdmin: boolean) => void;
}

export default function VerifyTokenModal({
  isOpen,
  onClose,
  email,
  onSuccess,
}: VerifyTokenModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!email) return;
    setIsLoading(true);

    try {
      const result = await verifyUserToken({ email, token: values.token });
      if (result.success) {
        toast({
          title: "¡Éxito!",
          description: result.message
        });
        onSuccess(result.isAdmin || false);
      } else {
        toast({
          title: "Error de verificación",
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

  async function handleResendToken() {
    if (!email) return;
    setIsResending(true);
    try {
        const result = await resendVerificationToken(email);
        if (result.success) {
            toast({
                title: "Token reenviado",
                description: result.message,
            });
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
            description: "Ocurrió un error inesperado al reenviar el token.",
            variant: "destructive",
        });
    } finally {
        setIsResending(false);
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Verifica tu Correo Electrónico</DialogTitle>
          <DialogDescription>
            Hemos enviado un token a <strong>{email}</strong>. Por favor, ingrésalo a continuación.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token de Verificación</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingresa el token de 24 caracteres" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex-col gap-2 pt-4 sm:flex-col sm:gap-2">
                 <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verificar Cuenta
                </Button>
                <Button type="button" variant="link" onClick={handleResendToken} disabled={isResending}>
                    {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    ¿No recibiste el token? Reenviar
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
