
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { loginUser } from "@/app/actions/auth";
import AdminSetupModal from "./admin-setup-modal";
import VerifyTokenModal from "./verify-token-modal";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
});

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isSetupModalOpen, setSetupModalOpen] = useState(false);
  const [isVerifyModalOpen, setVerifyModalOpen] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const result = await loginUser(values);

      if (result.success) {
        if (result.needsAdminSetup) {
          setSetupModalOpen(true);
          return;
        }

        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión correctamente.",
        });
        
        // Use sessionStorage to persist login state on client-side
        if (result.userEmail) {
          sessionStorage.setItem('userEmail', result.userEmail);
        }

        router.push("/dashboard");
        
      } else {
        toast({
          title: "Error de inicio de sesión",
          description: result.message,
          variant: "destructive",
        });
        if (result.needsVerification && result.userEmail) {
            setEmailToVerify(result.userEmail);
            setVerifyModalOpen(true);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
        if (!isSetupModalOpen && !isVerifyModalOpen) {
            setIsLoading(false);
        }
    }
  }

  const handleAdminSetupSuccess = (email: string) => {
    setSetupModalOpen(false);
    setEmailToVerify(email);
    setVerifyModalOpen(true);
    setIsLoading(false);
  };
  
  const handleVerificationSuccess = (isAdmin: boolean) => {
    setVerifyModalOpen(false);
    form.reset(); 
    setIsLoading(false); 
    if (isAdmin) {
      toast({
        title: "¡Cuenta Verificada!",
        description: "Tu cuenta de administrador está lista. Inicia sesión con tus nuevas credenciales.",
      });
    } else {
       toast({
        title: "¡Verificación Completa!",
        description: "Tu cuenta ha sido verificada. Ahora espera la aprobación del administrador.",
      });
    }
     router.push("/");
  }
  
  const handleModalClose = () => {
    setSetupModalOpen(false);
    setVerifyModalOpen(false);
    setIsLoading(false);
  }

  return (
    <>
      <AdminSetupModal
        isOpen={isSetupModalOpen}
        onClose={handleModalClose}
        onSuccess={handleAdminSetupSuccess}
      />
      <VerifyTokenModal
        isOpen={isVerifyModalOpen}
        onClose={handleModalClose}
        email={emailToVerify}
        onSuccess={handleVerificationSuccess}
      />
      <Card className="w-full max-w-sm mt-8 z-10">
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Introduce tu email para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@ejemplo.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          {...field}
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowPassword((prev) => !prev)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Sesión
              </Button>
              <div className="text-center text-sm">
                ¿No tienes una cuenta?{" "}
                <Link href="/register" className="underline text-accent">
                  Regístrate
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
