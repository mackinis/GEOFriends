"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Copy } from "lucide-react";
import { suggestPalette } from "@/ai/flows/suggest-palette";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  persona: z.string().min(10, "Por favor describe la persona en al menos 10 caracteres."),
});

export default function PaletteSuggester() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      persona: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestPalette({ personaDescription: values.persona });
      if (result.paletteSuggestions) {
        setSuggestions(result.paletteSuggestions);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo sugerir una paleta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "¡Copiado!",
        description: `${text} copiado al portapapeles.`
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sugeridor de Paleta de Colores con IA</CardTitle>
        <CardDescription>
          Describe la persona de tu grupo y nuestra IA sugerirá una paleta de colores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="persona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona del Grupo</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Una startup tecnológica profesional y minimalista enfocada en la productividad." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sugerir Paleta
            </Button>
          </form>
        </Form>
        {suggestions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Sugerencias</h3>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {suggestions.map((color) => (
                <div key={color} className="flex flex-col items-center gap-2">
                  <div
                    className="h-16 w-16 rounded-lg border-2 border-border"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono">{color}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(color)}>
                        <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Para hacer los colores permanentes, convierte HEX a HSL y actualiza los valores en `globals.css`.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
