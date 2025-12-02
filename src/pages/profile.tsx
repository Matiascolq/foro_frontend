// src/pages/profile.tsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { toast } from "sonner"
import {
  User,
  Calendar,
  MessageSquare,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Plus,
  UserPlus,
  Users,
  Shield,
} from "lucide-react"

import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

type Post = {
  id_post: number
  contenido: string
  fecha: string
  autor_email: string
  id_foro: number
  foro_titulo: string
  created_at: string
  updated_at: string
}

type Profile = {
  id_perfil: number
  avatar?: string | null
  biografia?: string | null
  id_usuario: number
  email?: string
  created_at?: string | null
  updated_at?: string | null
  usuario?: {
    id_usuario: number
    email: string
  }
}

export function Profile() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasProfile, setHasProfile] = useState(false)

  // Estados del perfil
  const [avatar, setAvatar] = useState("")
  const [biografia, setBiografia] = useState("")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)

  // Estados de posts
  const [myPosts, setMyPosts] = useState<Post[]>([])
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isEditPostDialogOpen, setIsEditPostDialogOpen] = useState(false)

  // Estados de administración (para moderadores)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [showAdminProfiles, setShowAdminProfiles] = useState(false)

  const [loading, setLoading] = useState(false)

  // Helpers
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "No registrada"
    try {
      const d = new Date(dateString)
      if (isNaN(d.getTime())) return "No registrada"
      return d.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "No registrada"
    }
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  // === Carga inicial ===
  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated || !user) {
      navigate("/login")
      return
    }

    const init = async () => {
      await Promise.all([loadProfileREST(), loadMyPostsREST()])
      if (user.rol === "moderador" && showAdminProfiles) {
        await loadAllProfilesREST()
      }
    }

    init().catch((err) => {
      console.error("Error inicializando perfil:", err)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user, showAdminProfiles])

  // === Llamadas REST ===

  const loadProfileREST = async () => {
    if (!user) return
    try {
      const res = await api.getProfile(user.id_usuario)
      if (!res) {
        // 404 o sin perfil
        setHasProfile(false)
        setProfile(null)
        setAvatar("")
        setBiografia("")
        return
      }

      const p: Profile = {
        ...res,
        email: res?.usuario?.email ?? user.email,
        created_at: res?.created_at ?? res?.createdAt ?? null,
        updated_at: res?.updated_at ?? res?.updatedAt ?? null,
      }

      setProfile(p)
      setHasProfile(true)
      setAvatar(p.avatar || "")
      setBiografia(p.biografia || "")
    } catch (error) {
      console.error("Error al cargar perfil:", error)
      toast.error("No se pudo cargar tu perfil")
    }
  }

  const loadMyPostsREST = async () => {
    if (!user) return
    try {
      const posts: any[] = await api.getPosts()

      // Filtrar posts del usuario actual contemplando varias formas
      const mine: Post[] = posts
        .filter((p) => {
          // 1) Por id de usuario (FK)
          if (
            p.autorIdUsuario !== undefined &&
            Number(p.autorIdUsuario) === Number(user.id_usuario)
          ) {
            return true
          }
          // 2) Por relación autor
          if (
            p.autor &&
            p.autor.id_usuario !== undefined &&
            Number(p.autor.id_usuario) === Number(user.id_usuario)
          ) {
            return true
          }
          // 3) Por email del autor
          if (p.autor?.email && p.autor.email === user.email) {
            return true
          }
          if (p.autor_email && p.autor_email === user.email) {
            return true
          }
          return false
        })
        .map((p) => {
          const foro = p.foro || {}
          return {
            id_post: p.id_post,
            contenido: p.contenido,
            fecha: p.fecha,
            autor_email: p.autor?.email ?? p.autor_email ?? user.email,
            id_foro: foro.id_foro ?? p.foroIdForo,
            foro_titulo: foro.titulo ?? p.foro_titulo ?? "Foro",
            created_at: p.created_at ?? p.createdAt ?? p.fecha,
            updated_at: p.updated_at ?? p.updatedAt ?? p.fecha,
          } as Post
        })

      setMyPosts(mine)
    } catch (error) {
      console.error("Error al cargar publicaciones:", error)
      toast.error("No se pudieron cargar tus publicaciones")
    }
  }

  const loadAllProfilesREST = async () => {
    if (!user || user.rol !== "moderador") return
    try {
      const profiles: Profile[] = await api.getAllProfiles()
      const mapped = profiles.map((p: any) => ({
        ...p,
        email: p.usuario?.email ?? p.email,
        created_at: p.created_at ?? p.createdAt ?? null,
        updated_at: p.updated_at ?? p.updatedAt ?? null,
      }))
      setAllProfiles(mapped)
    } catch (error) {
      console.error("Error al cargar perfiles:", error)
      toast.error("No se pudieron cargar los perfiles")
    }
  }

  // === Funciones del perfil ===

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const body = {
        avatar: avatar || undefined,
        biografia: biografia || undefined,
        usuarioID: user.id_usuario,
      }
      const res = await api.createProfile(body)
      const p: Profile = {
        ...res,
        email: res?.usuario?.email ?? user.email,
        created_at: res?.created_at ?? res?.createdAt ?? null,
        updated_at: res?.updated_at ?? res?.updatedAt ?? null,
      }
      setProfile(p)
      setHasProfile(true)
      setIsCreatingProfile(false)
      toast.success("Perfil creado exitosamente")
    } catch (error: any) {
      console.error("Error al crear perfil:", error)
      toast.error(error?.message || "No se pudo crear el perfil")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return
    setLoading(true)
    try {
      const body = {
        avatar: avatar || undefined,
        biografia: biografia || undefined,
      }
      const res = await api.updateProfile(profile.id_perfil, body)
      const p: Profile = {
        ...res,
        email: res?.usuario?.email ?? user.email,
        created_at: res?.created_at ?? res?.createdAt ?? null,
        updated_at: res?.updated_at ?? res?.updatedAt ?? null,
      }
      setProfile(p)
      setAvatar(p.avatar || "")
      setBiografia(p.biografia || "")
      setIsEditingProfile(false)
      toast.success("Perfil actualizado exitosamente")
    } catch (error: any) {
      console.error("Error al actualizar perfil:", error)
      toast.error(error?.message || "No se pudo actualizar el perfil")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProfile = () => {
    toast.error("Eliminar perfil aún no está implementado en el backend REST.")
  }

  const handleAdminDeleteProfile = (email: string) => {
    toast.error(
      `Eliminar perfil de ${email} aún no está implementado en el backend REST.`,
    )
  }

  // === Funciones de posts ===

  const handleEditPost = async (e: React.FormEvent) => {
    e.preventDefault()
    // No existe endpoint REST para actualizar post aún
    toast.error("La edición de publicaciones aún no está disponible en esta versión.")
    setIsEditPostDialogOpen(false)
    setEditingPost(null)
    setEditContent("")
  }

  const handleDeletePost = async (postId: number) => {
    if (!user) return
    if (!confirm("¿Estás seguro de que quieres eliminar este post?")) return
    setLoading(true)
    try {
      const token = localStorage.getItem("token") || ""
      await api.deletePost(String(postId), token)
      toast.success("Post eliminado exitosamente")
      await loadMyPostsREST()
    } catch (error) {
      console.error("Error al eliminar post:", error)
      toast.error("No se pudo eliminar el post")
    } finally {
      setLoading(false)
    }
  }

  const openEditPostDialog = (post: Post) => {
    setEditingPost(post)
    setEditContent(post.contenido)
    setIsEditPostDialogOpen(true)
  }

  // === Render ===

  if (authLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando sesión...</p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      {/* Unificamos layout: sin variant ni user aquí */}
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4">
          {/* Contenedor central tipo feed, igual que forums/post-detail */}
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
            {/* Título + resumen */}
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
              <p className="text-sm text-muted-foreground">
                Gestiona tu identidad y tus publicaciones dentro del foro UDP.
              </p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList
                className={`w-full justify-start gap-1 rounded-xl bg-muted/40 p-1 ${
                  user?.rol === "moderador" ? "grid grid-cols-4" : "grid grid-cols-3"
                }`}
              >
                <TabsTrigger value="profile" className="text-xs sm:text-sm">
                  Perfil
                </TabsTrigger>
                <TabsTrigger value="info" className="text-xs sm:text-sm">
                  Información
                </TabsTrigger>
                <TabsTrigger value="posts" className="text-xs sm:text-sm">
                  Mis Publicaciones
                </TabsTrigger>
                {user?.rol === "moderador" && (
                  <TabsTrigger value="admin" className="text-xs sm:text-sm">
                    Administrar Perfiles
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Tab de Perfil */}
              <TabsContent value="profile" className="mt-4 space-y-4">
                <Card className="border border-border/70 bg-card/70 backdrop-blur">
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                          <AvatarImage
                            src={(hasProfile && profile?.avatar) || undefined}
                            alt={user?.email}
                          />
                          <AvatarFallback className="text-2xl">
                            {getUserInitials(user?.email || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <CardTitle className="text-lg sm:text-xl">
                            {user?.email}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                user?.rol === "moderador" ? "default" : "secondary"
                              }
                              className="text-[11px] uppercase tracking-wide"
                            >
                              {user?.rol}
                            </Badge>
                            {hasProfile && profile?.created_at && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Perfil desde {formatDate(profile.created_at)}
                              </span>
                            )}
                          </div>
                          {hasProfile &&
                            profile?.updated_at &&
                            profile.updated_at !== profile.created_at && (
                              <p className="text-xs text-muted-foreground">
                                Última actualización: {formatDate(profile.updated_at)}
                              </p>
                            )}
                        </div>
                      </div>

                      {hasProfile && (
                        <div className="flex gap-2 self-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingProfile(true)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteProfile}
                            disabled={loading}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {hasProfile && profile ? (
                      <div className="space-y-6">
                        {profile.biografia && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">
                              Biografía
                            </Label>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {profile.biografia}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                        <User className="h-14 w-14 text-muted-foreground/70" />
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold">
                            Aún no has creado tu perfil
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            Personaliza tu perfil con un avatar y una biografía para que
                            otros estudiantes puedan conocerte mejor.
                          </p>
                        </div>
                        <Button onClick={() => setIsCreatingProfile(true)} size="sm">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Crear Perfil
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dialog para crear perfil */}
                <Dialog open={isCreatingProfile} onOpenChange={setIsCreatingProfile}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Crear Tu Perfil</DialogTitle>
                      <DialogDescription>
                        Personaliza tu perfil con un avatar y una biografía
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateProfile} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="avatar">URL del Avatar (opcional)</Label>
                        <Input
                          id="avatar"
                          type="url"
                          value={avatar}
                          onChange={(e) => setAvatar(e.target.value)}
                          placeholder="https://ejemplo.com/mi-avatar.jpg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="biografia">Biografía (opcional)</Label>
                        <Textarea
                          id="biografia"
                          value={biografia}
                          onChange={(e) => setBiografia(e.target.value)}
                          placeholder="Cuéntanos un poco sobre ti..."
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreatingProfile(false)}
                          disabled={loading}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Creando..." : "Crear Perfil"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Dialog para editar perfil */}
                <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Editar Perfil</DialogTitle>
                      <DialogDescription>
                        Actualiza tu avatar y biografía
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-avatar">URL del Avatar</Label>
                        <Input
                          id="edit-avatar"
                          type="url"
                          value={avatar}
                          onChange={(e) => setAvatar(e.target.value)}
                          placeholder="https://ejemplo.com/mi-avatar.jpg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-biografia">Biografía</Label>
                        <Textarea
                          id="edit-biografia"
                          value={biografia}
                          onChange={(e) => setBiografia(e.target.value)}
                          placeholder="Cuéntanos un poco sobre ti..."
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditingProfile(false)}
                          disabled={loading}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Tab de Información Personal */}
              <TabsContent value="info" className="mt-4 space-y-4">
                <Card className="border border-border/70 bg-card/70 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <User className="h-5 w-5" />
                      Información Personal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={user?.email || ""}
                        readOnly
                        className="bg-muted/60 text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rol</Label>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            user?.rol === "moderador" ? "default" : "secondary"
                          }
                        >
                          {user?.rol}
                        </Badge>
                      </div>
                    </div>
                    {user?.id_usuario && (
                      <div className="space-y-2">
                        <Label>ID de Usuario</Label>
                        <Input
                          value={user.id_usuario}
                          readOnly
                          className="bg-muted/60 text-sm sm:text-base"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab de Mis Publicaciones */}
              <TabsContent value="posts" className="mt-4 space-y-4">
                <Card className="border border-border/70 bg-card/70 backdrop-blur">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <MessageSquare className="h-5 w-5" />
                        Mis Publicaciones ({myPosts.length})
                      </CardTitle>
                      <Button
                        onClick={() => navigate("/crear-publicacion")}
                        size="sm"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Publicación
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {myPosts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-2">
                          Aún no has creado ninguna publicación
                        </p>
                        <Button
                          onClick={() => navigate("/crear-publicacion")}
                          className="mt-2"
                          size="sm"
                        >
                          Crear tu primera publicación
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myPosts.map((post) => (
                          <Card
                            key={post.id_post}
                            className="border-l-4 border-l-primary/80 bg-card/70 hover:bg-accent/40 transition-colors"
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">
                                      {post.foro_titulo}
                                    </Badge>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(post.fecha)}
                                    </span>
                                    {post.updated_at !== post.created_at && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px]"
                                      >
                                        Editado
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm">
                                    {truncateContent(post.contenido)}
                                  </p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navigate(`/post/${post.id_post}`)
                                      }
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      Ver Completo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navigate(`/forum/${post.id_foro}`)
                                      }
                                    >
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      Ver Foro
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openEditPostDialog(post)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeletePost(post.id_post)
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

              {/* Tab de Administración (solo moderadores) */}
              {user?.rol === "moderador" && (
                <TabsContent value="admin" className="mt-4 space-y-4">
                  <Card className="border border-border/70 bg-card/70 backdrop-blur">
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Shield className="h-5 w-5" />
                          Administrar Perfiles ({allProfiles.length})
                        </CardTitle>
                        <Button
                          onClick={() => {
                            setShowAdminProfiles(true)
                            loadAllProfilesREST()
                          }}
                          size="sm"
                          disabled={loading}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Cargar Perfiles
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {allProfiles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="mb-1">No hay perfiles cargados</p>
                          <p className="text-sm">
                            Haz clic en &quot;Cargar Perfiles&quot; para ver todos
                            los perfiles del sistema.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {allProfiles.map((profile) => (
                            <Card
                              key={profile.id_perfil}
                              className="border-l-4 border-l-blue-500 bg-card/70"
                            >
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex flex-1 items-start gap-4">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage
                                        src={profile.avatar || undefined}
                                        alt={profile.email}
                                      />
                                      <AvatarFallback>
                                        {getUserInitials(profile.email || "")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-sm font-medium">
                                          {profile.email}
                                        </h4>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px]"
                                        >
                                          ID: {profile.id_perfil}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Creado: {formatDate(profile.created_at)}
                                      </p>
                                      {profile.biografia && (
                                        <p className="text-sm">
                                          {truncateContent(
                                            profile.biografia,
                                            100,
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      handleAdminDeleteProfile(
                                        profile.email || "",
                                      )
                                    }
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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

            {/* Dialog para editar post */}
            <Dialog
              open={isEditPostDialogOpen}
              onOpenChange={setIsEditPostDialogOpen}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Editar Publicación</DialogTitle>
                  <DialogDescription>
                    Modifica el contenido de tu publicación en el foro &quot;
                    {editingPost?.foro_titulo}&quot;
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditPost} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-content">Contenido</Label>
                    <Textarea
                      id="edit-content"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={8}
                      placeholder="Contenido de la publicación..."
                      required
                    />
                    <div className="text-right text-sm text-muted-foreground">
                      {editContent.length}/5000 caracteres
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditPostDialogOpen(false)}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
