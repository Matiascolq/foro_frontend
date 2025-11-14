"use client"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bell, BellOff, MessageSquare, Calendar, User } from "lucide-react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

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
  fecha: string
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
}

export default function ForumDetail() {
  const { forumId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  
  const [forum, setForum] = useState<Forum | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [newPostContent, setNewPostContent] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

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
  }, [forumId, isAuthenticated])

  const loadForumData = async () => {
    if (!forumId) return
    
    try {
      // Load forum
      const forumData = await api.getForum(forumId)
      console.log("📥 Foro cargado:", forumData)
      setForum(forumData)

      // Load posts - now filtering by foro.id_foro
      const allPosts = await api.getPosts()
      const forumPosts = allPosts.filter((p: Post) => p.foro?.id_foro === parseInt(forumId))
      console.log(`📥 Posts del foro ${forumId}:`, forumPosts)
      setPosts(forumPosts)

      // TODO: Check subscription status when notifications API is ready
      setIsSubscribed(false)
    } catch (error) {
      console.error("❌ Error cargando datos del foro:", error)
      toast.error("Error al cargar el foro")
    }
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error("El contenido no puede estar vacío")
      return
    }

    const token = localStorage.getItem("token")
    if (!token || !forumId) return

    setLoading(true)
    try {
      await api.createPost({
        titulo: "Post sin título", // Backend requires titulo
        contenido: newPostContent,
        foroID: parseInt(forumId),
        autorID: user?.id_usuario
      }, token)
      
      toast.success("Post creado exitosamente")
      setNewPostContent("")
      loadForumData()
    } catch (error) {
      console.error("❌ Error creando post:", error)
      toast.error("Error al crear el post")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSubscription = async () => {
    toast.info("Funcionalidad de suscripción próximamente")
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Fecha desconocida"
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Forum Header */}
          {forum && (
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold">{forum.titulo}</h1>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <Badge variant="secondary">{forum.categoria}</Badge>
                  {forum.created_at && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(forum.created_at)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant={isSubscribed ? "default" : "outline"}
                onClick={handleToggleSubscription}
              >
                {isSubscribed ? (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Suscrito
                  </>
                ) : (
                  <>
                    <BellOff className="mr-2 h-4 w-4" />
                    Suscribirse
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Create Post */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Crear Nuevo Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea className="text-sm sm:text-base"
                placeholder="Escribe tu post aquí..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="min-h-[100px]"
                disabled={loading}
              />
              <Button onClick={handleCreatePost} disabled={loading}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {loading ? "Publicando..." : "Publicar Post"}
              </Button>
            </CardContent>
          </Card>

          {/* Posts List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Posts ({posts.length})
            </h2>
            {posts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No hay posts en este foro. ¡Sé el primero en publicar!
                  </p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id_post} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/post/${post.id_post}`)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 text-sm sm:text-base">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {post.autor?.email?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {post.autor?.email || "Usuario"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(post.fecha)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{post.contenido}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
