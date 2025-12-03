// src/lib/api.ts
export const API_URL =
  import.meta.env.VITE_API_URL || "http://foroudp.sytes.net:3000";

// Helper para fetch con timeout
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = 10000,
) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

export const api = {
  // =========================
  // AUTH
  // =========================
  signUp: async (data: { email: string; password: string; role: string }) => {
    console.log("📤 API signUp llamado con:", { ...data, password: "***" })
    console.log("🌐 URL:", `${API_URL}/auth/signUp`)

    const res = await fetchWithTimeout(`${API_URL}/auth/signUp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    console.log("📥 Respuesta status:", res.status)
    const json = await res.json()
    console.log("📥 Respuesta JSON:", json)
    return json
  },

  signIn: async (data: { email: string; password: string }) => {
    console.log("📤 API signIn llamado con:", { ...data, password: "***" })
    console.log("🌐 URL:", `${API_URL}/auth/signIn`)

    const res = await fetchWithTimeout(`${API_URL}/auth/signIn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    console.log("📥 Respuesta status:", res.status)
    const json = await res.json()
    console.log("📥 Respuesta JSON:", json)
    return json
  },

  // =========================
  // USERS
  // =========================
  getUsers: async (token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  },

  // =========================
  // FOROS
  // =========================
  getForums: async () => {
    const res = await fetchWithTimeout(`${API_URL}/foros/all`)
    return res.json()
  },

  getForum: async (id: string) => {
    const res = await fetchWithTimeout(`${API_URL}/foros/${id}`)
    return res.json()
  },

  createForum: async (data: any, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/foros/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  deleteForum: async (id: string, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/foros/delete/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  },

  // 🔔 SUSCRIPCIONES A FOROS
  // Backend:
  // GET    /foros/subscription-status/:foroId?userId=XX  (JWT)
  // POST   /foros/subscribe                              (JWT; body { foroId, userId })
  // DELETE /foros/subscribe                              (JWT; body { foroId, userId })
  getForumSubscriptionStatus: async (
    forumId: number,
    userId: number,
    token: string,
  ) => {
    const res = await fetchWithTimeout(
      `${API_URL}/foros/subscription-status/${forumId}?userId=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    if (res.status === 404) {
      return { subscribed: false }
    }
    if (!res.ok) {
      throw new Error(`Subscription status error: ${res.status}`)
    }
    return res.json()
  },

  subscribeToForum: async (forumId: number, userId: number, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/foros/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ foroId: forumId, userId }),
    })
    if (!res.ok) {
      throw new Error(`Subscribe error: ${res.status}`)
    }
    return res.json()
  },

  unsubscribeFromForum: async (
    forumId: number,
    userId: number,
    token: string,
  ) => {
    const res = await fetchWithTimeout(`${API_URL}/foros/subscribe`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ foroId: forumId, userId }),
    })
    if (!res.ok) {
      throw new Error(`Unsubscribe error: ${res.status}`)
    }
    return res.json()
  },

  // =========================
  // POSTS
  // =========================
  getPosts: async () => {
    const res = await fetchWithTimeout(`${API_URL}/posts/all`)
    return res.json()
  },

  getPost: async (id: string) => {
    const res = await fetchWithTimeout(`${API_URL}/posts/${id}`)
    return res.json()
  },

  // data: { titulo, contenido, foroID, autorID }
  // imagen: File opcional
  createPost: async (
    data: {
      titulo: string
      contenido: string
      foroID: number
      autorID: number
    },
    token: string,
    imagen?: File,
  ) => {
    console.log("📤 API createPost llamado con:", data, "imagen?", !!imagen)
    console.log("🌐 URL:", `${API_URL}/posts/create`)

    let options: RequestInit

    if (imagen) {
      const formData = new FormData()
      formData.append("titulo", data.titulo)
      formData.append("contenido", data.contenido)
      formData.append("foroID", String(data.foroID))
      formData.append("autorID", String(data.autorID))
      formData.append("imagen", imagen)

      options = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    } else {
      options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    }

    const res = await fetchWithTimeout(`${API_URL}/posts/create`, options)
    const json = await res.json().catch(() => ({} as any))
    console.log("📥 Respuesta status createPost:", res.status, json)

    if (!res.ok) {
      console.error("❌ Error creando post:", res.status, json)
      throw new Error(json.error || `Error creando post: ${res.status}`)
    }

    return json
  },

  deletePost: async (id: string, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/posts/delete/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  },

  // =========================
  // COMMENTS / COMENTARIOS
  // =========================
  // GET /comentarios/post/:postId
  getCommentsForPost: async (postId: number) => {
    const res = await fetchWithTimeout(
      `${API_URL}/comentarios/post/${postId}`,
    )

    if (res.status === 404) {
      return []
    }

    return res.json()
  },

  // POST /comentarios/create
  // data: { postId, autorId, contenido }
  createCommentForPost: async (data: {
    postId: number
    autorId: number
    contenido: string
  }) => {
    let headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    try {
      const token = localStorage.getItem("token")
      if (token) {
        headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
        }
      }
    } catch {
      // ignoramos
    }

    const payload = {
      contenido: data.contenido,
      postID: data.postId,
      autorID: data.autorId,
    }

    const res = await fetchWithTimeout(`${API_URL}/comentarios/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error creando comentario:", res.status, json)
      throw new Error(json.error || `Error creando comentario: ${res.status}`)
    }

    return json
  },

  // DELETE /comentarios/:id
  deleteComment: async (id: string, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/comentarios/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error eliminando comentario:", res.status, json)
      throw new Error(
        (json as any).error || `Error eliminando comentario: ${res.status}`,
      )
    }

    return json
  },

  // =========================
  // MESSAGES
  // =========================
  sendMessage: async (data: any, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  getConversation: async (userId1: number, userId2: number) => {
    const res = await fetchWithTimeout(
      `${API_URL}/messages/conversation/${userId1}/${userId2}`,
    )
    return res.json()
  },

  getConversations: async (userId: number) => {
    const res = await fetchWithTimeout(
      `${API_URL}/messages/conversations/${userId}`,
    )
    return res.json()
  },

  // =========================
  // NOTIFICATIONS
  // =========================
  createNotification: async (data: any, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/notifications/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  getNotifications: async (userId: number) => {
    const res = await fetchWithTimeout(
      `${API_URL}/notifications/user/${userId}`,
    )
    return res.json()
  },

  getUnreadCount: async (userId: number) => {
    const res = await fetchWithTimeout(
      `${API_URL}/notifications/unread-count/${userId}`,
    )
    return res.json()
  },

  markNotificationAsRead: async (notificationId: number, token: string) => {
    const res = await fetchWithTimeout(
      `${API_URL}/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    return res.json()
  },

  markAllNotificationsAsRead: async (userId: number, token: string) => {
    const res = await fetchWithTimeout(
      `${API_URL}/notifications/user/${userId}/read-all`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    return res.json()
  },

  // =========================
  // REPORTES
  // =========================
  // POST /reportes/create
  // data: { contenidoId, tipoContenido, razon, reportadoPorId }
  createReport: async (
    data: {
      contenidoId: number
      tipoContenido: string
      razon: string
      reportadoPorId: number
    },
    token?: string,
  ) => {
    let headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }

    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const payload = {
      contenidoId: data.contenidoId,
      tipoContenido: data.tipoContenido,
      razon: data.razon,
      reportadoPorId: data.reportadoPorId,
    }

    const res = await fetchWithTimeout(`${API_URL}/reportes/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error creando reporte:", res.status, json)
      throw new Error(json.error || `Error creando reporte: ${res.status}`)
    }

    return json
  },

  // GET /reportes/mios
  getMyReports: async (userId?: number, token?: string) => {
    let headers: HeadersInit = {}

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const query =
      typeof userId === "number" ? `?userId=${encodeURIComponent(userId)}` : ""
    const res = await fetchWithTimeout(`${API_URL}/reportes/mios${query}`, {
      headers,
    })

    if (res.status === 404) {
      return []
    }

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error cargando mis reportes:", res.status, json)
      throw new Error(
        json.error || `Error cargando mis reportes: ${res.status}`,
      )
    }

    return json
  },

  // GET /reportes/todos (requiere rol moderador)
  getAllReports: async (token?: string) => {
    let headers: HeadersInit = {}

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const res = await fetchWithTimeout(`${API_URL}/reportes/todos`, {
      headers,
    })

    if (res.status === 404) {
      return []
    }

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error cargando todos los reportes:", res.status, json)
      throw new Error(
        json.error || `Error cargando todos los reportes: ${res.status}`,
      )
    }

    return json
  },

  // GET /reportes/moderadores
  getModerators: async (token?: string) => {
    let headers: HeadersInit = {}

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const res = await fetchWithTimeout(`${API_URL}/reportes/moderadores`, {
      headers,
    })

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error cargando moderadores:", res.status, json)
      throw new Error(
        json.error || `Error cargando moderadores: ${res.status}`,
      )
    }

    return json
  },

  // PATCH /reportes/:id/estado
  updateReportStatus: async (
    reportId: number,
    status: string,
    token?: string,
  ) => {
    let headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const res = await fetchWithTimeout(
      `${API_URL}/reportes/${reportId}/estado`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ estado: status }),
      },
    )

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error(
        "❌ Error actualizando estado del reporte:",
        res.status,
        json,
      )
      throw new Error(
        json.error || `Error actualizando estado del reporte: ${res.status}`,
      )
    }

    return json
  },

  // DELETE /reportes/:id  (el propio usuario)
  deleteReport: async (reportId: number, token?: string) => {
    let headers: HeadersInit = {}

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const res = await fetchWithTimeout(`${API_URL}/reportes/${reportId}`, {
      method: "DELETE",
      headers,
    })

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error eliminando reporte:", res.status, json)
      throw new Error(json.error || `Error eliminando reporte: ${res.status}`)
    }

    return json
  },

  // DELETE /reportes/admin/:id  (admin/moderador)
  adminDeleteReport: async (reportId: number, token?: string) => {
    let headers: HeadersInit = {}

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const res = await fetchWithTimeout(
      `${API_URL}/reportes/admin/${reportId}`,
      {
        method: "DELETE",
        headers,
      },
    )

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error(
        "❌ Error eliminando reporte como admin:",
        res.status,
        json,
      )
      throw new Error(
        json.error || `Error eliminando reporte (admin): ${res.status}`,
      )
    }

    return json
  },

  // POST /reportes/asignar
  assignModerationTask: async (
    data: { report_id: number; moderator_email: string; comentario: string },
    token?: string,
  ) => {
    let headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const res = await fetchWithTimeout(`${API_URL}/reportes/asignar`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    })

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error(
        "❌ Error asignando tarea de moderación:",
        res.status,
        json,
      )
      throw new Error(
        json.error || `Error asignando tarea de moderación: ${res.status}`,
      )
    }

    return json
  },

  // =========================
  // EVENTOS
  // =========================
  // POST /eventos/create
  createEvent: async (
    data: {
      nombre: string
      descripcion?: string
      fecha: string // "YYYY-MM-DD"
      creadorID: number
    },
    token?: string,
  ) => {
    let headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    // Mandamos la fecha tal cual "YYYY-MM-DD" para que el backend la trate como día calendario
    const payload = {
      nombre: data.nombre,
      descripcion: data.descripcion ?? "",
      fecha: data.fecha,
      creadorID: data.creadorID,
    }

    const res = await fetchWithTimeout(`${API_URL}/eventos/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error creando evento:", res.status, json)
      throw new Error(json.error || `Error creando evento: ${res.status}`)
    }

    return json
  },

  // GET /eventos/all
  getEvents: async () => {
    const res = await fetchWithTimeout(`${API_URL}/eventos/all`)

    if (res.status === 404) return []

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error cargando eventos:", res.status, json)
      throw new Error(json.error || `Error cargando eventos: ${res.status}`)
    }

    return json
  },

  // GET /eventos/mios?userId=XX
  getMyEvents: async (userId: number, token?: string) => {
    let headers: HeadersInit = {}

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const res = await fetchWithTimeout(
      `${API_URL}/eventos/mios?userId=${encodeURIComponent(userId)}`,
      { headers },
    )

    if (res.status === 404) return []

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error cargando mis eventos:", res.status, json)
      throw new Error(json.error || `Error cargando mis eventos: ${res.status}`)
    }

    return json
  },

  // GET /eventos/:id
  getEvent: async (id: number) => {
    const res = await fetchWithTimeout(`${API_URL}/eventos/${id}`)
    const json = await res.json().catch(() => ({} as any))
    if (!res.ok) {
      console.error("❌ Error cargando evento:", res.status, json)
      throw new Error(json.error || `Error cargando evento: ${res.status}`)
    }
    return json
  },

  // PATCH /eventos/:id
  updateEvent: async (
    id: number,
    data: { nombre: string; descripcion?: string; fecha: string },
    token?: string,
  ) => {
    let headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const payload = {
      nombre: data.nombre,
      descripcion: data.descripcion ?? "",
      fecha: data.fecha, // "YYYY-MM-DD"
    }

    const res = await fetchWithTimeout(`${API_URL}/eventos/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({} as any))

    if (!res.ok) {
      console.error("❌ Error actualizando evento:", res.status, json)
      throw new Error(json.error || `Error actualizando evento: ${res.status}`)
    }

    return json
  },

  // DELETE /eventos/:id (creador)
  deleteEvent: async (id: number, token?: string) => {
    let headers: HeadersInit = {}

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const res = await fetchWithTimeout(`${API_URL}/eventos/${id}`, {
      method: "DELETE",
      headers,
    })

    const json = await res.json().catch(() => ({} as any))
    if (!res.ok) {
      console.error("❌ Error eliminando evento:", res.status, json)
      throw new Error(json.error || `Error eliminando evento: ${res.status}`)
    }

    return json
  },

  // DELETE /eventos/admin/:id (moderador)
  adminDeleteEvent: async (id: number, token?: string) => {
    let headers: HeadersInit = {}

    let authToken = token
    if (!authToken) {
      try {
        authToken = localStorage.getItem("token") || undefined
      } catch {
        // nada
      }
    }
    if (authToken) {
      headers = {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      }
    }

    const res = await fetchWithTimeout(`${API_URL}/eventos/admin/${id}`, {
      method: "DELETE",
      headers,
    })

    const json = await res.json().catch(() => ({} as any))
    if (!res.ok) {
      console.error(
        "❌ Error eliminando evento (admin):",
        res.status,
        json,
      )
      throw new Error(
        json.error || `Error eliminando evento (admin): ${res.status}`,
      )
    }

    return json
  },

  // =========================
  // PROFILES
  // =========================
  getProfile: async (userId: number) => {
    const res = await fetchWithTimeout(`${API_URL}/profiles/user/${userId}`)
    if (res.status === 404) return null
    return res.json()
  },

  createProfile: async (data: {
    avatar?: string
    biografia?: string
    usuarioID: number
  }) => {
    const res = await fetchWithTimeout(`${API_URL}/profiles/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  updateProfile: async (
    profileId: number,
    data: { avatar?: string; biografia?: string },
  ) => {
    const res = await fetchWithTimeout(`${API_URL}/profiles/${profileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  getAllProfiles: async () => {
    const res = await fetchWithTimeout(`${API_URL}/profiles/all`)
    return res.json()
  },
}
