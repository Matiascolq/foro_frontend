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

  // Load initial unread count
  const refreshNotifications = async () => {
    if (!user) return
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://foroudp.sytes.net:3000'
      const response = await fetch(`${API_URL}/notifications/unread-count/${user.id_usuario}`)
      const data = await response.json()
      setUnreadNotifications(data.count)
    } catch (error) {
      console.error('Error loading notification count:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshNotifications()
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    console.log('🔍 WebSocket effect triggered:', { isAuthenticated, userId: user?.id_usuario, hasSocket: !!socket })
    
    if (!isAuthenticated || !user) {
      console.log('❌ User not authenticated or no user, closing socket')
      if (socket) {
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    // Close existing socket before creating a new one
    if (socket) {
      console.log('🔄 Socket exists, closing before recreating')
      socket.close()
      setSocket(null)
    }

    const WS_URL = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://foroudp.sytes.net:3000'
    
    console.log('🔌 Creating new WebSocket connection:', `${WS_URL}/realtime`, 'for user:', user.id_usuario)
    
    const newSocket = io(`${WS_URL}/realtime`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
      timeout: 10000
    })

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected, registering user:', user.id_usuario)
      setIsConnected(true)
      newSocket.emit('register', { userId: user.id_usuario })
    })

    newSocket.on('disconnect', () => {
      console.log('⚠️ WebSocket disconnected')
      setIsConnected(false)
    })

    newSocket.on('registered', () => {
      console.log('✅ User registered in WebSocket:', user.id_usuario)
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message)
    })

    // Global notification listener
    newSocket.on('new-notification', (notification) => {
      console.log('🔔 Nueva notificación recibida (GLOBAL):', notification)
      
      // Show toast notification
      toast.info(notification.titulo, {
        description: notification.mensaje,
        duration: 5000,
      })
      
      // Increment unread count
      setUnreadNotifications(prev => prev + 1)
      
      // Dispatch custom event for NotificationsPage to update list
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }))
    })

    setSocket(newSocket)

    return () => {
      console.log('🔌 Cleanup: Closing WebSocket connection')
      newSocket.close()
    }
  }, [isAuthenticated, user?.id_usuario])

  const sendMessage = (data: { contenido: string; emisorID: number; receptorID: number }) => {
    if (socket && isConnected) {
      socket.emit('send-message', data)
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent')
    }
  }

  return (
    <WebSocketContext.Provider value={{ 
      socket, 
      isConnected, 
      sendMessage, 
      unreadNotifications,
      refreshNotifications 
    }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}
