"use client"

import { useEffect, useState, FormEvent } from "react"
import { useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

import {
  Plus,
  Calendar,
  User,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  CalendarDays,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

type Event = {
  id_evento: number
  nombre: string
  descripcion: string
  fecha: string
  creador_id: number | null
  creador_email: string | null
  created_at: string | null
  updated_at?: string | null
}

// Extraemos solo la parte fecha "YYYY-MM-DD"
const extractDatePart = (raw: string | null | undefined): string => {
  if (!raw) return ""
  const [datePart] = raw.split("T")
  return datePart ?? ""
}

// Parseamos "YYYY-MM-DD" como fecha LOCAL (sin UTC)
const parseLocalDate = (raw: string | null | undefined): Date | null => {
  const datePart = extractDatePart(raw ?? "")
  if (!datePart) return null
  const [y, m, d] = datePart.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d) // Año, mes-1, día en zona local
}

// Para usar en <input type="date">
const toDateInputValue = (dateString: string): string => {
  return extractDatePart(dateString)
}

// Formato largo en español para mostrar fecha de evento
const formatEventDateLong = (raw: string): string => {
  const d = parseLocalDate(raw)
  if (!d) return ""
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function CrearEvento() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])

  const [loading, setLoading] = useState(false)
  const [savingCreate, setSavingCreate] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  const [newEventName, setNewEventName] = useState("")
  const [newEventDescription, setNewEventDescription] = useState("")
  const [newEventDate, setNewEventDate] = useState("")

  const [editEventName, setEditEventName] = useState("")
  const [editEventDescription, setEditEventDescription] = useState("")
  const [editEventDate, setEditEventDate] = useState("")

  // ================== AUTH GUARD + CARGA INICIAL ==================
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    if (!user) return

    void loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  const loadEvents = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [all, mine] = await Promise.all([
        api.getEvents(),
        api.getMyEvents(user.id_usuario),
      ])

      setAllEvents((all || []) as Event[])
      setMyEvents((mine || []) as Event[])
    } catch (error) {
      console.error("❌ Error cargando eventos:", error)
      toast.error("No se pudieron cargar los eventos.")
    } finally {
      setLoading(false)
    }
  }

  // ================== HELPERS DE FECHAS / ESTADO ==================
  const isEventPast = (eventDate: string) => {
    const d = parseLocalDate(eventDate)
    if (!d) return false

    const today = new Date()
    const todayLocal = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )

    return d < todayLocal
  }

  const isEventToday = (eventDate: string) => {
    const d = parseLocalDate(eventDate)
    if (!d) return false

    const today = new Date()
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    )
  }

  const isEventSoon = (eventDate: string) => {
    const d = parseLocalDate(eventDate)
    if (!d) return false

    const today = new Date()
    const todayLocal = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )

    const diffTime = d.getTime() - todayLocal.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays > 0
  }

  const getEventBadge = (eventDate: string) => {
    if (isEventPast(eventDate)) {
      return <Badge variant="secondary">Pasado</Badge>
    } else if (isEventToday(eventDate)) {
      return (
        <Badge variant="default" className="bg-red-500 hover:bg-red-600">
          ¡Hoy!
        </Badge>
      )
    } else if (isEventSoon(eventDate)) {
      return (
        <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
          Próximo
        </Badge>
      )
    } else {
      return <Badge variant="outline">Futuro</Badge>
    }
  }

  const canEditOrDelete = (event: Event) => {
    if (!user) return false
    return user.email === event.creador_email || user.rol === "moderador"
  }

  const canAdminDelete = (event: Event) => {
    if (!user) return false
    return user.rol === "moderador" && user.email !== event.creador_email
  }

  // ================== CREAR EVENTO ==================
  const handleCreateEvent = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!newEventName.trim() || !newEventDescription.trim() || !newEventDate) {
      toast.error("Completa todos los campos del evento.")
      return
    }

    const token = localStorage.getItem("token") || ""
    setSavingCreate(true)

    try {
      await api.createEvent(
        {
          nombre: newEventName.trim(),
          descripcion: newEventDescription.trim(),
          fecha: newEventDate, // "YYYY-MM-DD"
          creadorID: user.id_usuario,
        },
        token,
      )

      toast.success("Evento creado exitosamente.")
      setIsCreateDialogOpen(false)
      setNewEventName("")
      setNewEventDescription("")
      setNewEventDate("")
      await loadEvents()
    } catch (error) {
      console.error("❌ Error creando evento:", error)
      toast.error("Error al crear el evento.")
    } finally {
      setSavingCreate(false)
    }
  }

  // ================== EDITAR EVENTO ==================
  const openEditDialog = (event: Event) => {
    setEditingEvent(event)
    setEditEventName(event.nombre)
    setEditEventDescription(event.descripcion)
    setEditEventDate(toDateInputValue(event.fecha))
    setIsEditDialogOpen(true)
  }

  const handleEditEvent = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !editingEvent) return

    if (!editEventName.trim() || !editEventDescription.trim() || !editEventDate) {
      toast.error("Completa todos los campos del evento.")
      return
    }

    const token = localStorage.getItem("token") || ""
    setSavingEdit(true)

    try {
      await api.updateEvent(
        editingEvent.id_evento,
        {
          nombre: editEventName.trim(),
          descripcion: editEventDescription.trim(),
          fecha: editEventDate, // "YYYY-MM-DD"
        },
        token,
      )

      toast.success("Evento actualizado exitosamente.")
      setIsEditDialogOpen(false)
      setEditingEvent(null)
      setEditEventName("")
      setEditEventDescription("")
      setEditEventDate("")
      await loadEvents()
    } catch (error) {
      console.error("❌ Error actualizando evento:", error)
      toast.error("Error al actualizar el evento.")
    } finally {
      setSavingEdit(false)
    }
  }

  // ================== ELIMINAR EVENTO ==================
  const handleDeleteEvent = async (eventId: number, isAdmin = false) => {
    if (!user) return
    const confirmDelete = window.confirm(
      "¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.",
    )
    if (!confirmDelete) return

    const token = localStorage.getItem("token") || ""

    try {
      if (isAdmin) {
        await api.adminDeleteEvent(eventId, token)
      } else {
        await api.deleteEvent(eventId, token)
      }

      toast.success("Evento eliminado correctamente.")
      await loadEvents()
    } catch (error) {
      console.error("❌ Error eliminando evento:", error)
      toast.error("Error al eliminar el evento.")
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Gestión de Eventos
                </h1>
                <p className="text-sm text-muted-foreground">
                  Crea y administra eventos para la comunidad de la FIC.
                </p>
              </div>

              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Crear nuevo evento</DialogTitle>
                    <DialogDescription>
                      Programa un evento para compartir con la comunidad.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre del evento</Label>
                      <Input
                        id="name"
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        placeholder="Ej: Charla de Arquitectura de Software"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={newEventDescription}
                        onChange={(e) => setNewEventDescription(e.target.value)}
                        placeholder="Describe el objetivo, la modalidad, lugar, etc."
                        rows={4}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="date">Fecha del evento</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={savingCreate}>
                        {savingCreate ? "Creando..." : "Crear evento"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Card principal de eventos */}
            <Card className="border border-border/70 bg-card/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <CalendarDays className="h-5 w-5" />
                  Eventos de la comunidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="all">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Todos los eventos ({allEvents.length})
                    </TabsTrigger>
                    <TabsTrigger value="my">
                      <Users className="mr-2 h-4 w-4" />
                      Mis eventos ({myEvents.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4 space-y-4">
                    {loading ? (
                      <p className="text-sm text-muted-foreground">
                        Cargando eventos...
                      </p>
                    ) : allEvents.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        <p>No hay eventos programados.</p>
                        <p className="mt-1">
                          ¡Sé el primero en crear un evento para tu curso o
                          carrera!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allEvents.map((event) => (
                          <Card
                            key={event.id_evento}
                            className={`border-l-4 ${
                              isEventPast(event.fecha)
                                ? "border-l-gray-400"
                                : isEventToday(event.fecha)
                                ? "border-l-red-500"
                                : isEventSoon(event.fecha)
                                ? "border-l-orange-500"
                                : "border-l-blue-500"
                            }`}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">
                                      {event.nombre}
                                    </h3>
                                    {getEventBadge(event.fecha)}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>
                                        Creado por:{" "}
                                        {event.creador_email ?? "Desconocido"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {formatEventDateLong(event.fecha)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {canEditOrDelete(event) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {user?.email === event.creador_email && (
                                        <DropdownMenuItem
                                          onClick={() => openEditDialog(event)}
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          Editar
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDeleteEvent(
                                            event.id_evento,
                                            canAdminDelete(event),
                                          )
                                        }
                                        className="text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {event.descripcion}
                              </p>
                              {event.updated_at && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    Actualizado:{" "}
                                    {new Date(
                                      event.updated_at,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="my" className="mt-4 space-y-4">
                    {loading ? (
                      <p className="text-sm text-muted-foreground">
                        Cargando eventos...
                      </p>
                    ) : myEvents.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        <p>No has creado eventos aún.</p>
                        <p className="mt-1">
                          Crea tu primer evento para compartirlo con la
                          comunidad.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myEvents.map((event) => (
                          <Card
                            key={event.id_evento}
                            className={`border-l-4 ${
                              isEventPast(event.fecha)
                                ? "border-l-gray-400"
                                : isEventToday(event.fecha)
                                ? "border-l-red-500"
                                : isEventSoon(event.fecha)
                                ? "border-l-orange-500"
                                : "border-l-green-500"
                            }`}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">
                                      {event.nombre}
                                    </h3>
                                    {getEventBadge(event.fecha)}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {formatEventDateLong(event.fecha)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => openEditDialog(event)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeleteEvent(event.id_evento)
                                      }
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {event.descripcion}
                              </p>
                              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    Creado:{" "}
                                    {new Date(
                                      event.created_at ?? event.fecha,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                {event.updated_at && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      Actualizado:{" "}
                                      {new Date(
                                        event.updated_at,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CrearEvento
