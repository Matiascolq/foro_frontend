// src/pages/post-detail.tsx
"use client"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  CornerDownRight,
} from "lucide-react"

import { api, API_URL } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

// ===== Tipos =====

type Post = {
  id_post: number
  titulo?: string
  contenido: string
  fecha?: string
  created_at?: string
  updated_at?: string
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
  autor_email?: string
  foro_titulo?: string
  foro_categoria?: string
  // 👇 NUEVO: soporte para imagen del post
  imagen_url?: string | null
}

type Comment = {
  id: number
  contenido: string
  fecha: string
  autor_email: string
}

// ===== Helpers =====

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

// ===== Página =====

export default function PostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [post, setPost] = useState<Post | null>(null)
  const [authorAvatar, setAuthorAvatar] = useState<string | undefined>(undefined)

  // Comentarios locales (placeholder hasta conectar backend)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loadingPost, setLoadingPost] = useState(false)
  const [loadingComment, setLoadingComment] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    if (!postId) {
      navigate("/forums")
      return
    }
    loadPost()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, isAuthenticated])

  const loadPost = async () => {
    if (!postId) return
    setLoadingPost(true)
    try {
      const idNum = parseInt(postId)

      // 1) Traer lista completa de posts (ya viene con autor/foro/imagen_url)
      const allPosts: any[] = await api.getPosts()
      const fromList = allPosts.find((p) => p.id_post === idNum)

      // 2) Traer detalle por ID (por si agrega más campos)
      let fromDetail: any = null
      try {
        fromDetail = await api.getPost(postId)
      } catch {
        // si no existe /posts/:id o falla, seguimos con fromList
      }

      if (!fromList && !fromDetail) {
        toast.error("Post no encontrado")
        navigate("/forums")
        return
      }

      const merged: Post = {
        ...(fromDetail || {}),
        ...(fromList || {}),
      }

      setPost(merged)

      // Avatar del autor
      const authorId = merged.autor?.id_usuario
      if (authorId) {
        try {
          const profile = await api.getProfile(authorId)
          if (profile?.avatar) {
            setAuthorAvatar(profile.avatar)
          }
        } catch (e) {
          console.error("Error cargando avatar del autor:", e)
        }
      }
    } catch (error) {
      console.error("Error cargando post:", error)
      toast.error("Error al cargar el post")
    } finally {
      setLoadingPost(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error("El comentario no puede estar vacío")
      return
    }
    if (!user) return

    setLoadingComment(true)
    try {
      // Por ahora es solo frontend; luego se conectará al backend de comentarios
      const now = new Date().toISOString()
      const nuevo: Comment = {
        id: Date.now(),
        contenido: newComment.trim(),
        fecha: now,
        autor_email: user.email,
      }
      setComments((prev) => [nuevo, ...prev])
      setNewComment("")
      toast.success("Comentario agregado (demo local)")
    } catch (error) {
      console.error("Error agregando comentario:", error)
      toast.error("No se pudo agregar el comentario")
    } finally {
      setLoadingComment(false)
    }
  }

  const handleBackToForum = () => {
    if (post?.foro?.id_foro) {
      navigate(`/forum/${post.foro.id_foro}`)
    } else {
      navigate("/forums")
    }
  }

  const postAuthorEmail =
    post?.autor?.email || post?.autor_email || "usuario@mail.udp.cl"
  const displayName = getDisplayNameFromEmail(postAuthorEmail)
  const dateToShow = post?.fecha || post?.created_at

  // 🔍 Construir URL completa de la imagen si existe
  const imageSrc =
    post?.imagen_url &&
    (post.imagen_url.startsWith("http")
      ? post.imagen_url
      : `${API_URL}${post.imagen_url}`)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col p-4">
          {/* Contenedor central tipo feed */}
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
            {/* Botón volver + meta foro */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToForum}
                  className="px-2"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Volver al foro
                </Button>
              </div>

              {post?.foro && (
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span>Publicado en</span>
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-6 px-2"
                    onClick={() => navigate(`/forum/${post.foro!.id_foro}`)}
                  >
                    <span className="font-medium mr-1">{post.foro.titulo}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {post.foro.categoria}
                    </Badge>
                  </Button>
                </div>
              )}
            </div>

            {loadingPost && (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Cargando post...
                </CardContent>
              </Card>
            )}

            {post && (
              <>
                {/* Card del Post principal */}
                <Card className="border-l-4 border-l-primary/80 bg-card/80">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        {authorAvatar && (
                          <AvatarImage src={authorAvatar} alt={displayName} />
                        )}
                        <AvatarFallback>
                          {getInitialsFromEmail(postAuthorEmail)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {displayName}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(dateToShow)}</span>
                          {post.foro && (
                            <>
                              <span>·</span>
                              <Badge variant="outline" className="text-[10px]">
                                {post.foro.categoria}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold mb-1">
                        {post.titulo && post.titulo.trim().length > 0
                          ? post.titulo
                          : post.contenido}
                      </h2>
                      <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                        {post.contenido}
                      </p>
                    </div>

                    {/* 👇 Imagen del post, si existe */}
                    {imageSrc && (
                      <div className="mt-2">
                        <img
                          src={imageSrc}
                          alt={post.titulo || "Imagen del post"}
                          className="w-full max-h-[480px] rounded-md border object-contain bg-black/5"
                        />
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CornerDownRight className="h-3 w-3" />
                        Hilo principal
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground/80">
                        <MessageSquare className="h-3 w-3" />
                        Comentarios en hilo (demo local)
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Comentarios */}
                <Card className="bg-card/80">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <MessageSquare className="h-4 w-4" />
                      Comentarios
                      {comments.length > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                          ({comments.length})
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Nuevo comentario */}
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        Agregar comentario
                      </p>
                      <Textarea
                        className="min-h-[80px] text-sm sm:text-base"
                        placeholder="Escribe tu respuesta..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={loadingComment}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          * Los comentarios actualmente se guardan solo en el
                          frontend (demo). Luego se conectarán al backend de
                          hilos tipo Reddit.
                        </p>
                        <Button
                          size="sm"
                          onClick={handleAddComment}
                          disabled={loadingComment}
                        >
                          <CornerDownRight className="mr-2 h-4 w-4" />
                          {loadingComment ? "Enviando..." : "Responder"}
                        </Button>
                      </div>
                    </div>

                    {/* Lista de comentarios */}
                    {comments.length === 0 ? (
                      <div className="border-t pt-4 text-center text-sm text-muted-foreground">
                        Aún no hay comentarios en este hilo.
                      </div>
                    ) : (
                      <div className="border-t pt-4 space-y-3">
                        {comments.map((comment) => (
                          <Card
                            key={comment.id}
                            className="group border-l-4 border-l-muted bg-card/70 hover:bg-accent/60 transition-colors"
                          >
                            <CardHeader className="pb-2 flex flex-row items-start gap-3">
                              <Avatar className="h-8 w-8 mt-1">
                                <AvatarImage src="" alt={comment.autor_email} />
                                <AvatarFallback>
                                  {getInitialsFromEmail(comment.autor_email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-1 flex-1">
                                <p className="text-sm font-medium leading-none">
                                  {getDisplayNameFromEmail(comment.autor_email)}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(comment.fecha)}
                                </p>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 pb-3">
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {comment.contenido}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
