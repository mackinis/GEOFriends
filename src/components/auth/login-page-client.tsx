
"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { getBrandingSettings, BrandingSettings } from "@/app/actions/settings";
import { MapPin } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function LoginPageClient() {
    const [branding, setBranding] = useState<BrandingSettings | null>(null);

    useEffect(() => {
        async function fetchBranding() {
            const settings = await getBrandingSettings();
            setBranding(settings);
        }
        fetchBranding();
    }, []);

    if (!branding) {
        return (
             <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/50 to-background z-0">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            </div>
            
            <div className="relative z-10 w-full flex flex-1 flex-col items-center justify-center">
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <MapPin className="h-12 w-12 text-accent text-glow" />
                        <h1 className="text-5xl font-bold text-white text-glow">{branding.siteName}</h1>
                    </div>
                    <p className="text-md sm:text-lg text-muted-foreground">Conéctate con tu grupo en tiempo real.</p>
                </div>
                <LoginForm />
            </div>

            <footer className="relative z-10 w-full text-center py-4 mt-auto text-xs text-muted-foreground">
                <span className="mr-1">{branding.copyright}</span>
                <a href={branding.developerWeb} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline ml-1">{branding.developer}</a>
            </footer>
        </div>
    );
}
