// src/pages/system-info.tsx
"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import {
  Info,
  Server,
  RefreshCw,
  CheckCircle,
  XCircle,
  Users as UsersIcon,
  FileText,
  Bell,
  ShieldAlert,
  Activity,
  ArrowRight,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/hooks/useAuth"
import { api } from "@/lib/api"

type ServiceInfo = {
  name: string
  label?: string
  status?: string
  version?: string
  methods?: string[] | number
}

type SystemStats = {
  total_users?: number
  total_profiles?: number
  total_forums?: number
  total_posts?: number
  total_comments?: number
  total_events?: number
  total_messages?: number
  total_notifications?: number
  total_reports?: number
  pending_reports?: number
  uptime?: string
  app_version?: string
}

type SystemInfoResponse = {
  stats?: SystemStats
  services?: ServiceInfo[]
}

export default function SystemInfo() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [info, setInfo] = useState<SystemInfoResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const isModerator = user?.rol === "moderador" || user?.rol === "admin"

  // --------- CARGA INICIAL / GUARD ----------
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    void loadSystemInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const loadSystemInfo = async () => {
    const token = localStorage.getItem("token") || ""
    if (!token) {
      toast.error("Sesión no válida.")
      return
    }

    setLoading(true)
    try {
      if (typeof api.getSystemInfo !== "function") {
        console.error("api.getSystemInfo no está definido")
        toast.error("Endpoint de sistema no configurado en el frontend.")
        return
      }

      const data = await api.getSystemInfo(token)
      console.log("ℹ️ System info:", data)
      setInfo(data || {})
    } catch (error) {
      console.error("❌ Error cargando info del sistema:", error)
      toast.error("No se pudo obtener la información del sistema.")
    } finally {
      setLoading(false)
    }
  }

  // --------- HELPER STATUS BADGE ----------
  const getStatusBadge = (status?: string) => {
    if (!status) {
      return <Badge variant="outline">Desconocido</Badge>
    }

    switch (status.toLowerCase()) {
      case "running":
      case "up":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Activo
          </Badge>
        )
      case "stopped":
      case "down":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Detenido
          </Badge>
        )
      case "degraded":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Degradado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const stats = info?.stats || {}

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col p-4">
          {/* Contenedor central igual que forum-detail / post-detail */}
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
                  <Info className="h-6 w-6" />
                  Panel del Sistema
                </h1>
                <p className="text-sm text-muted-foreground">
                  Estado general de la plataforma y accesos rápidos de administración.
                </p>
                {stats.app_version && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Versión del backend:{" "}
                    <span className="font-mono">{stats.app_version}</span>
                  </p>
                )}
                {stats.uptime && (
                  <p className="text-xs text-muted-foreground">
                    Uptime: <span className="font-mono">{stats.uptime}</span>
                  </p>
                )}
              </div>

              <Button
                onClick={loadSystemInfo}
                disabled={loading}
                variant="outline"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                {loading ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>

            {/* RESUMEN GLOBAL (para admins/moderadores) */}
            {isModerator && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <UsersIcon className="h-4 w-4" />
                      Usuarios
                    </CardTitle>
                    <CardDescription>
                      Registrados en la plataforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {stats.total_users ?? "--"}
                    </div>
                    {stats.total_profiles !== undefined && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Perfiles completos: {stats.total_profiles}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Contenido
                    </CardTitle>
                    <CardDescription>
                      Foros, posts y comentarios
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Foros</span>
                      <span className="font-semibold">
                        {stats.total_forums ?? "--"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Posts</span>
                      <span className="font-semibold">
                        {stats.total_posts ?? "--"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">
                        Comentarios
                      </span>
                      <span className="font-semibold">
                        {stats.total_comments ?? "--"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Bell className="h-4 w-4" />
                      Actividad
                    </CardTitle>
                    <CardDescription>
                      Eventos, mensajes y notificaciones
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Eventos</span>
                      <span className="font-semibold">
                        {stats.total_events ?? "--"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Mensajes</span>
                      <span className="font-semibold">
                        {stats.total_messages ?? "--"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">
                        Notificaciones
                      </span>
                      <span className="font-semibold">
                        {stats.total_notifications ?? "--"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <ShieldAlert className="h-4 w-4" />
                      Moderación
                    </CardTitle>
                    <CardDescription>
                      Reportes de contenido
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total reportes
                      </span>
                      <span className="font-semibold">
                        {stats.total_reports ?? "--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Pendientes
                      </span>
                      <span className="font-semibold text-red-500">
                        {stats.pending_reports ?? "--"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 w-full justify-between"
                      onClick={() =>
                        navigate("/crear-reporte?tab=all-reports")
                      }
                    >
                      Ver reportes
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ATAJOS PARA ADMIN/MOD */}
            {isModerator && (
              <Card className="border border-border/70 bg-card/70 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Atajos administrativos
                  </CardTitle>
                  <CardDescription>
                    Accede rápido a las vistas críticas de moderación y
                    gestión.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <Button
                    variant="outline"
                    className="flex items-center justify-between"
                    onClick={() =>
                      navigate("/crear-reporte?tab=all-reports")
                    }
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <ShieldAlert className="h-4 w-4" />
                      Moderar reportes
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center justify-between"
                    onClick={() => navigate("/crear-evento")}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      Gestionar eventos
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center justify-between"
                    onClick={() => navigate("/notifications")}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Bell className="h-4 w-4" />
                      Notificaciones
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* SERVICIOS / HEALTH-CHECK */}
            <Card className="border border-border/70 bg-card/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Server className="h-5 w-5" />
                  Servicios del sistema
                </CardTitle>
                <CardDescription>
                  Estado general de los servicios internos del backend.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Cargando información de los servicios...
                  </div>
                )}

                {!loading &&
                  (!info?.services || info.services.length === 0) && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No se recibió información de servicios. <br />
                      Revisa el endpoint de{" "}
                      <span className="font-mono">
                        /admin/system-info
                      </span>
                      .
                    </div>
                  )}

                {!loading &&
                  info?.services &&
                  info.services.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {info.services.map((service) => {
                        const methodsCount =
                          typeof service.methods === "number"
                            ? service.methods
                            : Array.isArray(service.methods)
                            ? service.methods.length
                            : undefined

                        return (
                          <Card
                            key={service.name}
                            className="h-full border border-border/60"
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                  <Server className="h-4 w-4" />
                                  {service.label || service.name}
                                </CardTitle>
                                {getStatusBadge(service.status)}
                              </div>
                              {service.version && (
                                <CardDescription>
                                  Versión:{" "}
                                  <span className="font-mono">
                                    {service.version}
                                  </span>
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              {methodsCount !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Métodos expuestos
                                  </span>
                                  <span className="font-mono">
                                    {methodsCount}
                                  </span>
                                </div>
                              )}

                              {Array.isArray(service.methods) &&
                                service.methods.length > 0 && (
                                  <>
                                    <Separator className="my-2" />
                                    <div>
                                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                                        Algunos métodos:
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {service.methods
                                          .slice(0, 6)
                                          .map((m) => (
                                            <Badge
                                              key={m}
                                              variant="secondary"
                                              className="text-[10px]"
                                            >
                                              {m}
                                            </Badge>
                                          ))}
                                        {service.methods.length > 6 && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px]"
                                          >
                                            +
                                            {service.methods.length - 6} más
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
