// src/components/site-header.tsx
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

interface SiteHeaderProps {
  // Dejamos la prop por compatibilidad, aunque no la usamos.
  user?: {
    email: string
    rol: string
  }
}

export function SiteHeader(_props: SiteHeaderProps) {
  return (
    <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Foro Estudiantil</h1>

        <div className="ml-auto flex items-center gap-4">
          {/* Solo el toggle de tema, sin email ni rol */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
