"use client";

import { RegisterForm } from "@/components/auth/register-form";
import { MapPin } from "lucide-react";
import { useState } from "react";
import VerifyTokenModal from "@/components/auth/verify-token-modal";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [isVerifyModalOpen, setVerifyModalOpen] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const handleRegisterSuccess = (email: string) => {
    setEmailToVerify(email);
    setVerifyModalOpen(true);
  };
  
  const handleVerificationSuccess = () => {
    setVerifyModalOpen(false);
    toast({
      title: "¡Verificación Completa!",
      description: "Tu cuenta ha sido verificada. Ahora espera la aprobación del administrador para iniciar sesión.",
    });
    router.push("/");
  };
  
  const handleCloseVerifyModal = () => {
    setVerifyModalOpen(false);
  }

  return (
    <>
      <VerifyTokenModal
        isOpen={isVerifyModalOpen}
        onClose={handleCloseVerifyModal}
        email={emailToVerify}
        onSuccess={() => handleVerificationSuccess()}
      />
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/50 to-background z-0"></div>
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2 text-primary mb-4">
            <MapPin className="h-12 w-12 text-accent text-glow" />
            <h1 className="text-5xl font-bold text-white text-glow">GeoFriends</h1>
          </div>
          <RegisterForm onSuccess={handleRegisterSuccess} />
        </div>
      </div>
    </>
  );
}
