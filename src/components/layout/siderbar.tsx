"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { menuByRole } from "@/lib/permissions"
import { signOut } from "next-auth/react"

interface Props {
  role: keyof typeof menuByRole
  defaultCollapsed: boolean
}

export function Sidebar({ role, defaultCollapsed }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  function toggleSidebar() {
    const newState = !collapsed
    setCollapsed(newState)
    document.cookie = `sidebar-collapsed=${newState}; path=/; max-age=31536000`
  }

  const menu = menuByRole[role] ?? menuByRole.MASTER

  return (
    <TooltipProvider delayDuration={0}>
      <aside
      className={cn(
        "sticky top-0 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
      >

        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && <span className="font-bold text-lg text-sidebar-primary">Ofícios</span>}
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={toggleSidebar}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {menu.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href

            const content = (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {!collapsed && item.label}
                </Button>
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }

            return content
          })}
        </nav>

        {/* Botão de sair no rodapé */}
        <div className="p-2 border-t border-sidebar-border">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full text-sidebar-foreground/70 hover:text-white hover:bg-destructive/80"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-white hover:bg-destructive/80"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-5 h-5" />
              Sair
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}