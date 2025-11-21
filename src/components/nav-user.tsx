import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LogOut,
  User,
  HelpCircle,
  ChevronRight,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { nameFromEmail } from "@/lib/utils"

type NavUserProps = {
  user?: {
    id_usuario?: number
    name?: string
    email?: string
    avatar?: string
    rol?: string
  } | null
}

export function NavUser({ user }: NavUserProps) {
  const navigate = useNavigate()
  const { logout, user: authUser } = useAuth()
  const currentUser = user ?? authUser

  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    currentUser?.avatar || undefined
  )

  // Cargar avatar desde el perfil REST si no viene en el user
  useEffect(() => {
    let cancelled = false

    const loadAvatar = async () => {
      if (!currentUser) return

      // Si ya tenemos avatar en el user, úsalo
      if (currentUser.avatar) {
        setAvatarUrl(currentUser.avatar)
        return
      }

      // Intentar obtener perfil por REST
      if (!currentUser.id_usuario) return

      try {
        const profile = await api.getProfile(currentUser.id_usuario)
        if (!cancelled && profile?.avatar) {
          setAvatarUrl(profile.avatar)
        }
      } catch (error) {
        console.error("Error cargando avatar de perfil:", error)
      }
    }

    loadAvatar()

    return () => {
      cancelled = true
    }
  }, [currentUser?.id_usuario, currentUser?.avatar])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const displayEmail = currentUser?.email ?? "Sin correo"
  const displayName =
    currentUser?.name ||
    (currentUser?.email ? nameFromEmail(currentUser.email) : "Invitado")

  const fallbackInitial = displayName?.[0]?.toUpperCase() || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-left"
        >
          <Avatar className="h-8 w-8">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : (
              <AvatarImage src="" alt={displayName} />
            )}
            <AvatarFallback>{fallbackInitial}</AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <p className="text-sm font-medium leading-none">
              {displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayEmail}
            </p>
          </div>

          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayEmail}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/perfil")}>
          <User className="mr-2 h-4 w-4" />
          Perfil
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate("/ayuda")}>
          <HelpCircle className="mr-2 h-4 w-4" />
          Ayuda
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
