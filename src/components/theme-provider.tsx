// src/components/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

type ThemeProviderProps = {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"   // o "dark" si quieres que parta siempre en oscuro
      enableSystem
      /* 👇 IMPORTANTE: sacamos disableTransitionOnChange */
      // disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
