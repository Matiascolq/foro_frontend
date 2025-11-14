const API_URL = import.meta.env.VITE_API_URL || "http://192.168.100.245:3000";

// Helper para fetch con timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const api = {
  // Auth
  signUp: async (data: { email: string; password: string; role: string }) => {
    console.log('📤 API signUp llamado con:', { ...data, password: '***' });
    console.log('🌐 URL:', `${API_URL}/auth/signUp`);
    
    const res = await fetchWithTimeout(`${API_URL}/auth/signUp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    console.log('📥 Respuesta status:', res.status);
    const json = await res.json();
    console.log('📥 Respuesta JSON:', json);
    return json;
  },
  
  signIn: async (data: { email: string; password: string }) => {
    console.log("📤 API signIn llamado con:", { ...data, password: "***" });
    console.log("🌐 URL:", `${API_URL}/auth/signIn`);
    const res = await fetchWithTimeout(`${API_URL}/auth/signIn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    console.log("📥 Respuesta status:", res.status);
    const json = await res.json();
    console.log("📥 Respuesta JSON:", json);
    return json;
  },
  
  // Users
  getUsers: async (token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },
  
  // Forums
  getForums: async () => {
    const res = await fetchWithTimeout(`${API_URL}/foros/all`);
    return res.json();
  },
  
  getForum: async (id: string) => {
    const res = await fetchWithTimeout(`${API_URL}/foros/${id}`);
    return res.json();
  },
  
  createForum: async (data: any, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/foros/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  
  deleteForum: async (id: string, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/foros/delete/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },
  
  // Posts
  getPosts: async () => {
    const res = await fetchWithTimeout(`${API_URL}/posts/all`);
    return res.json();
  },
  
  getPost: async (id: string) => {
    const res = await fetchWithTimeout(`${API_URL}/posts/${id}`);
    return res.json();
  },
  
  createPost: async (data: any, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/posts/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  
  deletePost: async (id: string, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/posts/delete/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },
  
  // Messages
  sendMessage: async (data: any, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/messages/send`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  
  getConversation: async (userId1: number, userId2: number) => {
    const res = await fetchWithTimeout(`${API_URL}/messages/conversation/${userId1}/${userId2}`);
    return res.json();
  },
  
  getConversations: async (userId: number) => {
    const res = await fetchWithTimeout(`${API_URL}/messages/conversations/${userId}`);
    return res.json();
  },
  
  // Notifications
  createNotification: async (data: any, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/notifications/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  
  getNotifications: async (userId: number) => {
    const res = await fetchWithTimeout(`${API_URL}/notifications/user/${userId}`);
    return res.json();
  },
  
  getUnreadCount: async (userId: number) => {
    const res = await fetchWithTimeout(`${API_URL}/notifications/unread-count/${userId}`);
    return res.json();
  },
  
  markNotificationAsRead: async (notificationId: number, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },
  
  markAllNotificationsAsRead: async (userId: number, token: string) => {
    const res = await fetchWithTimeout(`${API_URL}/notifications/user/${userId}/read-all`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  }
  ,

  // Profiles
  getProfile: async (userId: number) => {
    const res = await fetchWithTimeout(`${API_URL}/profiles/user/${userId}`);
    if (res.status === 404) return null;
    return res.json();
  },

  createProfile: async (data: { avatar?: string; biografia?: string; usuarioID: number }) => {
    const res = await fetchWithTimeout(`${API_URL}/profiles/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateProfile: async (profileId: number, data: { avatar?: string; biografia?: string }) => {
    const res = await fetchWithTimeout(`${API_URL}/profiles/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getAllProfiles: async () => {
    const res = await fetchWithTimeout(`${API_URL}/profiles/all`);
    return res.json();
  }
};
