// src/pages/admin-users.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Search,
  Trash2,
  Eye,
  Loader2,
  Users,
  ShieldCheck,
  MessageCircle,
} from "lucide-react"

import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

// ===== Tipos de datos =====

type RawUser = {
  id_usuario: number
  email: string
  role?: string
  rol?: string
  email_verified?: boolean | "t" | "f" | "true" | "false" | 0 | 1 | null
}

type AdminUser = {
  id_usuario: number
  email: string
  role: string
  email_verified: boolean
}

// Usamos el mismo shape de Post que en forum-detail
type Post = {
  id_post: number
  titulo?: string
  contenido: string
  fecha?: string
  created_at?: string
  foro?: {
    id_foro: number
    titulo: string
    categoria: string
  }
  autor?: {
    id_usuario: number
    email?: string
    role?: string
  }
}

// Comentarios globales para la tabla de abajo
type AdminComment = {
  id: number
  contenido: string
  created_at?: string
  autor_email: string
  post_titulo: string
}

// 🔑 Misma idea que en login: solo consideramos “no verificado” cuando es falso explícito
function normalizeEmailVerified(value: RawUser["email_verified"]): boolean {
  if (value === false) return false
  if (value === 0) return false
  if (value === "f") return false
  if (value === "false") return false

  if (value === true) return true
  if (value === 1) return true
  if (value === "t") return true
  if (value === "true") return true

  // Cualquier otro caso lo tratamos como verificado (no bloquea login)
  return true
}

