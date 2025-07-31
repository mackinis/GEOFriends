import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function AdminAppSettingsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración de la Aplicación</CardTitle>
                <CardDescription>Gestiona las características y permisos principales de la aplicación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="allow-registration" className="text-base">Permitir Registro de Nuevos Usuarios</Label>
                        <p className="text-sm text-muted-foreground">
                            Si se desactiva, la página de registro será deshabilitada.
                        </p>
                    </div>
                    <Switch id="allow-registration" defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="force-approval" className="text-base">Requerir Aprobación del Admin para Nuevos Usuarios</Label>
                        <p className="text-sm text-muted-foreground">
                           Si está activado, los nuevos usuarios deben ser aprobados antes de poder iniciar sesión.
                        </p>
                    </div>
                    <Switch id="force-approval" defaultChecked />
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="global-chat" className="text-base">Habilitar Chat Global</Label>
                        <p className="text-sm text-muted-foreground">
                           Permitir a todos los usuarios participar en la sala de chat general.
                        </p>
                    </div>
                    <Switch id="global-chat" defaultChecked />
                </div>
                <Button>Guardar Cambios</Button>
            </CardContent>
        </Card>
    )
}
