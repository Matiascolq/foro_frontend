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
import { Label } from "@/components/ui/label"
import { MessageSquare, Send, Clock, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useWebSocket } from "@/contexts/WebSocketContext"

type Message = {
  id_mensaje: number
  contenido: string
  fecha: string
  emisor: {
    id_usuario: number
    email: string
  }
  receptor: {
    id_usuario: number
    email: string
  }
}

type Conversation = {
  usuario: {
    id_usuario: number
    email: string
    role: string
  }
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
  
  // New conversation dialog
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [searchEmail, setSearchEmail] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    loadConversations()
  }, [isAuthenticated])

  useEffect(() => {
    if (!socket || !isConnected) return

    socket.on("new-message", (message: Message) => {
      console.log("📩 Nuevo mensaje recibido:", message)
      loadConversations()
      
      if (selectedConversation === message.emisor.id_usuario || selectedConversation === message.receptor.id_usuario) {
        setConversationMessages((prev) => [...prev, message])
        scrollToBottom()
      }
      
      toast.success(`Nuevo mensaje de ${message.emisor.email}`)
    })

    socket.on("message-sent", (data) => {
      console.log("✅ Mensaje enviado:", data)
    })

    return () => {
      socket.off("new-message")
      socket.off("message-sent")
    }
  }, [socket, isConnected, selectedConversation])

  useEffect(() => {
    if (searchEmail.trim()) {
      const filtered = allUsers.filter((u) => 
        u.email.toLowerCase().includes(searchEmail.toLowerCase()) &&
        u.id_usuario !== user?.id_usuario
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers([])
    }
  }, [searchEmail, allUsers, user])

  const loadConversations = async () => {
    if (!user) return
    try {
      const convs = await api.getConversations(user.id_usuario)
      console.log("📥 Conversaciones:", convs)
      setConversations(convs)
    } catch (error) {
      console.error("❌ Error cargando conversaciones:", error)
      toast.error("Error al cargar conversaciones")
    }
  }

  const loadUsers = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    
    try {
      const users = await api.getUsers(token)
      console.log("📥 Usuarios:", users)
      setAllUsers(users)
    } catch (error) {
      console.error("❌ Error cargando usuarios:", error)
    }
  }

  const loadConversation = async (userId: number) => {
    if (!user) return
    setSelectedConversation(userId)
    setLoading(true)
    try {
      const messages = await api.getConversation(user.id_usuario, userId)
      console.log("📥 Mensajes de conversación:", messages)
      setConversationMessages(messages)
      scrollToBottom()
    } catch (error) {
      console.error("❌ Error cargando conversación:", error)
      toast.error("Error al cargar conversación")
    } finally {
      setLoading(false)
    }
  }

  const handleStartConversation = (selectedUser: User) => {
    setSelectedConversation(selectedUser.id_usuario)
    setConversationMessages([])
    setIsNewConversationOpen(false)
    setSearchEmail("")
    
    // Add to conversations list if not exists
    const exists = conversations.find(c => c.usuario.id_usuario === selectedUser.id_usuario)
    if (!exists) {
      toast.success(`Conversación iniciada con ${selectedUser.email}`)
    }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !user || !socket) return

    const messageData = {
      contenido: newMessage,
      emisorID: user.id_usuario,
      receptorID: selectedConversation
    }

    socket.emit("send-message", messageData)
    
    // Optimistic update
    setConversationMessages((prev) => [
      ...prev,
      {
        id_mensaje: Date.now(),
        contenido: newMessage,
        fecha: new Date().toISOString(),
        emisor: { id_usuario: user.id_usuario, email: user.email },
        receptor: { id_usuario: selectedConversation, email: "" }
      }
    ])
    
    setNewMessage("")
    scrollToBottom()
    
    // Reload conversations to update last message
    setTimeout(() => loadConversations(), 500)
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getConversationPartner = () => {
    const conv = conversations.find((c) => c.usuario.id_usuario === selectedConversation)
    if (conv) return conv.usuario
    
    // If new conversation, try to find user in allUsers
    return allUsers.find(u => u.id_usuario === selectedConversation)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Conversations List */}
          <div className="w-80 border-r flex flex-col">
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
                    <DialogTitle>Nueva Conversación</DialogTitle>
                    <DialogDescription>Busca un usuario para iniciar una conversación</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input className="text-sm sm:text-base"
                        placeholder="Buscar por email..."
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-[300px]">
                      {filteredUsers.length === 0 && searchEmail.trim() ? (
                        <p className="text-center text-muted-foreground py-4">No se encontraron usuarios</p>
                      ) : filteredUsers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Escribe un email para buscar</p>
                      ) : (
                        <div className="space-y-2">
                          {filteredUsers.map((u) => (
                            <div
                              key={u.id_usuario}
                              onClick={() => handleStartConversation(u)}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
                            >
                              <Avatar>
                                <AvatarFallback>{u.email.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">{u.email}</p>
                                <p className="text-xs text-muted-foreground">{u.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>No hay conversaciones</p>
                  <p className="text-xs mt-2">Haz clic en + para iniciar una</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.usuario.id_usuario}
                    onClick={() => loadConversation(conv.usuario.id_usuario)}
                    className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                      selectedConversation === conv.usuario.id_usuario ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {conv.usuario.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.usuario.email}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.ultimoMensaje.contenido}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Messages View */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {getConversationPartner()?.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {getConversationPartner()?.email || "Usuario"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {isConnected ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          En línea
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                          Desconectado
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      Cargando mensajes...
                    </div>
                  ) : conversationMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>No hay mensajes. Escribe el primero!</p>
                    </div>
                  ) : (
                    <>
                      {conversationMessages.map((msg) => (
                        <div
                          key={msg.id_mensaje}
                          className={`mb-4 flex ${
                            msg.emisor.id_usuario === user?.id_usuario
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.emisor.id_usuario === user?.id_usuario
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="break-words">{msg.contenido}</p>
                            <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(msg.fecha)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Escribe un mensaje..."
                      className="resize-none"
                      rows={2}
                      disabled={!isConnected}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !isConnected}
                      size="icon"
                      className="h-full"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {!isConnected && (
                    <p className="text-xs text-destructive mt-2">
                      No conectado. Esperando conexión...
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Selecciona una conversación o inicia una nueva</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
