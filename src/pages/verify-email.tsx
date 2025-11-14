import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

export function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Token de verificación no encontrado')
      return
    }

    verifyEmail(token)
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-email?token=${token}`)
      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage('¡Tu email ha sido verificado exitosamente!')
        setTimeout(() => navigate('/login'), 3000)
      } else {
        setStatus('error')
        setMessage(data.message || 'Error al verificar el email')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Error de conexión. Por favor intenta de nuevo.')
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "url(https://ingenieriayciencias.udp.cl/cms/wp-content/uploads/2022/10/FACHADA-FIC-UDP-scaled.jpg)"
      }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Verificación de Email</CardTitle>
          <CardDescription>Foro UDP</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center">Verificando tu email...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-center font-medium text-green-600">{message}</p>
              <p className="text-sm text-muted-foreground text-center">
                Serás redirigido al login en unos segundos...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center font-medium text-red-600">{message}</p>
              <Button onClick={() => navigate('/login')} className="mt-4">
                Ir al Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
