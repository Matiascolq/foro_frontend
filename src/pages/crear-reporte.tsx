"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { toast } from "sonner"
import {
  AlertTriangle,
  FileText,
  MessageSquare,
  Plus,
  MoreVertical,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Trash2,
} from "lucide-react"

import { RAZONES_REPORTE } from "@/lib/constants"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

type Report = {
  id_reporte: number
  contenido_id: number
  tipo_contenido: string // "post" | "comentario"
  razon: string
  fecha: string
  reportado_por: number
  estado: string // "pendiente" | "revisado" | "resuelto" | "descartado"
  revisado_por?: number
  fecha_revision?: string
  reportado_por_email?: string
  revisado_por_email?: string
}

type Moderator = {
  email: string
  name: string
}

export function CrearReporte() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [loading, setLoading] = useState(false)

  // Crear reporte
  const [contenidoId, setContenidoId] = useState("")
  const [tipoContenido, setTipoContenido] = useState("")
  const [razonSeleccionada, setRazonSeleccionada] = useState("")

  // Listas
  const [myReports, setMyReports] = useState<Report[]>([])
  const [allReports, setAllReports] = useState<Report[]>([])

  // Asignación de tareas
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<Report | null>(null)
  const [moderators, setModerators] = useState<Moderator[]>([])
  const [selectedModerator, setSelectedModerator] = useState("")
  const [assignComment, setAssignComment] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)

  // ================== EFFECT PRINCIPAL ==================
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    if (!user) return

    void loadMyReports()
    if (user.rol === "moderador") {
      void loadAllReports()
    }
  }, [isAuthenticated, user, navigate])

  // ================== LOADERS ==================

  const loadMyReports = async () => {
    if (!user) return
    try {
      const reports = (await api.getMyReports(user.id_usuario)) as Report[]
      setMyReports(reports || [])
    } catch (error) {
      console.error("Error cargando mis reportes:", error)
      toast.error("No se pudieron cargar tus reportes.")
    }
  }

  const loadAllReports = async () => {
    try {
      const reports = (await api.getAllReports()) as Report[]
      setAllReports(reports || [])
    } catch (error) {
      console.error("Error cargando todos los reportes:", error)
      toast.error("No se pudieron cargar los reportes.")
    }
  }

  const loadModerators = async () => {
    try {
      const mods = (await api.getModerators()) as Moderator[]
      setModerators(mods || [])
    } catch (error) {
      console.error("Error cargando moderadores:", error)
      toast.error("No se pudo cargar la lista de moderadores.")
    }
  }

  // ================== CREAR REPORTE ==================

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contenidoId.trim() || !tipoContenido || !razonSeleccionada.trim()) {
      toast.error("Todos los campos son obligatorios.")
      return
    }

    if (!user) {
      toast.error("No se pudo identificar al usuario.")
      return
    }

    const razonFinal =
      RAZONES_REPORTE.find((r) => r.value === razonSeleccionada)?.label ||
      razonSeleccionada

    try {
      setLoading(true)
      await api.createReport({
        contenidoId: Number(contenidoId),
        tipoContenido,
        razon: razonFinal,
        reportadoPorId: user.id_usuario,
      })
      toast.success("Reporte creado exitosamente.")

      setContenidoId("")
      setTipoContenido("")
      setRazonSeleccionada("")
      void loadMyReports()
    } catch (error) {
      console.error("Error creando reporte:", error)
      toast.error("No se pudo crear el reporte.")
    } finally {
      setLoading(false)
    }
  }

  // ================== ESTADOS / ELIMINAR ==================

  const handleUpdateStatus = async (report: Report, status: string) => {
    try {
      setLoading(true)
      await api.updateReportStatus(report.id_reporte, status)
      toast.success("Estado del reporte actualizado.")
      void loadAllReports()
    } catch (error) {
      console.error("Error actualizando estado del reporte:", error)
      toast.error("No se pudo actualizar el estado.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReport = async (
    reportId: number,
    isAdmin: boolean = false,
  ) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este reporte?")) return

    try {
      setLoading(true)
      if (isAdmin) {
        await api.adminDeleteReport(reportId)
      } else {
        await api.deleteReport(reportId)
      }
      toast.success("Reporte eliminado correctamente.")
      void loadMyReports()
      if (user?.rol === "moderador") {
        void loadAllReports()
      }
    } catch (error) {
      console.error("Error eliminando reporte:", error)
      toast.error("No se pudo eliminar el reporte.")
    } finally {
      setLoading(false)
    }
  }

  // ================== ASIGNACIÓN ==================

  const openAssignDialog = (report: Report) => {
    setAssignTarget(report)
    setSelectedModerator("")
    setAssignComment("")
    setIsAssignDialogOpen(true)
    void loadModerators()
  }

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assignTarget || !selectedModerator.trim()) {
      toast.error("Selecciona un moderador.")
      return
    }

    if (assignComment.length > 500) {
      toast.error("El comentario no puede exceder 500 caracteres.")
      return
    }

    const comment = assignComment.trim() || "Sin comentarios adicionales"

    try {
      setAssignLoading(true)
      await api.assignModerationTask({
        report_id: assignTarget.id_reporte,
        moderator_email: selectedModerator,
        comentario: comment,
      })

      toast.success("Tarea de moderación asignada.")
      setIsAssignDialogOpen(false)
      setSelectedModerator("")
      setAssignComment("")
      setAssignTarget(null)
      void loadAllReports()
    } catch (error) {
      console.error("Error asignando tarea de moderación:", error)
      toast.error("No se pudo asignar la tarea.")
    } finally {
      setAssignLoading(false)
    }
  }

  // ================== HELPERS ==================

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendiente: {
        variant: "secondary" as const,
        icon: Clock,
        text: "Pendiente",
      },
      revisado: {
        variant: "default" as const,
        icon: MessageSquare,
        text: "Revisado",
      },
      resuelto: {
        variant: "default" as const,
        icon: CheckCircle,
        text: "Resuelto",
      },
      descartado: {
        variant: "destructive" as const,
        icon: XCircle,
        text: "Descartado",
      },
    }

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.pendiente
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // ================== UI ==================

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                Gestión de Reportes
              </h1>
            </div>

            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="create">Crear Reporte</TabsTrigger>
                <TabsTrigger value="my-reports">Mis Reportes</TabsTrigger>
                {user?.rol === "moderador" && (
                  <TabsTrigger value="all-reports">
                    Todos los Reportes
                  </TabsTrigger>
                )}
              </TabsList>

              {/* ===== CREAR REPORTE ===== */}
              <TabsContent value="create" className="space-y-4">
                <Card className="border border-border/70 bg-card/70 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Crear Nuevo Reporte
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleCreateReport}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="contenido-id">
                            ID del Contenido *
                          </Label>
                          <Input
                            id="contenido-id"
                            type="number"
                            value={contenidoId}
                            onChange={(e) => setContenidoId(e.target.value)}
                            placeholder="Ej: 123"
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Puedes encontrar el ID en la URL de la publicación o
                            comentario.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tipo-contenido">
                            Tipo de Contenido *
                          </Label>
                          <Select
                            value={tipoContenido}
                            onValueChange={setTipoContenido}
                            required
                          >
                            <SelectTrigger id="tipo-contenido">
                              <SelectValue placeholder="Selecciona el tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="post">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Publicación
                                </div>
                              </SelectItem>
                              <SelectItem value="comentario">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Comentario
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="razon">Razón del Reporte *</Label>
                        <Select
                          value={razonSeleccionada}
                          onValueChange={setRazonSeleccionada}
                          required
                        >
                          <SelectTrigger id="razon">
                            <SelectValue placeholder="Selecciona una razón" />
                          </SelectTrigger>
                          <SelectContent>
                            {RAZONES_REPORTE.map((razon) => (
                              <SelectItem
                                key={razon.value}
                                value={razon.value}
                              >
                                {razon.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? "Creando reporte..." : "Crear Reporte"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== MIS REPORTES ===== */}
              <TabsContent value="my-reports" className="space-y-4">
                <Card className="border border-border/70 bg-card/70 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Mis Reportes ({myReports.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {myReports.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <AlertTriangle className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>No has creado ningún reporte.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myReports.map((report) => (
                          <Card
                            key={report.id_reporte}
                            className="border-l-4 border-l-orange-500"
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">
                                      {report.tipo_contenido === "post"
                                        ? "Publicación"
                                        : "Comentario"}{" "}
                                      #{report.contenido_id}
                                    </Badge>
                                    {getStatusBadge(report.estado)}
                                    <span className="text-sm text-muted-foreground">
                                      {formatDate(report.fecha)}
                                    </span>
                                  </div>
                                  <p className="mb-2 text-sm">{report.razon}</p>
                                  {report.fecha_revision && (
                                    <p className="text-xs text-muted-foreground">
                                      Revisado el{" "}
                                      {formatDate(report.fecha_revision)}
                                    </p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeleteReport(report.id_reporte)
                                      }
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== TODOS LOS REPORTES (MODERADOR) ===== */}
              {user?.rol === "moderador" && (
                <TabsContent value="all-reports" className="space-y-4">
                  <Card className="border border-border/70 bg-card/70 backdrop-blur">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Todos los Reportes ({allReports.length})
                        </CardTitle>
                        <Button
                          onClick={() => void loadAllReports()}
                          size="sm"
                          disabled={loading}
                        >
                          Actualizar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {allReports.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <AlertTriangle className="mx-auto mb-4 h-12 w-12 opacity-50" />
                          <p>No hay reportes en el sistema.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {allReports.map((report) => (
                            <Card
                              key={report.id_reporte}
                              className="border-l-4 border-l-blue-500"
                            >
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">
                                        {report.tipo_contenido === "post"
                                          ? "Publicación"
                                          : "Comentario"}{" "}
                                        #{report.contenido_id}
                                      </Badge>
                                      {getStatusBadge(report.estado)}
                                      <span className="text-sm text-muted-foreground">
                                        {formatDate(report.fecha)}
                                      </span>
                                    </div>
                                    <p className="mb-2 text-sm">
                                      {report.razon}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                      <span>
                                        Reportado por:{" "}
                                        {report.reportado_por_email ||
                                          `ID: ${report.reportado_por}`}
                                      </span>
                                      {report.revisado_por && (
                                        <span>
                                          Revisado por:{" "}
                                          {report.revisado_por_email ||
                                            `ID: ${report.revisado_por}`}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-2 sm:flex-row">
                                    {report.estado === "pendiente" && (
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            openAssignDialog(report)
                                          }
                                          disabled={loading}
                                        >
                                          <Users className="mr-1 h-4 w-4" />
                                          Asignar
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleUpdateStatus(
                                              report,
                                              "revisado",
                                            )
                                          }
                                          disabled={loading}
                                        >
                                          Marcar revisado
                                        </Button>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() =>
                                            handleUpdateStatus(
                                              report,
                                              "resuelto",
                                            )
                                          }
                                          disabled={loading}
                                        >
                                          Resolver
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() =>
                                            handleUpdateStatus(
                                              report,
                                              "descartado",
                                            )
                                          }
                                          disabled={loading}
                                        >
                                          Descartar
                                        </Button>
                                      </div>
                                    )}

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleDeleteReport(
                                              report.id_reporte,
                                              true,
                                            )
                                          }
                                          className="text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Eliminar (Admin)
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </SidebarInset>

      {/* ===== MODAL ASIGNAR TAREA ===== */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Asignar Tarea de Moderación
            </DialogTitle>
            <DialogDescription>
              Asigna este reporte a otro moderador para su revisión. El
              moderador recibirá una notificación automática (lado backend).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignTask}>
            <div className="space-y-4">
              {assignTarget && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline">
                      {assignTarget.tipo_contenido === "post"
                        ? "Publicación"
                        : "Comentario"}{" "}
                      #{assignTarget.contenido_id}
                    </Badge>
                    <Badge variant="destructive">Pendiente</Badge>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    {assignTarget.razon}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reportado el {formatDate(assignTarget.fecha)} por{" "}
                    {assignTarget.reportado_por_email ||
                      `ID: ${assignTarget.reportado_por}`}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="moderator">Asignar a Moderador *</Label>
                <Select
                  value={selectedModerator}
                  onValueChange={setSelectedModerator}
                  required
                >
                  <SelectTrigger id="moderator">
                    <SelectValue placeholder="Selecciona un moderador" />
                  </SelectTrigger>
                  <SelectContent>
                    {moderators.map((moderator) => (
                      <SelectItem
                        key={moderator.email}
                        value={moderator.email}
                      >
                        {moderator.name} ({moderator.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">
                  Comentario Adicional (Opcional)
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Agrega instrucciones específicas o contexto para el moderador asignado..."
                  value={assignComment}
                  onChange={(e) => setAssignComment(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Opcional - Máximo 500 caracteres</span>
                  <span>{assignComment.length}/500</span>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> El moderador asignado recibirá los
                  detalles de la tarea desde el backend, incluyendo tu
                  comentario.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
                disabled={assignLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={assignLoading || !selectedModerator.trim()}
              >
                {assignLoading ? "Asignando..." : "Asignar Tarea"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

export default CrearReporte
