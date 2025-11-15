"use client"

import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MessageSquare, Send, Clock, Plus, Search, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useWebSocket } from "@/contexts/WebSocketContext"

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

export default function Messages() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { socket, isConnected } = useWebSocket()

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

  // -----------------------
  // INIT
  // -----------------------
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    loadConversations()
  }, [isAuthenticated])

  // -----------------------
  // SOCKET LISTENERS
  // -----------------------
  useEffect(() => {
    if (!socket || !user) return

    socket.emit("register", { userId: user.id_usuario })

    // ---------------------------------
    // 📩 NEW MESSAGE
    // ---------------------------------
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

    // ---------------------------------
    // ✉️ CONFIRMACIÓN message-sent
    // ---------------------------------
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

    // ---------------------------------
    // USUARIO ONLINE
    // ---------------------------------
    socket.on("user-online", ({ userId }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId))
    })

    // ---------------------------------
    // USUARIO OFFLINE
    // ---------------------------------
    socket.on("user-offline", ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
      setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }))
    })

    // ---------------------------------
    // USER-STATUS
    // ---------------------------------
    socket.on("user-status", ({ userId, online, lastSeen }) => {
      if (online) {
        setOnlineUsers((prev) => new Set(prev).add(userId))
      } else {
        setOnlineUsers((prev) => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
        if (lastSeen) {
          setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }))
        }
      }
    })

    // ---------------------------------
    // TYPING
    // ---------------------------------
    socket.on("user-typing", ({ userId: typingUserId }) => {
      if (selectedConversation === typingUserId) {
        setIsPartnerTyping(true)
        setTimeout(() => setIsPartnerTyping(false), 1500)
      }
    })

    // ---------------------------------
    // READ RECEIPTS
    // ---------------------------------
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
      socket.off("user-typing")
      socket.off("messages-read")
    }
  }, [socket, user, selectedConversation])

  // -----------------------
  // LOADERS
  // -----------------------
  const loadConversations = async () => {
    if (!user) return
    const convs = await api.getConversations(user.id_usuario)
    setConversations(convs)
  }

  const loadUsers = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    const users = await api.getUsers(token)
    setAllUsers(users)
  }

  const loadConversation = async (userId: number) => {
    if (!user) return
    setSelectedConversation(userId)
    setLoading(true)

    const msgs = await api.getConversation(user.id_usuario, userId)

    const normalized = msgs.map((m) => ({
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

    setLoading(false)
  }

  // -----------------------
  // SEND MESSAGE (FIX COMPLETO)
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

    // 👉 Mostrar de inmediato al EMISOR
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

  const getConversationPartner = () =>
    conversations.find((c) => c.usuario.id_usuario === selectedConversation)?.usuario ||
    allUsers.find((u) => u.id_usuario === selectedConversation) ||
    null

  const renderMessageStatus = (msg: Message) => {
    if (msg.emisor.id_usuario !== user?.id_usuario) return null
    if (msg.is_read) return <span className="text-sky-400 text-xs">✓✓ Leído</span>
    if (msg.is_delivered) return <span className="text-muted-foreground text-xs">✓✓ Entregado</span>
    return <span className="text-muted-foreground text-xs">✓ Enviado</span>
  }

  // -----------------------
  // UI
  // -----------------------
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

              <Dialog open={isNewConversationOpen} onOpenChange={(open) => {
                setIsNewConversationOpen(open)
                if (open) loadUsers()
              }}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva conversación</DialogTitle>
                    <DialogDescription>Busca un usuario</DialogDescription>
                  </DialogHeader>

                  <Input
                    placeholder="Buscar email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                  />

                  <ScrollArea className="h-[300px] mt-2">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id_usuario}
                        onClick={() => {
                          setSelectedConversation(u.id_usuario)
                          setConversationMessages([])
                          setIsNewConversationOpen(false)
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer rounded-lg"
                      >
                        <Avatar><AvatarFallback>{u.email[0].toUpperCase()}</AvatarFallback></Avatar>
                        <div>
                          <p>{u.email}</p>
                          <p className="text-xs text-muted-foreground">{u.role}</p>
                        </div>
                      </div>
                    ))}
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
                    <Avatar><AvatarFallback>{conv.usuario.email[0].toUpperCase()}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium">{conv.usuario.email}</p>
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

            {selectedConversation ? (
              <>
                {/* HEADER DEL CHAT */}
                <div className="p-4 border-b flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setShowConversations(true)}>
                    <ArrowLeft />
                  </Button>

                  <Avatar>
                    <AvatarFallback>
                      {getConversationPartner()?.email[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="font-medium">{getConversationPartner()?.email}</p>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {onlineUsers.has(selectedConversation) ? (
                        <>
                          <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                          En línea
                        </>
                      ) : lastSeenMap[selectedConversation] ? (
                        <>
                          <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                          Última vez: {new Date(lastSeenMap[selectedConversation]).toLocaleTimeString()}
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

                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
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
