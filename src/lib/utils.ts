import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseUserFromToken(token: string) {
  try {
    // JWT token format: header.payload.signature
    const parts = token.split('.')
    
    if (parts.length === 3) {
      // It's a JWT token
      const payload = JSON.parse(atob(parts[1]))
      return {
        id_usuario: payload.id_usuario,
        email: payload.email,
        role: payload.role,
        name: payload.email.split('@')[0],
        avatar: '',
        rol: payload.role,
        exp: payload.exp,
        iat: payload.iat
      }
    } else if (token.startsWith('token-')) {
      // Old format: token-{id}-{email}
      const tokenParts = token.split('-')
      const id = parseInt(tokenParts[1])
      const email = tokenParts.slice(2).join('-')
      return {
        id_usuario: id,
        email: email,
        role: 'estudiante',
        name: email.split('@')[0],
        avatar: '',
        rol: 'estudiante',
        exp: null,
        iat: null
      }
    }
    
    throw new Error('Invalid token format')
  } catch (error) {
    console.error('Error parsing token:', error)
    return null
  }
}

export function buildServiceMessage(service: string, action: string, ...args: any[]) {
  const token = localStorage.getItem('token')
  if (!token) {
    console.error('No token found')
    return ''
  }
  
  let message = `${service}${action} ${token}`
  if (args.length > 0) {
    message += ' ' + args.join(' ')
  }
  
  return message
}

export function clearAuthState() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function getTokenExpiration(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      if (payload.exp) {
        return new Date(payload.exp * 1000).toLocaleString()
      }
    }
    return null
  } catch (error) {
    return null
  }
}

export function storeAuthState(token: string, user: any) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function getStoredAuthState() {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  
  if (!token || !userStr) return null
  
  try {
    const user = JSON.parse(userStr)
    return { token, user }
  } catch (error) {
    console.error('Error parsing stored user:', error)
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      if (payload.exp) {
        return Date.now() >= payload.exp * 1000
      }
    }
    return false
  } catch (error) {
    return true
  }
}
