// src/components/nav-secondary.tsx
import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type NavSecondaryItem = {
  title: string
  url: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

interface NavSecondaryProps {
  items: NavSecondaryItem[]
  unreadNotifications?: number
  unreadMessages?: number
  className?: string
}

export function NavSecondary({
  items,
  unreadNotifications = 0,
  unreadMessages = 0,
  className,
}: NavSecondaryProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <SidebarGroup className={className}>
      <SidebarGroupLabel>Más</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url

            const isNotifications = item.title === "Notificaciones"
            const isMessages = item.title === "Mensajes"

            const badgeCount = isNotifications
              ? unreadNotifications
              : isMessages
              ? unreadMessages
              : 0

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => navigate(item.url)}
                  className={cn(
                    "flex items-center gap-2",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1 text-sm">{item.title}</span>

                  {badgeCount > 0 && (
                    <span className="ml-2 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
