"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, CheckCheck, Calendar, AlertCircle, MessageSquare, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

type Notification = {
  id_notificacion: number
  titulo: string
  mensaje: string
  tipo: string
  referencia_id: number | null
  leido: boolean
  fecha: string
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    loadNotifications()
    loadUnreadCount()
  }, [isAuthenticated])

  useEffect(() => {
    const handleNewNotification = (event: any) => {
      const notification = event.detail
      console.log("🔔 Nueva notificación (via event):", notification)
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)
    }

    window.addEventListener('new-notification', handleNewNotification)

    return () => {
      window.removeEventListener('new-notification', handleNewNotification)
    }
  }, [])

  const loadNotifications = async () => {
    if (!user) return
    setLoading(true)
    try {
      const notifs = await api.getNotifications(user.id_usuario)
      console.log("📥 Notificaciones:", notifs)
      setNotifications(notifs)
    } catch (error) {
      console.error("❌ Error cargando notificaciones:", error)
      toast.error("Error al cargar notificaciones")
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    if (!user) return
    try {
      const { count } = await api.getUnreadCount(user.id_usuario)
      setUnreadCount(count)
    } catch (error) {
      console.error("❌ Error cargando contador:", error)
    }
  }

  const handleMarkAsRead = async (notificationId: number) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await api.markNotificationAsRead(notificationId, token)
      setNotifications((prev) =>
        prev.map((n) => (n.id_notificacion === notificationId ? { ...n, leido: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("❌ Error marcando como leída:", error)
      toast.error("Error al marcar notificación")
    }
  }

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem("token")
    if (!token || !user) return

    try {
      await api.markAllNotificationsAsRead(user.id_usuario, token)
      setNotifications((prev) => prev.map((n) => ({ ...n, leido: true })))
      setUnreadCount(0)
      toast.success("Todas las notificaciones marcadas como leídas")
    } catch (error) {
      console.error("❌ Error:", error)
      toast.error("Error al marcar notificaciones")
    }
  }

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case "message":
        return <MessageSquare className="h-5 w-5" />
      case "user":
        return <UserPlus className="h-5 w-5" />
      case "alert":
        return <AlertCircle className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bell className="h-8 w-8" />
                Notificaciones
              </h1>
              <p className="text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} sin leer` : "No hay notificaciones sin leer"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline">
                <CheckCheck className="mr-2 h-4 w-4" />
                Marcar todas como leídas
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              Cargando notificaciones...
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No tienes notificaciones</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <Card
                  key={notif.id_notificacion}
                  className={`transition-all ${!notif.leido ? "border-primary bg-primary/5" : ""}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between p-4">
                    <div className="flex gap-3 flex-1">
                      <div
                        className={`mt-1 ${
                          !notif.leido ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {getIcon(notif.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{notif.titulo}</h3>
                          {!notif.leido && (
                            <Badge variant="default" className="h-5">
                              Nuevo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notif.mensaje}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(notif.fecha)}
                        </p>
                      </div>
                    </div>
                    {!notif.leido && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(notif.id_notificacion)
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
