// src/forums.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  MessageSquare,
  Users,
  Plus,
  MoreVertical,
  Trash2,
  Calendar,
  Search,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

// ============================
// CATEGORÍAS PREDEFINIDAS
// ============================
const PREDEFINED_CATEGORIES: string[] = [
  "General",
  "Ingeniería",
  "Medicina",
  "Psicología",
  "Derecho",
  "Arquitectura",
  "Ciencia y Tecnología",
  "Economía y Negocios",
  "Humanidades",
  "Otro",
]

// -----------------------------------------------------
// Helpers comunes (mismos criterios que forum-detail)
// -----------------------------------------------------
function getDisplayNameFromEmail(email?: string): string {
  if (!email) return "Usuario"
  const local = email.split("@")[0]
  return local
    .split(".")
    .map((part) => {
      const clean = part.replace(/\d+$/g, "")
      if (!clean) return ""
      return clean.charAt(0).toUpperCase() + clean.slice(1)
    })
    .filter(Boolean)
    .join(" ")
}

function getInitialsFromEmail(email?: string): string {
  if (!email) return "U"
  const local = email.split("@")[0]
  const parts = local.split(".").filter(Boolean)
  if (parts.length === 0) return email.charAt(0).toUpperCase()
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

function formatDate(dateString?: string) {
  if (!dateString) return "Fecha desconocida"
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return "Fecha desconocida"
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Dejamos el tipo flexible para no reventar si el backend cambia algo
type Foro = {
  id_foro: number
  titulo: string
  categoria: string
  creador?: {
    id_usuario: number
    email: string
    role: string
  }
  created_at?: string
  // contadores (si el backend los manda)
  post_count?: number
  posts_count?: number
  num_posts?: number
  total_posts?: number
  member_count?: number
  members_count?: number
  num_members?: number
  total_members?: number
  // cualquier otra wea que venga del backend
  [key: string]: any
}

export default function Forums() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [allForos, setAllForos] = useState<Foro[]>([])
  const [myForos, setMyForos] = useState<Foro[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "my">("all")

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newForumTitle, setNewForumTitle] = useState("")
  const [newForumCategory, setNewForumCategory] = useState("")
  const [loading, setLoading] = useState(false)

  // filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Mapa: id_usuario -> avatar URL (creador del foro)
  const [creatorAvatars, setCreatorAvatars] = useState<Record<number, string>>({})

  // -----------------------
  // INIT
  // -----------------------
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    loadAllForums()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  // -----------------------
  // LOADERS
  // -----------------------
  const loadAllForums = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const foros: Foro[] = await api.getForums(token)

      setAllForos(foros)

      if (user) {
        const mine = foros.filter((foro) => {
          const creatorId =
            foro.creador?.id_usuario ??
            foro.creadorID ??
            foro.id_creador ??
            (foro as any).creatorId

          return creatorId === user.id_usuario
        })
        setMyForos(mine)
      } else {
        setMyForos([])
      }

      // Cargar avatares de todos los creadores
      await loadCreatorAvatars(foros)
    } catch (error) {
      console.error("❌ Error cargando foros:", error)
      toast.error("Error al cargar los foros")
    }
  }

  const loadCreatorAvatars = async (foros: Foro[]) => {
    const uniqueIds = Array.from(
      new Set(
        foros
          .map((f) => f.creador?.id_usuario)
          .filter((id): id is number => typeof id === "number")
      )
    )

    if (uniqueIds.length === 0) return

    const newMap: Record<number, string> = {}

    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const profile = await api.getProfile(id)
          if (profile?.avatar) {
            newMap[id] = profile.avatar
          }
        } catch (err) {
          console.error("❌ Error cargando avatar para creador", id, err)
        }
      })
    )

    setCreatorAvatars((prev) => ({ ...prev, ...newMap }))
  }

  // -----------------------
  // CREATE FORUM
  // -----------------------
  const handleCreateForum = async () => {
    if (!newForumTitle.trim() || !newForumCategory.trim()) {
      toast.error("Título y categoría son obligatorios")
      return
    }

    const token = localStorage.getItem("token")
    if (!token || !user) {
      toast.error("Sesión no válida")
      return
    }

    setLoading(true)
    try {
      await api.createForum(
        {
          titulo: newForumTitle.trim(),
          categoria: newForumCategory.trim(),
          creadorID: user.id_usuario,
        },
        token
      )

      toast.success("Foro creado correctamente")
      setNewForumTitle("")
      setNewForumCategory("")
      setIsCreateDialogOpen(false)
      loadAllForums()
    } catch (error) {
      console.error("❌ Error creando foro:", error)
      toast.error("Error al crear el foro")
    } finally {
      setLoading(false)
    }
  }

  // -----------------------
  // DELETE FORUM
  // -----------------------
  const handleDeleteForum = async (forumId: number) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await api.deleteForum(forumId.toString(), token)
      toast.success("Foro eliminado")
      loadAllForums()
    } catch (error) {
      console.error("❌ Error eliminando foro:", error)
      toast.error("Error al eliminar el foro")
    }
  }

  // -----------------------
  // CATEGORIES + FILTERING
  // -----------------------
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          allForos
            .map((f) => f.categoria)
            .filter((c): c is string => typeof c === "string" && c.trim() !== "")
        )
      ),
    [allForos]
  )

  const filterForos = (foros: Foro[]) => {
    const term = searchTerm.trim().toLowerCase()

    return foros.filter((f) => {
      const matchesCategory =
        selectedCategory === "all" || f.categoria === selectedCategory

      if (!matchesCategory) return false

      if (!term) return true

      const inTitle = f.titulo?.toLowerCase().includes(term)
      const inCategory = f.categoria?.toLowerCase().includes(term)
      const inCreator = f.creador?.email?.toLowerCase().includes(term)

      return inTitle || inCategory || inCreator
    })
  }

  const visibleAllForos = filterForos(allForos)
  const visibleMyForos = filterForos(myForos)

  // -----------------------
  // CARD COMPONENT (estilo feed Reddit/Twitter)
  // -----------------------
  const ForumCard = ({ foro }: { foro: Foro }) => {
    const creatorId =
      foro.creador?.id_usuario ??
      foro.creadorID ??
      foro.id_creador ??
      (foro as any).creatorId

    const creatorEmail = foro.creador?.email
    const displayName = getDisplayNameFromEmail(creatorEmail)
    const avatarUrl =
      creatorId && creatorAvatars[creatorId] ? creatorAvatars[creatorId] : undefined

    const isOwner = user && creatorId === user.id_usuario

    const postCount =
      foro.post_count ??
      foro.posts_count ??
      foro.num_posts ??
      foro.total_posts

    const memberCount =
      foro.member_count ??
      foro.members_count ??
      foro.num_members ??
      foro.total_members

    return (
      <Card
        className="group cursor-pointer border-l-4 border-l-transparent hover:border-l-primary/80 transition-colors bg-card/60 hover:bg-accent/60"
        onClick={() => navigate(`/forum/${foro.id_foro}`)}
      >
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 mt-1">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback>{getInitialsFromEmail(creatorEmail)}</AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <CardTitle className="text-base sm:text-lg leading-snug">
                  {foro.titulo}
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] sm:text-xs uppercase">
                  {foro.categoria}
                </Badge>
              </div>

              <CardDescription className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="font-medium text-foreground/80">
                  {displayName}
                </span>
                <span className="text-muted-foreground">·</span>
                {foro.created_at && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(foro.created_at)}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteForum(foro.id_foro)
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar foro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>
                {postCount != null ? `${postCount} posts` : "Posts"}
              </span>
            </div>
            <div className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {memberCount != null ? `${memberCount} miembros` : "Miembros"}
              </span>
            </div>
            <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
              Ver foro completo →
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // -----------------------
  // UI
  // -----------------------
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col p-4">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
            {/* HEADER */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Foros
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Explora comunidades y participa en las discusiones.
                  </p>
                </div>

                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Crear foro
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="w-[95vw] sm:max-w-[420px]">
                    <DialogHeader>
                      <DialogTitle>Crear nuevo foro</DialogTitle>
                      <DialogDescription>
                        Crea un espacio de discusión para tu curso o tema.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          value={newForumTitle}
                          onChange={(e) => setNewForumTitle(e.target.value)}
                          placeholder="Ej: Estructuras de Datos UDP 2025-1"
                          disabled={loading}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="category">Categoría</Label>
                        <Select
                          value={newForumCategory || undefined}
                          onValueChange={setNewForumCategory}
                          disabled={loading}
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {PREDEFINED_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={handleCreateForum} disabled={loading}>
                        {loading ? "Creando..." : "Crear foro"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* FILTROS (search + categoría) */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar foros, categorías o creadores..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {categories.length > 0 && (
                  <Select
                    value={selectedCategory}
                    onValueChange={(value) => setSelectedCategory(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* TABS + FEED */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "all" | "my")}
              className="flex flex-1 flex-col gap-3"
            >
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all" className="flex-1 sm:flex-none">
                  Todos los foros
                </TabsTrigger>
                <TabsTrigger value="my" className="flex-1 sm:flex-none">
                  Mis foros
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 pt-2">
                {visibleAllForos.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        {allForos.length === 0
                          ? "No hay foros disponibles aún."
                          : "Ningún foro coincide con el filtro."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {visibleAllForos.map((foro) => (
                      <ForumCard key={foro.id_foro} foro={foro} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my" className="space-y-3 pt-2">
                {visibleMyForos.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        {myForos.length === 0
                          ? "Todavía no has creado ningún foro."
                          : "Ninguno de tus foros coincide con el filtro."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {visibleMyForos.map((foro) => (
                      <ForumCard key={foro.id_foro} foro={foro} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
