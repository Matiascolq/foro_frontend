import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { useUnreadMessages } from "@/hooks/useUnreadMessages"

import {
  IconBell,
  IconLayoutDashboard,
  IconMessage,
  IconReport,
  IconCalendarEvent,
  IconBook,
  IconClipboardList,
  IconChevronRight,
  IconUsers,
  IconShield,
  IconInfoCircle,
  IconFileText,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string
    email: string
    avatar: string
    rol?: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const { user: authUser } = useAuth()
  const { unreadNotifications } = useWebSocket()
  const { unreadMessages } = useUnreadMessages()

  const currentUser = user || authUser
  const navigate = useNavigate()

  // ----- Navegación principal -----
  const navMain = [
    {
      title: "Foros",
      url: "/forums",
      icon: IconLayoutDashboard,
    },
    {
      title: "Mis Publicaciones",
      // antes estaba "/perfil" pero la página es "profile.tsx"
      url: "/profile",
      icon: IconFileText,
    },
    {
      title: "Estadísticas",
      url: "/stats",
      icon: IconClipboardList,
    },
  ]

  // ----- Documentos (por ahora desactivado) -----
  const navDocuments = [
    {
      name: "Normas del foro",
      url: "/rules",
      icon: IconBook,
    },
    {
      name: "Estadísticas",
      url: "/stats",
      icon: IconClipboardList,
    },
    {
      name: "Documentos del curso",
      url: "/documents",
      icon: IconBook,
    },
  ]

  // ----- Navegación secundaria -----
  const navSecondary = [
    {
      title: "Notificaciones",
      url: "/notifications",
      icon: IconBell,
    },
    {
      title: "Mensajes",
      url: "/messages",
      icon: IconMessage,
    },
    {
      title: "Reportes",
      url: "/crear-reporte",
      icon: IconReport,
    },
    {
      title: "Eventos",
      url: "/crear-evento",
      icon: IconCalendarEvent,
    },
    {
      title: "Información del Sistema",
      url: "/system-info",
      icon: IconInfoCircle,
    },
  ]

  // ----- Admin (moderador) -----
  const navAdmin = [
    {
      title: "Gestión de Usuarios",
      url: "/admin/users",
      icon: IconUsers,
    },
  ]

  const isModerator = currentUser?.rol === "moderador"

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* 
              Antes hacía navigate("/") y la app te hacía pasar por login,
              generando el "glitch". Ahora vamos directo a /forums.
            */}
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:!p-1.5"
              type="button"
              onClick={() => navigate("/forums")}
            >
              <IconChevronRight className="!size-5" />
              <span className="text-base font-semibold">Foro UDP</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Navegación principal (Foros, Mis Publicaciones, Estadísticas) */}
        <NavMain items={navMain} />

        {/* 
          Sección de documentos desactivada por ahora.
          Si la quieres reactivar, solo quita los comentarios.
        */}
        {/*
        <NavDocuments items={navDocuments} />
        */}

        {/* 
          Bloque de administración solo para moderadores.
          Si aún no usan esta parte, se puede dejar comentada.
        */}
        {/*
        {isModerator && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <IconShield className="h-4 w-4" />
              Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navAdmin.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      onClick={() => navigate(item.url)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        */}

        {/* Navegación secundaria (notificaciones, mensajes, etc.) */}
        <NavSecondary
          items={navSecondary}
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
          className="mt-auto"
        />
      </SidebarContent>

      <SidebarFooter>
        {currentUser && <NavUser user={currentUser} />}
      </SidebarFooter>
    </Sidebar>
  )
}
