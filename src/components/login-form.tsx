"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading, updateToken } = useAuth()

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/forums")
    }
  }, [isAuthenticated, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error("Por favor completa todos los campos")
      return
    }
    
    setIsLoading(true)
    toast.info("Iniciando sesión...")

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://foroudp.sytes.net:3000"
      const res = await fetch(`${API_URL}/auth/signIn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || "Credenciales inválidas")
        setIsLoading(false)
        return
      }

      if (data.token) {
        toast.success(`¡Bienvenido! ${email}`)
        updateToken(data.token)
        navigate("/forums")
      } else {
        toast.error("No se recibió token del servidor")
        setIsLoading(false)
      }
    } catch (err: any) {
      toast.error("Error al conectar con el servidor")
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{backgroundImage: "url(https://ingenieriayciencias.udp.cl/cms/wp-content/uploads/2022/10/FACHADA-FIC-UDP-scaled.jpg)"}} className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center p-6 bg-cover bg-center bg-no-repeat",
        className
      )}
      {...props}
    >
      <Card className="w-full max-w-md shadow-lg border border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Accede con tu correo institucional
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@mail.udp.cl"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </div>
            <div className="text-center text-sm">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="underline underline-offset-4 hover:text-primary"
                disabled={isLoading}
              >
                Regístrate aquí
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