function normalizeUser(u: RawUser): AdminUser {
  const normalizedVerified = normalizeEmailVerified(u.email_verified)
  const role = u.role ?? u.rol ?? "usuario"

  console.log("[AdminUsers] Normalizando usuario", {
    id_usuario: u.id_usuario,
    email: u.email,
    raw_email_verified: u.email_verified,
    normalized_email_verified: normalizedVerified,
    role,
  })

  return {
    id_usuario: u.id_usuario,
    email: u.email,
    role,
    email_verified: normalizedVerified,
  }
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return "Sin fecha"
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return "Sin fecha"
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminUsers() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isPostsDialogOpen, setIsPostsDialogOpen] = useState(false)

  // Comentarios globales (para la tabla debajo de usuarios)
  const [allComments, setAllComments] = useState<AdminComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)

  // ===== Guard de moderador =====
  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated || !user) {
      navigate("/login")
      return
    }

    if (user.rol !== "moderador") {
      toast.error("Debes ser moderador para acceder a esta sección.")
      navigate("/forums")
      return
    }

    const init = async () => {
      try {
        setLoading(true)
        const usersRes: RawUser[] = await api.getUsers()
        const postsRes: Post[] = await api.getPosts()

        console.log("[AdminUsers] Usuarios crudos:", usersRes)

        setUsers(usersRes.map(normalizeUser))
        setAllPosts(postsRes || [])

        // Cargar comentarios globales en base a todos los posts
        void loadAllComments(postsRes || [])
      } catch (error) {
        console.error("Error cargando usuarios o posts:", error)
        toast.error("No se pudieron cargar los datos de usuarios.")
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [isLoading, isAuthenticated, user, navigate])

  // ===== Helpers =====

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    )
  }, [users, search])

  const getPostsForUser = (userId: number) =>
    allPosts.filter((p) => p.autor?.id_usuario === userId)

  // Comentarios de TODOS los posts (tabla global)
  const loadAllComments = async (posts: Post[]) => {
    if (!posts.length) {
      setAllComments([])
      return
    }

    setLoadingComments(true)
    try {
      const commentsAcc: AdminComment[] = []

      await Promise.all(
        posts.map(async (post) => {
          try {
            const rawComments = (await api.getCommentsForPost(
              post.id_post,
            )) as any[]

            if (Array.isArray(rawComments)) {
              rawComments.forEach((c) => {
                const id =
                  c.id_comentario ?? c.id_comment ?? c.id ?? Math.random()

                const contenido = c.contenido ?? c.content ?? ""
                const created_at =
                  c.created_at ?? c.fecha ?? c.createdAt ?? undefined

                const autor_email =
                  c.autor?.email ??
                  c.user?.email ??
                  c.user_email ??
                  "Desconocido"

                const post_titulo =
                  post.titulo ??
                  c.post?.titulo ??
                  c.post_title ??
                  "(sin título)"

                commentsAcc.push({
                  id,
                  contenido,
                  created_at,
                  autor_email,
                  post_titulo,
                })
              })
            }
          } catch (err) {
            console.error(
              "[AdminUsers] Error obteniendo comentarios para post",
              post.id_post,
              err,
            )
          }
        }),
      )

      setAllComments(commentsAcc)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleOpenPosts = (adminUser: AdminUser) => {
    setSelectedUser(adminUser)
    setIsPostsDialogOpen(true)
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm("¿Eliminar este post? Esta acción no se puede deshacer.")) return

    try {
      const token = localStorage.getItem("token") || ""
      await api.deletePost(String(postId), token)
      const updatedPosts = allPosts.filter((p) => p.id_post !== postId)
      setAllPosts(updatedPosts)
      toast.success("Publicación eliminada correctamente.")

      // Ya que quitamos el post, actualizamos comentarios globales
      void loadAllComments(updatedPosts)
    } catch (error) {
      console.error("Error eliminando post:", error)
      toast.error("No se pudo eliminar la publicación.")
    }
  }

  // 🔥 Borrar comentario desde la tabla global
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("¿Eliminar este comentario? Esta acción no se puede deshacer.")) return

    try {
      const token = localStorage.getItem("token") || ""
      await api.deleteComment(String(commentId), token)
      setAllComments((prev) => prev.filter((c) => c.id !== commentId))
      toast.success("Comentario eliminado correctamente.")
    } catch (error) {
      console.error("Error eliminando comentario:", error)
      toast.error("No se pudo eliminar el comentario.")
    }
  }

  // ===== Stats visuales =====
  const totalUsers = users.length
  const verifiedUsers = useMemo(
    () => users.filter((u) => u.email_verified).length,
    [users],
  )
  const pendingUsers = totalUsers - verifiedUsers
  const totalComments = allComments.length

  if (isLoading || loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">
          Cargando gestión de usuarios...
        </p>
      </div>
    )
  }

  const selectedUserPosts = selectedUser
    ? getPostsForUser(selectedUser.id_usuario)
    : []

  return (
    <SidebarProvider>
      {/* 👇 Igual que en forum-detail / post-detail: sin props */}
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col p-4">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            {/* ===================== HEADER + MÉTRICAS ===================== */}
            <div className="space-y-3">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Gestión de Usuarios
                </h1>
                <p className="text-sm text-muted-foreground">
                  Panel de moderación para revisar cuentas, publicaciones y actividad
                  de comentarios en el foro.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/60 bg-card/70">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Usuarios totales
                      </p>
                      <p className="text-xl font-semibold">{totalUsers}</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/70">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Cuentas verificadas
                      </p>
                      <p className="text-xl font-semibold">{verifiedUsers}</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/70">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Verificación pendiente
                      </p>
                      <p className="text-xl font-semibold">{pendingUsers}</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/70">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Comentarios totales
                      </p>
                      <p className="text-xl font-semibold">
                        {loadingComments ? "…" : totalComments}
                      </p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/10">
                      <MessageCircle className="h-5 w-5 text-sky-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ===================== TABLA DE USUARIOS ===================== */}
            <Card className="border border-border/70 bg-card/70 backdrop-blur">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    Usuarios registrados ({users.length})
                  </CardTitle>
                  <CardDescription>
                    Revisa el estado de verificación y la actividad de publicaciones
                    por usuario.
                  </CardDescription>
                </div>
                <div className="w-full sm:w-auto">
                  <div className="relative w-full min-w-[220px] sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filtrar por email o rol..."
                      className="pl-8"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {filteredUsers.length === 0 ? (
                  <p className="py-6 text-sm text-muted-foreground">
                    No se encontraron usuarios con ese filtro.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[70px]">ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-center">Posts</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u) => {
                          const userPosts = getPostsForUser(u.id_usuario)
                          const count = userPosts.length
                          const isVerified = u.email_verified

                          return (
                            <TableRow key={u.id_usuario}>
                              <TableCell className="font-mono text-xs">
                                {u.id_usuario}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {u.email}
                              </TableCell>
                              <TableCell className="capitalize">
                                <Badge
                                  variant={
                                    u.role === "moderador"
                                      ? "default"
                                      : "outline"
                                  }
                                  className="text-[11px]"
                                >
                                  {u.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isVerified ? (
                                  <Badge className="flex items-center gap-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Verificado
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="flex items-center gap-1 border-amber-300 bg-amber-50 text-amber-700"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    Pendiente
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {count}{" "}
                                {count === 1
                                  ? "publicación"
                                  : "publicaciones"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="inline-flex items-center gap-1"
                                  onClick={() => handleOpenPosts(u)}
                                  disabled={count === 0}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Ver posts
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ===================== TABLA GLOBAL DE COMENTARIOS ===================== */}
            <Card className="border border-border/70 bg-card/70 backdrop-blur">
              <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Comentarios en el foro
                  </CardTitle>
                  <CardDescription>
                    Vista global de los comentarios realizados en todas las publicaciones.
                  </CardDescription>
                </div>
                {!loadingComments && (
                  <Badge variant="outline" className="mt-1 w-fit text-[11px]">
                    {totalComments} comentario
                    {totalComments === 1 ? "" : "s"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {loadingComments ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando comentarios...
                  </div>
                ) : allComments.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    No se encontraron comentarios en el foro.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Post</TableHead>
                          <TableHead>Autor</TableHead>
                          <TableHead>Contenido</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allComments.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-mono text-xs">
                              {c.id}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs font-medium">
                              {c.post_titulo}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {c.autor_email}
                            </TableCell>
                            <TableCell className="text-xs max-w-xs">
                              <span className="line-clamp-2">
                                {c.contenido}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {formatDateTime(c.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="destructive"
                                title="Eliminar comentario"
                                onClick={() => handleDeleteComment(c.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ===================== SECCIÓN PROVISIONAL DE REPORTES ===================== */}
            <Card className="border border-dashed border-border/70 bg-card/60">
              <CardHeader>
                <CardTitle className="text-lg">
                  Reportes de la comunidad (provisional)
                </CardTitle>
                <CardDescription>
                  Aquí se mostrarán los reportes que otros usuarios hagan sobre perfiles y contenidos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  El módulo de reportes aún no está implementado. Cuando esté disponible,
                  esta sección permitirá:
                </p>
                <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Ver el motivo del reporte (spam, lenguaje ofensivo, etc.).</li>
                  <li>Identificar quién reportó y cuándo lo hizo.</li>
                  <li>Gestionar el estado del reporte (pendiente, en revisión, resuelto).</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===================== DIÁLOGO DE POSTS POR USUARIO ===================== */}
        <Dialog
          open={isPostsDialogOpen}
          onOpenChange={setIsPostsDialogOpen}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Publicaciones de{" "}
                {selectedUser?.email ?? "usuario"}
              </DialogTitle>
              <DialogDescription>
                Revisa y elimina publicaciones que no cumplan con las normas del foro.
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <ScrollArea className="mt-2 max-h-[420px] pr-2">
                {selectedUserPosts.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    Este usuario no tiene publicaciones.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedUserPosts.map((post) => (
                      <Card
                        key={post.id_post}
                        className="border-l-4 border-l-primary/80 bg-card/70"
                      >
                        <CardContent className="pt-3 pb-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {post.foro?.titulo && (
                                  <Badge variant="outline" className="text-[11px]">
                                    {post.foro.titulo}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(
                                    post.fecha || post.created_at,
                                  )}
                                </span>
                              </div>
                              <p className="text-sm font-medium">
                                {post.titulo || "(sin título)"}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-3">
                                {post.contenido}
                              </p>
                            </div>
                            <div className="flex gap-2 sm:flex-col">
                              <Button
                                size="icon"
                                variant="outline"
                                title="Ver en el foro"
                                onClick={() =>
                                  navigate(`/post/${post.id_post}`)
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                title="Eliminar post"
                                onClick={() => handleDeletePost(post.id_post)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
