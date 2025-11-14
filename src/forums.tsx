"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, MessageSquare, Users, MoreVertical, Edit, Trash2 } from "lucide-react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

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
}

export default function Forums() {
  const [allForos, setAllForos] = useState<Foro[]>([])
  const [myForos, setMyForos] = useState<Foro[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newForumTitle, setNewForumTitle] = useState("")
  const [newForumCategory, setNewForumCategory] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    loadAllForums()
  }, [isAuthenticated])

  const loadAllForums = async () => {
    try {
      const forums = await api.getForums()
      console.log("📥 Foros cargados:", forums)
      setAllForos(forums)
      
      // Filter my forums
      if (user?.id_usuario) {
        const mine = forums.filter((f: Foro) => f.creador?.id_usuario === user.id_usuario)
        setMyForos(mine)
      }
    } catch (error) {
      console.error("❌ Error cargando foros:", error)
      toast.error("Error al cargar los foros")
    }
  }

  const handleCreateForum = async () => {
    if (!newForumTitle.trim() || !newForumCategory.trim()) {
      toast.error("Por favor completa todos los campos")
      return
    }

    const token = localStorage.getItem("token")
    if (!token) {
      toast.error("No estás autenticado")
      return
    }

    setLoading(true)
    try {
      await api.createForum({
        titulo: newForumTitle,
        categoria: newForumCategory,
        creador: { id_usuario: user.id_usuario }?.id_usuario
      }, token)
      
      toast.success("Foro creado exitosamente")
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

  const ForumCard = ({ foro }: { foro: Foro }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/forum/${foro.id_foro}`)}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex-1">
          <CardTitle className="text-lg">{foro.titulo}</CardTitle>
          <CardDescription>{foro.categoria}</CardDescription>
        </div>
        {user?.id_usuario === foro.creador?.id_usuario && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteForum(foro.id_foro); }} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /></div>
          <div className="flex items-center gap-1"><Users className="h-4 w-4" /></div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-3xl font-bold">Foros</h1>
              <p className="text-muted-foreground">Explora y participa en las discusiones</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Crear Foro</Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Foro</DialogTitle>
                  <DialogDescription>Crea un espacio para discusiones temáticas</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Título</Label>
                    <Input id="title" value={newForumTitle} onChange={(e) => setNewForumTitle(e.target.value)} placeholder="Título del foro" disabled={loading} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Input id="category" value={newForumCategory} onChange={(e) => setNewForumCategory(e.target.value)} placeholder="Categoría" disabled={loading} />
                  </div>
                  <Button onClick={handleCreateForum} disabled={loading}>{loading ? "Creando..." : "Crear Foro"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todos los Foros</TabsTrigger>
              <TabsTrigger value="my">Mis Foros</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              {allForos.length === 0 ? (
                <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">No hay foros disponibles</p></CardContent></Card>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {allForos.map((foro) => <ForumCard key={foro.id_foro} foro={foro} />)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="my" className="space-y-4">
              {myForos.length === 0 ? (
                <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">No has creado ningún foro</p></CardContent></Card>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {myForos.map((foro) => <ForumCard key={foro.id_foro} foro={foro} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
