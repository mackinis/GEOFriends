
import { MessageSquare } from "lucide-react";

export default function ChatPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-background p-4 text-center">
      <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
      <h2 className="mt-4 text-xl font-semibold">Selecciona un chat</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Elige una conversación de la barra lateral o empieza una nueva desde la página de Miembros.
      </p>
    </div>
  );
}
