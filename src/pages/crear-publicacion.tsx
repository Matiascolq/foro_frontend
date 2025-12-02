// src/pages/crear-publicacion.tsx
import { useState, useEffect, ChangeEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Image as ImageIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

type Forum = {
  id_foro: number
  titulo: string
  descripcion?: string
  categoria: string
  created_at?: string
  creador_email?: string
}

export function CrearPublicacion() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [selectedForumId, setSelectedForumId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [forums, setForums] = useState<Forum[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingForums, setLoadingForums] = useState(false)

  // Imagen del post
  const [postImage, setPostImage] = useState<File | null>(null)
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null)

  // --- Cargar foros y proteger ruta ---
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    loadForums()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const loadForums = async () => {
    try {
      setLoadingForums(true)
      const data = await api.getForums()
      if (Array.isArray(data)) {
        setForums(data)
      } else {
        setForums([])
      }
    } catch (error) {
      console.error("❌ Error cargando foros:", error)
      toast.error("No se pudieron cargar los foros")
    } finally {
      setLoadingForums(false)
    }
  }

  // --- Manejo de imagen ---
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setPostImage(file)

    if (postImagePreview) {
      URL.revokeObjectURL(postImagePreview)
    }

    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setPostImagePreview(previewUrl)
    } else {
      setPostImagePreview(null)
    }
  }

  // Limpiar URL de preview al desmontar
  useEffect(() => {
    return () => {
      if (postImagePreview) {
        URL.revokeObjectURL(postImagePreview)
      }
    }
  }, [postImagePreview])

  // --- Crear publicación usando el mismo API que en forum-detail ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedForumId) {
      toast.error("Debes seleccionar un foro")
      return
    }

    if (!title.trim()) {
      toast.error("El título no puede estar vacío")
      return
    }

    if (!content.trim()) {
      toast.error("El contenido no puede estar vacío")
      return
    }

    if (content.length > 5000) {
      toast.error("El contenido no puede exceder 5000 caracteres")
      return
    }

    const token = localStorage.getItem("token")
    if (!token || !user) {
      toast.error("Sesión no válida, vuelve a iniciar sesión")
      navigate("/login")
      return
    }

    setLoading(true)
    try {
      await api.createPost(
        {
          titulo: title.trim(),
          contenido: content.trim(),
          foroID: parseInt(selectedForumId),
          autorID: (user as any).id_usuario,
        },
        token,
        postImage ?? undefined
      )

      toast.success("¡Publicación creada exitosamente!")
      setTitle("")
      setContent("")
      setPostImage(null)
      if (postImagePreview) {
        URL.revokeObjectURL(postImagePreview)
        setPostImagePreview(null)
      }

      // Redirigimos al foro seleccionado
      navigate(`/forum/${selectedForumId}`)
    } catch (error) {
      console.error("❌ Error creando publicación:", error)
      toast.error("Error al crear la publicación")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col p-4">
          {/* Contenedor central tipo feed, pero con card centrado */}
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/forums")}
                className="px-2"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver a foros
              </Button>
            </div>

            <Card className="border border-border/70 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">
                  Crear nueva publicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Selección de foro */}
                  <div className="space-y-2">
                    <Label htmlFor="forum">Foro *</Label>
                    <Select
                      value={selectedForumId}
                      onValueChange={setSelectedForumId}
                      disabled={loadingForums || loading}
                      required
                    >
                      <SelectTrigger id="forum">
                        <SelectValue
                          placeholder={
                            loadingForums
                              ? "Cargando foros..."
                              : "Selecciona un foro"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {forums.map((forum) => (
                          <SelectItem
                            key={forum.id_foro}
                            value={forum.id_foro.toString()}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{forum.titulo}</span>
                              {forum.descripcion && (
                                <span className="text-xs text-muted-foreground">
                                  {forum.descripcion}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Título */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      placeholder="Resumen corto de tu publicación"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Contenido */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Contenido *</Label>
                    <Textarea
                      id="content"
                      placeholder="Escribe el contenido de tu publicación..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={8}
                      disabled={loading}
                    />
                    <div className="text-xs sm:text-sm text-muted-foreground text-right">
                      {content.length}/5000 caracteres
                    </div>
                  </div>

                  {/* Imagen opcional (mismo concepto que en forum-detail: botón con icono e imagen de preview) */}
                  <div className="space-y-2">
                    <Label>Imagen (opcional)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => {
                          const input = document.getElementById(
                            "post-image-input"
                          ) as HTMLInputElement | null
                          input?.click()
                        }}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        {postImage ? "Cambiar imagen" : "Subir imagen"}
                      </Button>
                      {postImage && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {postImage.name}
                        </span>
                      )}
                    </div>
                    <input
                      id="post-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={loading}
                    />
                    {postImagePreview && (
                      <div className="mt-2">
                        <img
                          src={postImagePreview}
                          alt="Vista previa de la imagen"
                          className="max-h-48 w-full rounded-md border object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/forums")}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || loadingForums}>
                      {loading ? "Creando..." : "Crear publicación"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
