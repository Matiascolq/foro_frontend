// src/pages/rules.tsx
"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Shield, Users, MessageSquare } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export function RulesPage() {
  const { user } = useAuth()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col p-4">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
            {/* Título */}
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Normas de Convivencia
              </h1>
              <p className="text-sm text-muted-foreground">
                Reglas básicas para mantener el Foro UDP como un espacio seguro, respetuoso y útil para toda la
                comunidad.
              </p>
            </div>

            {/* Aviso principal */}
            <Card className="border border-yellow-500/60 bg-yellow-500/10">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
                <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg">
                    Respeto por sobre todo
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    El objetivo del foro es apoyar el aprendizaje, coordinar actividades y compartir información
                    académica. Cualquier falta grave de respeto puede significar la suspensión o expulsión del sistema.
                  </p>
                </div>
              </CardHeader>
            </Card>

            {/* Normas principales */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border border-border/70 bg-card/70 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">
                      1. Cero tolerancia a odio y discriminación
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    No se permite contenido que promueva{" "}
                    <strong>racismo, xenofobia, homofobia, sexismo</strong> ni ningún tipo de discurso de odio o
                    discriminación.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Evita insultos, burlas o ataques personales.</li>
                    <li>Respeta identidades, contextos culturales y realidades distintas a la tuya.</li>
                    <li>Si un mensaje te incomoda, repórtalo en vez de escalar el conflicto.</li>
                  </ul>
                  <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                    Respeto básico
                  </Badge>
                </CardContent>
              </Card>

              <Card className="border border-border/70 bg-card/70 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">
                      2. Comunicación responsable
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Cuida el tono de tus mensajes: puedes estar en desacuerdo sin faltar el respeto.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Evita lenguaje agresivo, amenazas o acoso.</li>
                    <li>No compartas datos personales tuyos ni de terceros sin consentimiento.</li>
                    <li>Recuerda que los mensajes pueden ser revisados por moderación.</li>
                  </ul>
                  <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                    Comunicación asertiva
                  </Badge>
                </CardContent>
              </Card>

              <Card className="border border-border/70 bg-card/70 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">
                      3. Enfoque académico y comunitario
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    El foro está pensado para temas relacionados con la universidad, las asignaturas y la vida
                    académica.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Evita spam, publicidad o venta de productos no autorizados.</li>
                    <li>Usa cada foro temático para lo que corresponde.</li>
                    <li>Comparte material que realmente aporte a la comunidad.</li>
                  </ul>
                  <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                    Foco académico
                  </Badge>
                </CardContent>
              </Card>

              <Card className="border border-border/70 bg-card/70 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">
                      4. Moderación y consecuencias
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    El equipo de moderación puede intervenir cuando se vulneren estas normas.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Advertencias por mensajes fuera de norma.</li>
                    <li>Eliminación de contenido que infrinja las reglas.</li>
                    <li>Suspensión temporal o definitiva en casos graves o reiterados.</li>
                  </ul>
                  <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                    Moderación activa
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Cierre */}
            <Card className="border border-border/70 bg-card/70 backdrop-blur">
              <CardContent className="py-4 text-sm text-muted-foreground">
                Al usar este foro aceptas estas normas de convivencia. Si tienes dudas o quieres sugerir mejoras a las
                reglas, puedes hacerlo a través de los canales oficiales o con tu moderador/a.
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
