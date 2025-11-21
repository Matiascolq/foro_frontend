// src/pages/forum-detail.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  Bell,
  BellOff,
  MessageSquare,
  Calendar,
  CornerDownRight,
  Search,
} from "lucide-react"

import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

// ----- Tipos -----

type Forum = {
  id_foro: number
  titulo: string
  categoria: string
  creador?: {
    id_usuario: number
    email: string
    role: string
  }
  created_at?: string
}

type Post = {
  id_post: number
  titulo?: string
  contenido: string
  fecha?: string
  created_at?: string
  autor?: {
    id_usuario: number
    email: string
    role: string
  }
  foro?: {
    id_foro: number
    titulo: string
    categoria: string
  }
  comment_count?: number
}

// Helpers locales para nombre/initials desde email
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
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ForumDetail() {
  const { forumId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [forum, setForum] = useState<Forum | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subLoading, setSubLoading] = useState(false)

  // Mapa: id_usuario -> avatar URL
  const [authorAvatars, setAuthorAvatars] = useState<Record<number, string>>({})

  // Estado para crear post (dialog)
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)
  const [newPostTitle, setNewPostTitle] = useState("")
  const [newPostContent, setNewPostContent] = useState("")

  // Filtro local de posts
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    if (!forumId) {
      navigate("/forums")
      return
    }
    loadForumData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forumId, isAuthenticated])

  const loadForumData = async () => {
    if (!forumId) return

    try {
      // Cargar foro
      const forumData = await api.getForum(forumId)
      console.log("📥 Foro cargado:", forumData)
      setForum(forumData)

      // Cargar posts y filtrar por foro
      const allPosts: Post[] = await api.getPosts()
      const forumPosts = allPosts.filter(
        (p: Post) => p.foro?.id_foro === parseInt(forumId)
      )
      console.log(`📥 Posts del foro ${forumId}:`, forumPosts)
      setPosts(forumPosts)

      // Cargar avatares de todos los autores
      await loadAuthorAvatars(forumPosts)

      // 👉 Consultar estado de suscripción real (si el backend tiene los endpoints)
      try {
        if (user) {
          const token = localStorage.getItem("token") || ""
          if (token) {
            const status = await api.getForumSubscriptionStatus(
              parseInt(forumId),
              token
            )
            setIsSubscribed(!!status.subscribed)
          }
        }
      } catch (err) {
        console.warn("⚠️ Error consultando estado de suscripción:", err)
      }
    } catch (error) {
      console.error("❌ Error cargando datos del foro:", error)
      toast.error("Error al cargar el foro")
    }
  }

  const loadAuthorAvatars = async (forumPosts: Post[]) => {
    const uniqueIds = Array.from(
      new Set(
        forumPosts
          .map((p) => p.autor?.id_usuario)
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
          console.error("❌ Error cargando avatar para autor", id, err)
        }
      })
    )

    setAuthorAvatars((prev) => ({ ...prev, ...newMap }))
  }

  const handleCreatePost = async () => {
    if (!newPostTitle.trim()) {
      toast.error("El título no puede estar vacío")
      return
    }
    if (!newPostContent.trim()) {
      toast.error("El contenido no puede estar vacío")
      return
    }

    const token = localStorage.getItem("token")
    if (!token || !forumId) return

    setLoading(true)
    try {
      await api.createPost(
        {
          titulo: newPostTitle.trim(),
          contenido: newPostContent.trim(),
          foroID: parseInt(forumId),
          autorID: user?.id_usuario,
        },
        token
      )

      toast.success("Post creado exitosamente")
      setNewPostTitle("")
      setNewPostContent("")
      setIsPostDialogOpen(false)
      await loadForumData()
    } catch (error) {
      console.error("❌ Error creando post:", error)
      toast.error("Error al crear el post")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSubscription = async () => {
    if (!forumId) return
    if (!user) {
      toast.error("Debes iniciar sesión para suscribirte a un foro")
      navigate("/login")
      return
    }

    const token = localStorage.getItem("token")
    if (!token) {
      toast.error("Sesión no encontrada, vuelve a iniciar sesión")
      navigate("/login")
      return
    }

    setSubLoading(true)
    try {
      const forumIdNum = parseInt(forumId)

      if (isSubscribed) {
        await api.unsubscribeFromForum(forumIdNum, token)
        setIsSubscribed(false)
        toast.success("Te has desuscrito del foro")
      } else {
        await api.subscribeToForum(forumIdNum, token)
        setIsSubscribed(true)
        toast.success("Te has suscrito al foro")
      }
    } catch (error) {
      console.error("❌ Error cambiando suscripción:", error)
      toast.error("No se pudo actualizar la suscripción")
    } finally {
      setSubLoading(false)
    }
  }

  // --- Filtro de posts ---
  const visiblePosts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return posts

    return posts.filter((p) => {
      const title = (p.titulo || "").toLowerCase()
      const content = (p.contenido || "").toLowerCase()
      const authorEmail = (p.autor?.email || "").toLowerCase()

      return (
        title.includes(term) ||
        content.includes(term) ||
        authorEmail.includes(term)
      )
    })
  }, [posts, searchTerm])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4">
          {/* Contenedor central tipo feed */}
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
            {/* Forum Header */}
            {forum && (
              <div className="flex flex-col gap-3 pb-2 border-b">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      {forum.titulo}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                      <Badge variant="secondary" className="uppercase">
                        {forum.categoria}
                      </Badge>
                      {forum.created_at && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(forum.created_at)}
                        </span>
                      )}
                    </div>
                    {forum.creador?.email && (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Creado por{" "}
                        <span className="font-medium">
                          {getDisplayNameFromEmail(forum.creador.email)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <Button
                      variant={isSubscribed ? "default" : "outline"}
                      onClick={handleToggleSubscription}
                      size="sm"
                      disabled={subLoading}
                    >
                      {isSubscribed ? (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Suscrito
                        </>
                      ) : (
                        <>
                          <BellOff className="mr-2 h-4 w-4" />
                          {subLoading ? "Actualizando..." : "Suscribirse"}
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setIsPostDialogOpen(true)}
                      disabled={loading}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Nuevo post
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Posts estilo feed + filtro */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <h2 className="text-lg sm:text-xl font-semibold">
                  Posts ({visiblePosts.length}
                  {visiblePosts.length !== posts.length
                    ? ` de ${posts.length}`
                    : ""}
                  )
                </h2>

                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en los posts del foro..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {posts.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No hay posts en este foro. ¡Sé el primero en publicar!
                    </p>
                  </CardContent>
                </Card>
              ) : visiblePosts.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Ningún post coincide con el filtro.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                visiblePosts.map((post) => {
                  const authorId = post.autor?.id_usuario
                  const authorEmail = post.autor?.email
                  const displayName = getDisplayNameFromEmail(authorEmail)
                  const avatarUrl =
                    authorId && authorAvatars[authorId]
                      ? authorAvatars[authorId]
                      : undefined

                  const dateToShow = post.fecha || post.created_at

                  return (
                    <Card
                      key={post.id_post}
                      className="group cursor-pointer border-l-4 border-l-transparent hover:border-l-primary/80 transition-colors bg-card/60 hover:bg-accent/60"
                      onClick={() => navigate(`/post/${post.id_post}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm sm:text-base">
                            <Avatar className="h-8 w-8">
                              {avatarUrl && (
                                <AvatarImage src={avatarUrl} alt={displayName} />
                              )}
                              <AvatarFallback>
                                {getInitialsFromEmail(authorEmail)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium leading-none">
                                {displayName}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(dateToShow)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <h3 className="text-sm sm:text-base font-semibold mb-1 line-clamp-2">
                          {post.titulo && post.titulo.trim().length > 0
                            ? post.titulo
                            : post.contenido}
                        </h3>
                        <p className="whitespace-pre-wrap text-sm sm:text-base line-clamp-3">
                          {post.contenido}
                        </p>

                        {/* Barra de acciones estilo Reddit (aparece solo al hover) */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="inline-flex items-center gap-1">
                            <CornerDownRight className="h-3 w-3" />
                            <span>Responder</span>
                          </div>
                          <div className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>
                              {post.comment_count ?? 0} comentarios
                            </span>
                          </div>
                          <span className="hidden sm:inline">
                            · Ver hilo completo
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>

            {/* Dialog de "Nuevo post" */}
            <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Crear nuevo post</DialogTitle>
                  <DialogDescription>
                    Publica un nuevo hilo en este foro.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Título</label>
                    <Input
                      placeholder="Resumen corto de tu post"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Contenido</label>
                    <Textarea
                      className="min-h-[120px] text-sm sm:text-base"
                      placeholder="Escribe tu post aquí..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPostDialogOpen(false)}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreatePost}
                      disabled={loading}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {loading ? "Publicando..." : "Publicar post"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
