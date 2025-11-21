// src/pages/messages.tsx
"use client"

import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  MessageSquare,
  Send,
  Clock,
  Plus,
  ArrowLeft,
} from "lucide-react"
import { toast } from "sonner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { getDisplayNameFromEmail } from "@/lib/utils"

type Message = {
  id_mensaje: number
  contenido: string
  fecha: string
  emisor: { id_usuario: number; email: string }
  receptor: { id_usuario: number; email: string }
  is_delivered?: boolean
  is_read?: boolean
  fecha_entrega?: string | null
  fecha_lectura?: string | null
}

type Conversation = {
  usuario: { id_usuario: number; email: string; role: string }
  ultimoMensaje: Message
}

type User = {
  id_usuario: number
  email: string
  role: string
}

type Profile = {
  id_perfil: number
  avatar?: string
  id_usuario: number
  usuario?: {
    id_usuario: number
    email: string
  }
}

export default function Messages() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { socket } = useWebSocket()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [conversationMessages, setConversationMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [showConversations, setShowConversations] = useState(true)

  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [searchEmail, setSearchEmail] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set())
  const [lastSeenMap, setLastSeenMap] = useState<Record<number, string>>({})
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)

  // Perfiles (para avatares)
  const [profilesByUserId, setProfilesByUserId] = useState<Record<number, { avatar?: string }>>({})

  // -----------------------
  // INIT
  // -----------------------
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    loadConversations()
    loadProfiles()
  }, [isAuthenticated])

  // Filtrado de usuarios para el diálogo de "Nueva conversación"
  useEffect(() => {
    if (!isNewConversationOpen) {
      // cuando se cierre, dejamos preparada la lista base sin el propio usuario
      setFilteredUsers(allUsers.filter(u => u.id_usuario !== user?.id_usuario))
      return
    }

    const query = searchEmail.toLowerCase().trim()
    let list = allUsers.filter(u => u.id_usuario !== user?.id_usuario)

    if (query) {
      list = list.filter(u => {
        const email = u.email.toLowerCase()
        const display = getDisplayNameFromEmail(u.email).toLowerCase()
        return email.includes(query) || display.includes(query)
      })
    }

    setFilteredUsers(list)
  }, [searchEmail, allUsers, isNewConversationOpen, user])

  // -----------------------
  // SOCKET LISTENERS
  // -----------------------
  useEffect(() => {
    if (!socket || !user) return

    socket.emit("register", { userId: user.id_usuario })

    // NEW MESSAGE
    socket.on("new-message", (message: Message) => {
      const partnerId =
        message.emisor.id_usuario === user.id_usuario
          ? message.receptor.id_usuario
          : message.emisor.id_usuario

      if (selectedConversation === partnerId) {
        const nowIso = new Date().toISOString()
        const msgWithStatus = {
          ...message,
          is_delivered: true,
          fecha_entrega: message.fecha_entrega ?? nowIso,
          is_read: message.receptor.id_usuario === user.id_usuario,
          fecha_lectura:
            message.receptor.id_usuario === user.id_usuario
              ? (message.fecha_lectura ?? nowIso)
              : message.fecha_lectura,
        }

        setConversationMessages((prev) => [...prev, msgWithStatus])
        scrollToBottom()

        if (message.receptor.id_usuario === user.id_usuario) {
          socket.emit("mark-conversation-read", {
            userId: user.id_usuario,
            partnerId: message.emisor.id_usuario,
          })
        }
      }

      if (message.emisor.id_usuario !== user.id_usuario) {
        toast.success(`Nuevo mensaje de ${message.emisor.email}`)
      }

      loadConversations()
    })

    // CONFIRMACIÓN message-sent
    socket.on("message-sent", (message: Message) => {
      setConversationMessages((prev) =>
        prev.map((m) =>
          m.id_mensaje === message.id_mensaje ||
          (m.contenido === message.contenido &&
            Math.abs(new Date(m.fecha).getTime() - new Date(message.fecha).getTime()) < 5000)
            ? message
            : m
        )
      )

      scrollToBottom()
      loadConversations()
    })

    // USER ONLINE
    socket.on("user-online", ({ userId }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId))
    })

    // USER OFFLINE
    socket.on("user-offline", ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
      setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }))
    })

    // USER-STATUS (single usuario)
    socket.on("user-status", ({ userId, online, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        if (online) next.add(userId)
        else next.delete(userId)
        return next
      })
      if (lastSeen) {
        setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }))
      }
    })

    // USERS-STATUS (bulk inicial)
    socket.on("users-status", (data: { users: { userId: number; online: boolean; lastSeen?: string | null }[] }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        data.users.forEach(({ userId, online }) => {
          if (online) next.add(userId)
          else next.delete(userId)
        })
        return next
      })
      setLastSeenMap((prev) => {
        const next = { ...prev }
        data.users.forEach(({ userId, lastSeen }) => {
          if (lastSeen) {
            next[userId] = lastSeen
          }
        })
        return next
      })
    })

    // TYPING
    socket.on("user-typing", ({ userId: typingUserId }) => {
      if (selectedConversation === typingUserId) {
        setIsPartnerTyping(true)
        setTimeout(() => setIsPartnerTyping(false), 1500)
      }
    })

    // READ RECEIPTS
    socket.on("messages-read", ({ userId, partnerId }) => {
      if (!user) return

      const convPartnerId = user.id_usuario === userId ? partnerId : userId

      if (selectedConversation === convPartnerId) {
        const nowIso = new Date().toISOString()
        setConversationMessages((prev) =>
          prev.map((msg) =>
            msg.emisor.id_usuario === user.id_usuario &&
            msg.receptor.id_usuario === convPartnerId
              ? {
                  ...msg,
                  is_read: true,
                  is_delivered: true,
                  fecha_entrega: msg.fecha_entrega ?? nowIso,
                  fecha_lectura: msg.fecha_lectura ?? nowIso,
                }
              : msg
          )
        )
      }
    })

    return () => {
      socket.off("new-message")
      socket.off("message-sent")
      socket.off("user-online")
      socket.off("user-offline")
      socket.off("user-status")
      socket.off("users-status")
      socket.off("user-typing")
      socket.off("messages-read")
    }
  }, [socket, user, selectedConversation])

  // 🔥 PEDIR ESTADO INICIAL DE TODOS LOS PARTNERS
  useEffect(() => {
    if (!socket || !user) return
    if (conversations.length === 0) return

    const userIds = conversations
      .map((c) => c.usuario.id_usuario)
      .filter((id) => id !== user.id_usuario)

    if (userIds.length === 0) return

    socket.emit("get-users-status", { userIds })
  }, [socket, user, conversations])

  // -----------------------
  // LOADERS
  // -----------------------
  const loadConversations = async () => {
    if (!user) return
    try {
      const convs = await api.getConversations(user.id_usuario)
      setConversations(convs)
    } catch (err) {
      console.error("Error cargando conversaciones:", err)
    }
  }

  const loadUsers = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      const users = await api.getUsers(token)
      setAllUsers(users)
    } catch (err) {
      console.error("Error cargando usuarios:", err)
      toast.error("No se pudieron cargar los usuarios")
    }
  }

  const loadProfiles = async () => {
    try {
      const profiles: Profile[] = await api.getAllProfiles()
      const map: Record<number, { avatar?: string }> = {}
      profiles.forEach((p) => {
        const uid = p.usuario?.id_usuario ?? p.id_usuario
        if (uid) {
          map[uid] = { avatar: p.avatar }
        }
      })
      setProfilesByUserId(map)
    } catch (err) {
      console.error("Error cargando perfiles (avatares):", err)
    }
  }

  const loadConversation = async (userId: number) => {
    if (!user) return
    setSelectedConversation(userId)
    setLoading(true)

    try {
      const msgs = await api.getConversation(user.id_usuario, userId)

      const normalized = msgs.map((m: Message) => ({
        ...m,
        is_delivered: m.is_delivered ?? !!m.fecha_entrega,
        is_read: m.is_read ?? !!m.fecha_lectura,
      }))

      setConversationMessages(normalized)
      scrollToBottom()

      socket?.emit("mark-conversation-read", {
        userId: user.id_usuario,
        partnerId: userId,
      })

      // pedir estado puntual de este partner por si no vino en el bulk
      socket?.emit("get-users-status", { userIds: [userId] })
    } catch (err) {
      console.error("Error cargando conversación:", err)
      toast.error("No se pudo cargar la conversación")
    } finally {
      setLoading(false)
    }
  }

  // -----------------------
  // SEND MESSAGE
  // -----------------------
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !user || !socket) return

    const tempMessage: Message = {
      id_mensaje: Date.now(),
      contenido: newMessage,
      fecha: new Date().toISOString(),
      emisor: { id_usuario: user.id_usuario, email: user.email },
      receptor: { id_usuario: selectedConversation, email: "" },
      is_delivered: false,
      is_read: false,
      fecha_entrega: null,
      fecha_lectura: null,
    }

    setConversationMessages((prev) => [...prev, tempMessage])
    scrollToBottom()

    socket.emit("send-message", {
      contenido: newMessage,
      emisorID: user.id_usuario,
      receptorID: selectedConversation,
    })

    setNewMessage("")
  }

  // -----------------------
  // HELPERS
  // -----------------------
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 50)
  }

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })

  const getConversationPartner = () => {
    const fromConvs = conversations.find((c) => c.usuario.id_usuario === selectedConversation)?.usuario
    const fromUsers = allUsers.find((u) => u.id_usuario === selectedConversation)
    return fromConvs || fromUsers || null
  }

  const renderMessageStatus = (msg: Message) => {
    if (msg.emisor.id_usuario !== user?.id_usuario) return null
    if (msg.is_read) return <span className="text-sky-400 text-xs">✓✓ Leído</span>
    if (msg.is_delivered) return <span className="text-muted-foreground text-xs">✓✓ Entregado</span>
    return <span className="text-muted-foreground text-xs">✓ Enviado</span>
  }

  const getUserAvatar = (userId?: number | null) => {
    if (!userId) return undefined
    return profilesByUserId[userId]?.avatar
  }

  // -----------------------
  // UI
  // -----------------------
  const partner = getConversationPartner()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex h-[calc(100vh-4rem)]">

          {/* LISTA DE CONVERSACIONES */}
          <div className={`${showConversations ? "flex" : "hidden"} lg:flex w-full lg:w-80 border-r flex-col`}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Mensajes
              </h2>

              <Dialog
                open={isNewConversationOpen}
                onOpenChange={(open) => {
                  setIsNewConversationOpen(open)
                  if (open) {
                    loadUsers()
                  } else {
                    setSearchEmail("")
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva conversación</DialogTitle>
                    <DialogDescription>Busca un usuario por nombre o correo</DialogDescription>
                  </DialogHeader>

                  <Input
                    placeholder="Buscar usuario..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                  />

                  <ScrollArea className="h-[300px] mt-2">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-2 py-4">
                        No se encontraron usuarios
                      </p>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u.id_usuario}
                          onClick={() => {
                            setIsNewConversationOpen(false)
                            setShowConversations(false)
                            loadConversation(u.id_usuario)
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer rounded-lg"
                        >
                          <Avatar>
                            {getUserAvatar(u.id_usuario) && (
                              <AvatarImage
                                src={getUserAvatar(u.id_usuario)}
                                alt={u.email}
                              />
                            )}
                            <AvatarFallback>
                              {u.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {getDisplayNameFromEmail(u.email)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="flex-1">
              {conversations.map((conv) => (
                <div
                  key={conv.usuario.id_usuario}
                  onClick={() => {
                    loadConversation(conv.usuario.id_usuario)
                    setShowConversations(false)
                  }}
                  className={`p-4 border-b cursor-pointer ${
                    selectedConversation === conv.usuario.id_usuario ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {getUserAvatar(conv.usuario.id_usuario) && (
                        <AvatarImage
                          src={getUserAvatar(conv.usuario.id_usuario)}
                          alt={conv.usuario.email}
                        />
                      )}
                      <AvatarFallback>
                        {conv.usuario.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {getDisplayNameFromEmail(conv.usuario.email)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conv.usuario.email}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.ultimoMensaje.contenido}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* CHAT */}
          <div className={`${!showConversations ? "flex" : "hidden"} lg:flex flex-1 flex-col`}>

            {selectedConversation && partner ? (
              <>
                {/* HEADER DEL CHAT */}
                <div className="p-4 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setShowConversations(true)}
                  >
                    <ArrowLeft />
                  </Button>

                  <Avatar>
                    {getUserAvatar(partner.id_usuario) && (
                      <AvatarImage
                        src={getUserAvatar(partner.id_usuario)}
                        alt={partner.email}
                      />
                    )}
                    <AvatarFallback>
                      {partner.email[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="font-medium">
                      {getDisplayNameFromEmail(partner.email)}
                    </p>
                    <p className="text-xs text-muted-foreground">{partner.email}</p>

                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      {onlineUsers.has(selectedConversation) ? (
                        <>
                          <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                          En línea
                        </>
                      ) : lastSeenMap[selectedConversation] ? (
                        <>
                          <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                          Última vez:{" "}
                          {new Date(lastSeenMap[selectedConversation]).toLocaleTimeString()}
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                          Desconectado
                        </>
                      )}
                    </p>

                    {isPartnerTyping && (
                      <p className="text-xs text-muted-foreground">Escribiendo...</p>
                    )}
                  </div>
                </div>

                {/* MENSAJES */}
                <ScrollArea className="flex-1 p-4">
                  {conversationMessages.map((msg) => (
                    <div
                      key={msg.id_mensaje}
                      className={`mb-4 flex ${
                        msg.emisor.id_usuario === user?.id_usuario ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.emisor.id_usuario === user?.id_usuario
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p>{msg.contenido}</p>
                        <p className="text-xs flex justify-between opacity-75 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatTime(msg.fecha)}
                          </span>
                          {renderMessageStatus(msg)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* INPUT */}
                <div className="p-4 border-t flex gap-2">
                  <Textarea
                    value={newMessage}
                    rows={2}
                    className="resize-none"
                    placeholder="Escribe un mensaje..."
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      socket?.emit("typing", {
                        userId: user?.id_usuario,
                        recipientId: selectedConversation,
                      })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />

                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || loading}>
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 opacity-50" />
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
