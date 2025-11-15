import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { io, Socket } from "socket.io-client"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

type WebSocketContextType = {
  socket: Socket | null
  isConnected: boolean
  sendMessage: (data: { contenido: string; emisorID: number; receptorID: number }) => void
  unreadNotifications: number
  refreshNotifications: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const { user, isAuthenticated } = useAuth()

  // API Base URL
  const API_URL = import.meta.env.VITE_API_URL || "http://foroudp.sytes.net:3000"

  // WebSocket URL correcta
  const WS_URL = API_URL.startsWith("https")
    ? API_URL.replace("https", "wss")
    : API_URL.replace("http", "ws")

  const refreshNotifications = async () => {
    if (!user) return
    try {
      const response = await fetch(`${API_URL}/notifications/unread-count/${user.id_usuario}`)
      const data = await response.json()
      setUnreadNotifications(data.count)
    } catch (error) {
      console.error("Error loading notification count:", error)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) refreshNotifications()
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) socket.close()
      setSocket(null)
      setIsConnected(false)
      return
    }

    if (socket) socket.close()

    console.log("🌐 Connecting WebSocket to:", `${WS_URL}/realtime`)

    const newSocket = io(`${WS_URL}/realtime`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
    })

    newSocket.on("connect", () => {
      console.log("✅ WebSocket connected")
      setIsConnected(true)
      newSocket.emit("register", { userId: user.id_usuario })
    })

    newSocket.on("disconnect", () => {
      console.log("⚠️ WebSocket disconnected")
      setIsConnected(false)
    })

    newSocket.on("connect_error", (err) => {
      console.error("❌ WebSocket connection error:", err.message)
    })

    // 🔔 Notificaciones globales
    newSocket.on("new-notification", (notification) => {
      toast.info(notification.titulo, {
        description: notification.mensaje,
        duration: 5000,
      })

      setUnreadNotifications((prev) => prev + 1)

      window.dispatchEvent(new CustomEvent("new-notification", { detail: notification }))
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [isAuthenticated, user?.id_usuario])

  const sendMessage = (data: { contenido: string; emisorID: number; receptorID: number }) => {
    if (socket && isConnected) {
      socket.emit("send-message", data)
    } else {
      console.warn("⚠️ WebSocket not connected, message not sent")
    }
  }

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        sendMessage,
        unreadNotifications,
        refreshNotifications,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) throw new Error("useWebSocket must be used within WebSocketProvider")
  return context
}
