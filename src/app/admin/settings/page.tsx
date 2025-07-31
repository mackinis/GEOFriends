
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaletteSuggester from "@/components/admin/palette-suggester";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getBrandingSettings, updateBrandingSettings, BrandingSettings } from "@/app/actions/settings";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";


const formSchema = z.object({
    siteName: z.string().min(1, "El nombre del sitio es requerido."),
    copyright: z.string().min(1, "El copyright es requerido."),
    developer: z.string().min(1, "El desarrollador es requerido."),
    developerWeb: z.string().url("Debe ser una URL válida.").or(z.literal("")),
    markerOpacity: z.number().min(0).max(1),
});


export default function AdminSettingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            siteName: "",
            copyright: "",
            developer: "",
            developerWeb: "",
            markerOpacity: 1,
        },
    });

    const markerOpacityValue = form.watch("markerOpacity");

    useEffect(() => {
        async function fetchSettings() {
            setIsFetching(true);
            try {
                const settings = await getBrandingSettings();
                if (settings) {
                    form.reset(settings);
                }
            } catch (error) {
                 toast({
                    title: "Error",
                    description: "No se pudo cargar la configuración.",
                    variant: "destructive",
                });
            } finally {
                setIsFetching(false);
            }
        }
        fetchSettings();
    }, [form, toast]);


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            await updateBrandingSettings(values);
            toast({
                title: "¡Éxito!",
                description: "La configuración de la marca ha sido actualizada.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo guardar la configuración.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marca y Personalización</CardTitle>
          <CardDescription>Modifica la marca e información de todo el sitio.</CardDescription>
        </CardHeader>
        <CardContent>
            {isFetching ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Título de la Pestaña del Navegador</Label>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="copyright"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Texto de Copyright</Label>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="developer"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Crédito del Desarrollador</Label>
                          <FormControl>
                           <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="developerWeb"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Web del Desarrollador</Label>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                        control={form.control}
                        name="markerOpacity"
                        render={({ field: { value, onChange } }) => (
                            <FormItem>
                                <Label>Opacidad de Marcadores del Mapa ({Math.round(value * 100)}%)</Label>
                                <FormControl>
                                    <Slider
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        value={[value]}
                                        onValueChange={(vals) => onChange(vals[0])}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isLoading}>
                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </form>
             </Form>
            )}
        </CardContent>
      </Card>
      <Separator />
      <PaletteSuggester />
    </div>
  );
}
