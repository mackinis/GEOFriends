
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getTimingSettings, updateTimingSettings, TimingSettings } from "@/app/actions/settings";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from "@/components/ui/form";


const formSchema = z.object({
    editMessageTime: z.coerce.number().min(0, "El tiempo debe ser un número positivo."),
    deleteMessageTime: z.coerce.number().min(0, "El tiempo debe ser un número positivo."),
    gpsInactiveTime: z.coerce.number().min(1, "El tiempo debe ser de al menos 1 segundo."),
    gpsQueryTimeout: z.coerce.number().min(1, "El timeout debe ser de al menos 1 segundo."),
});


export default function AdminTimingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            editMessageTime: 0,
            deleteMessageTime: 0,
            gpsInactiveTime: 60,
            gpsQueryTimeout: 10,
        },
    });

    useEffect(() => {
        async function fetchSettings() {
            setIsFetching(true);
            try {
                const settings = await getTimingSettings();
                if (settings) {
                    form.reset({
                        editMessageTime: Number(settings.editMessageTime) || 0,
                        deleteMessageTime: Number(settings.deleteMessageTime) || 0,
                        gpsInactiveTime: Number(settings.gpsInactiveTime) || 60,
                        gpsQueryTimeout: (Number(settings.gpsQueryTimeout) || 10000) / 1000,
                    });
                }
            } catch (error) {
                 toast({
                    title: "Error",
                    description: "No se pudo cargar la configuración de tiempos.",
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
            const valuesToSave = {
                ...values,
                gpsQueryTimeout: values.gpsQueryTimeout * 1000,
            };
            await updateTimingSettings(valuesToSave);
            toast({
                title: "¡Éxito!",
                description: "La configuración de tiempos ha sido actualizada.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo guardar la configuración de tiempos.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajustes de Tiempos</CardTitle>
        <CardDescription>Configura los límites de tiempo para varias acciones en la aplicación.</CardDescription>
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
                    name="editMessageTime"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Tiempo para Editar Mensajes (segundos)</Label>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Tiempo que un usuario tiene para editar su último mensaje.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deleteMessageTime"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Tiempo para Borrar Mensajes (segundos)</Label>
                        <FormControl>
                           <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Tiempo que un usuario tiene para borrar su último mensaje.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gpsInactiveTime"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Tiempo de Inactividad del GPS (segundos)</Label>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                         <FormDescription>Si el GPS de un usuario no reporta por este tiempo, dejará de ver a otros en el mapa.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gpsQueryTimeout"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Timeout de Consulta GPS (segundos)</Label>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                         <FormDescription>Tiempo máximo de espera para obtener una nueva ubicación del GPS. Valor por defecto: 10 segundos.</FormDescription>
                        <FormMessage />
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
  );
}
