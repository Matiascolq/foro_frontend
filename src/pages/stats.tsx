// src/pages/stats.tsx
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"

export function StatsPage() {
  const { user } = useAuth()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader
          user={
            user
              ? {
                  email: user.email,
                  rol: user.rol,
                }
              : undefined
          }
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Estadísticas del Foro
              </h1>
              <p className="text-sm text-muted-foreground">
                Aquí más adelante vamos a mostrar métricas de uso del foro UDP
                (posts por foro, actividad reciente, etc.).
              </p>
            </div>

            <Card className="border border-border/70 bg-card/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Próximamente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Esta sección todavía no está conectada al backend. La dejamos
                  visible para que se entienda que habrá un módulo de
                  estadísticas, pero por ahora solo muestra este mensaje.
                </p>
                <p>
                  Una vez que tengamos endpoints de métricas podremos mostrar:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Posts por foro y por carrera.</li>
                  <li>Foros más activos de la semana.</li>
                  <li>Participación por usuario.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
