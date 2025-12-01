// src/pages/admin-users.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

import { AlertTriangle, CheckCircle2, MessageSquare, Search, Trash2, Eye } from "lucide-react"

import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

type RawUser = {
  id_usuario: number
  email: string
  role: string
  email_verified: boolean | "t" | "f" | "true" | "false" | 0 | 1 | null
}

type AdminUser = {
  id_usuario: number
  email: string
  role: string
  email_verified: boolean
}

type Post = {
  id_post: number
  titulo: string
  contenido: string
  fecha: string
  foroIdForo?: number
  foro_titulo?: string
  autorIdUsuario?: number
}

function normalizeUser(u: RawUser): AdminUser {
  const v = u.email_verified
  const isVerified =
    v === true ||
    v === "t" ||
    v === "true" ||
    v === 1

  return {
    id_usuario: u.id_usuario,
    email: u.email,
    role: u.role,
    email_verified: !!isVerified,
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

        setUsers(usersRes.map(normalizeUser))
        setAllPosts(postsRes || [])
      } catch (error) {
        console.error("Error cargando usuarios o posts:", error)
        toast.error("No se pudieron cargar los datos de usuarios.")
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [isLoading, isAuthenticated, user, navigate])

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
    allPosts.filter((p) => p.autorIdUsuario === userId)

  const handleOpenPosts = (adminUser: AdminUser) => {
    setSelectedUser(adminUser)
    setIsPostsDialogOpen(true)
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm("¿Eliminar este post? Esta acción no se puede deshacer.")) return

    try {
      const token = localStorage.getItem("token") || ""
      await api.deletePost(String(postId), token)
      setAllPosts((prev) => prev.filter((p) => p.id_post !== postId))
      toast.success("Publicación eliminada correctamente.")
    } catch (error) {
      console.error("Error eliminando post:", error)
      toast.error("No se pudo eliminar la publicación.")
    }
  }

  const currentUserForSidebar = user
    ? {
        name: user.email,
        email: user.email,
        avatar: "",
        rol: user.rol,
      }
    : undefined

  if (isLoading || loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando gestión de usuarios...</p>
      </div>
    )
  }

  const selectedUserPosts = selectedUser
    ? getPostsForUser(selectedUser.id_usuario)
    : []

  return (
    <SidebarProvider>
      <AppSidebar user={currentUserForSidebar} />
      <SidebarInset>
        <SiteHeader
          user={{
            email: user.email,
            rol: user.rol,
          }}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                Gestión de Usuarios
              </h1>
              <p className="text-sm text-muted-foreground">
                Visualiza el estado de verificación y las publicaciones de cada usuario.
              </p>
            </div>

            <Card className="border border-border/70 bg-card/70 backdrop-blur">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Usuarios registrados ({users.length})
                  </CardTitle>
                  <CardDescription>
                    Estado de verificación y número de publicaciones por usuario.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full min-w-[220px] max-w-xs">
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
                              <TableCell className="font-medium">
                                {u.email}
                              </TableCell>
                              <TableCell className="capitalize">
                                <Badge variant="outline">
                                  {u.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isVerified ? (
                                  <Badge className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
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
          </div>
        </div>

        {/* Diálogo de posts por usuario */}
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
                                {post.foro_titulo && (
                                  <Badge variant="outline">
                                    {post.foro_titulo}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(post.fecha)}
                                </span>
                              </div>
                              <p className="text-sm">
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
