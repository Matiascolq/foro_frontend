// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Obtiene un nombre "bonito" desde un correo UDP:
 * - nombre.apellido@mail.udp.cl     -> "Nombre Apellido"
 * - nombre.apellido2@mail.udp.cl    -> "Nombre Apellido"
 * - nombre.sapellido@mail.udp.cl    -> "Nombre Sapellido"
 * Si no se puede parsear bien, devuelve la parte antes de la @ tal cual.
 */
export function nameFromEmail(email?: string | null): string {
  if (!email) return "Invitado"

  const [localPart] = email.split("@")
  if (!localPart) return "Invitado"

  // Separar por puntos: "nombre.apellido2" -> ["nombre", "apellido2"]
  const rawParts = localPart.split(".")

  // Quitar números al final (apellido2 -> apellido)
  const cleanedParts = rawParts
    .map((part) => part.replace(/\d+$/, ""))
    .filter((part) => part.length > 0)

  if (cleanedParts.length === 0) {
    // Si queda vacío, usamos el localPart original
    return localPart
  }

  const capitalize = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

  return cleanedParts.map(capitalize).join(" ")
}

/**
 * Alias para compatibilidad con imports antiguos:
 * import { getDisplayNameFromEmail } from "@/lib/utils"
 */
export function getDisplayNameFromEmail(email?: string | null): string {
  return nameFromEmail(email)
}

export function parseUserFromToken(token: string) {
  try {
    const parts = token.split(".")
    
    if (parts.length === 3) {
      // Formato JWT
      const payload = JSON.parse(atob(parts[1]))
      const displayName = nameFromEmail(payload.email)

      return {
        id_usuario: payload.id_usuario,
        email: payload.email,
        role: payload.role,
        name: displayName,
        avatar: "",
        rol: payload.role,
        exp: payload.exp,
        iat: payload.iat,
      }
    } else if (token.startsWith("token-")) {
      // Formato antiguo: token-{id}-{email}
      const tokenParts = token.split("-")
      const id = parseInt(tokenParts[1])
      const email = tokenParts.slice(2).join("-")
      const displayName = nameFromEmail(email)

      return {
        id_usuario: id,
        email,
        role: "estudiante",
        name: displayName,
        avatar: "",
        rol: "estudiante",
        exp: null,
        iat: null,
      }
    }

    throw new Error("Invalid token format")
  } catch (error) {
    console.error("Error parsing token:", error)
    return null
  }
}

export function buildServiceMessage(service: string, action: string, ...args: any[]) {
  const token = localStorage.getItem("token")
  if (!token) {
    console.error("No token found")
    return ""
  }

  let message = `${service}${action} ${token}`
  if (args.length > 0) {
    message += " " + args.join(" ")
  }

  return message
}

export function clearAuthState() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

export function getTokenExpiration(token: string): string | null {
  try {
    const parts = token.split(".")
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
  localStorage.setItem("token", token)
  localStorage.setItem("user", JSON.stringify(user))
}

export function getStoredAuthState() {
  const token = localStorage.getItem("token")
  const userStr = localStorage.getItem("user")

  if (!token || !userStr) return null

  try {
    const user = JSON.parse(userStr)
    return { token, user }
  } catch (error) {
    console.error("Error parsing stored user:", error)
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".")
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
