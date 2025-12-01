// src/pages/documents.tsx
"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { BookOpen, ExternalLink, LayoutTemplate } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export function DocumentsPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) {
      navigate("/login")
    }
  }, [isLoading, isAuthenticated, user, navigate])

  if (isLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando sesión...</p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" user={user} />
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
            {/* Título y descripción */}
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Documentos del curso
              </h1>
              <p className="text-sm text-muted-foreground">
                Accede a recursos y materiales que complementan el uso del foro UDP,
                incluyendo herramientas creadas por estudiantes de la FIC.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Epauta */}
              <Card className="border border-border/70 bg-card/70 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <BookOpen className="h-5 w-5" />
                      Epauta
                    </CardTitle>
                    <Badge variant="outline" className="text-[11px]">
                      Hecho por estudiantes
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="leading-relaxed">
                    <strong>Epauta</strong> es una aplicación web desarrollada por
                    estudiantes que centraliza <span className="font-medium">archivos, apuntes y recursos de ramos</span>.
                    Es un complemento ideal para el foro: aquí se resuelven dudas y se
                    discuten temas, mientras que Epauta se usa como repositorio de
                    material del curso.
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    La idea es que puedas combinar ambas cosas: revisar documentos,
                    guías y resúmenes en Epauta, y usar el foro UDP para preguntar,
                    comentar y coordinarte con otros compañeros.
                  </p>
                  <div className="pt-1">
                    <Button
                      asChild
                      size="sm"
                      className="gap-2"
                    >
                      <a
                        href="https://epauta.vercel.app/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir Epauta
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Malla interactiva Informática */}
              <Card className="border border-border/70 bg-card/70 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <LayoutTemplate className="h-5 w-5" />
                      Malla interactiva de Informática
                    </CardTitle>
                    <Badge variant="outline" className="text-[11px]">
                      Plan de estudios
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="leading-relaxed">
                    La <strong>malla interactiva de Informática</strong> permite
                    visualizar el avance en la carrera de forma clara, ramo por ramo,
                    con sus prerrequisitos y relación entre asignaturas. Es una
                    herramienta muy útil para planificar tu carga académica y entender
                    cómo se conectan los contenidos que se discuten en el foro.
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    Puedes usarla para ver en qué parte de la malla estás, qué ramos
                    vienen después y cómo se articula lo que estás viendo ahora con
                    otros cursos de la FIC.
                  </p>
                  <div className="pt-1">
                    <Button
                      asChild
                      size="sm"
                      className="gap-2"
                    >
                      <a
                        href="https://malla-fic.vercel.app/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver malla interactiva
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bloque final de contexto */}
            <Card className="border border-border/70 bg-card/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  ¿Cómo se conectan estos recursos con el foro?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  El foro UDP está pensado como un espacio de discusión, apoyo entre
                  estudiantes y comunicación con ayudantes o docentes.
                </p>
                <p>
                  Herramientas como <strong>Epauta</strong> y la{" "}
                  <strong>malla interactiva de Informática</strong> complementan este
                  objetivo: permiten organizar mejor el material del curso y entender
                  el contexto de cada ramo dentro de la carrera.
                </p>
                <p>
                  A futuro, esta sección de &quot;Documentos del curso&quot; podría
                  integrar enlaces directos a archivos específicos, guías oficiales y
                  otros recursos que los docentes o ayudantes quieran destacar.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Dejo también export default por si en App.tsx se importa como default.
export default DocumentsPage
