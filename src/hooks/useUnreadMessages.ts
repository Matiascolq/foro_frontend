// src/hooks/useUnreadMessages.ts
import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useWebSocket } from "@/contexts/WebSocketContext"

type Conversation = {
  usuario: {
    id_usuario: number
    email: string
    role?: string
  }
  ultimoMensaje: {
    id_mensaje?: number
    contenido?: string
    fecha?: string
    emisor?: {
      id_usuario: number
      email: string
    }
    receptor?: {
      id_usuario: number
      email: string
    }
    // campos posibles para "leído"
    estado?: string
    leido?: boolean
    is_read?: boolean
    read_at?: string | null
  }
}

/**
 * Un mensaje se considera NO leído si:
 *  - el último mensaje de la conversación lo recibió el usuario actual, y
 *  - no está marcado como leído según alguno de los campos disponibles.
 */
function isMessageUnread(msg: Conversation["ultimoMensaje"], currentUserId: number): boolean {
  if (!msg) return false
  if (!msg.receptor || msg.receptor.id_usuario !== currentUserId) return false

  // heurísticas por si el backend usa diferentes nombres
  const estado = msg.estado?.toLowerCase?.() || ""

  const isReadFlag =
    msg.leido === true ||
    msg.is_read === true ||
    !!msg.read_at ||
    estado === "read" ||
    estado === "leido"

  return !isReadFlag
}

/**
 * Hook para obtener el número de conversaciones con mensajes no leídos.
 * - Hace un fetch inicial a /messages/conversations/:userId
 * - Escucha eventos de WebSocket para actualizar en "tiempo real":
 *   - "new-message"
 *   - "message-read" (si existe)
 * - Opcionalmente, re-consulta cada pollInterval ms.
 */
export function useUnreadMessages(pollInterval: number = 15000) {
  const { user } = useAuth()
  const { socket } = useWebSocket()
  const [unreadMessages, setUnreadMessages] = useState(0)

  const refreshUnreadMessages = useCallback(async () => {
    try {
      if (!user?.id_usuario) {
        setUnreadMessages(0)
        return
      }

      const conversations: Conversation[] = await api.getConversations(
        user.id_usuario
      )

      const count = (conversations || []).reduce((acc, conv) => {
        if (conv.ultimoMensaje && isMessageUnread(conv.ultimoMensaje, user.id_usuario)) {
          return acc + 1
        }
        return acc
      }, 0)

      setUnreadMessages(count)
    } catch (error) {
      console.error("🔴 Error cargando conversaciones para unreadMessages:", error)
      // En caso de error no tocamos el valor actual
    }
  }, [user?.id_usuario])

  // Carga inicial + polling opcional
  useEffect(() => {
    if (!user?.id_usuario) {
      setUnreadMessages(0)
      return
    }

    refreshUnreadMessages()

    if (!pollInterval || pollInterval <= 0) return

    const id = setInterval(() => {
      refreshUnreadMessages()
    }, pollInterval)

    return () => clearInterval(id)
  }, [user?.id_usuario, pollInterval, refreshUnreadMessages])

  // Eventos de WebSocket para actualizar en tiempo real
  useEffect(() => {
    if (!socket || !user?.id_usuario) return

    const handleNewMessage = (payload: any) => {
      // Si el receptor es el usuario actual, probablemente aumente los no leídos
      try {
        const receptorId = payload?.receptor?.id_usuario ?? payload?.receptorID
        if (receptorId === user.id_usuario) {
          refreshUnreadMessages()
        }
      } catch {
        refreshUnreadMessages()
      }
    }

    const handleMessageRead = (payload: any) => {
      // Cuando se marca como leído, refrescamos todo
      refreshUnreadMessages()
    }

    socket.on("new-message", handleNewMessage)
    socket.on("message-read", handleMessageRead)

    return () => {
      socket.off("new-message", handleNewMessage)
      socket.off("message-read", handleMessageRead)
    }
  }, [socket, user?.id_usuario, refreshUnreadMessages])

  return { unreadMessages, refreshUnreadMessages }
}
