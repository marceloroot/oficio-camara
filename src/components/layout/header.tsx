// src/components/layout/header.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Menu, Bell, FileText, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useNotificacoes } from "@/hooks/use-notificacoes"

export function Header({ onOpenMobile }: { onOpenMobile?: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { notificacoes, naoLidas, carregando, marcarTodasLidas, marcarLida } =
    useNotificacoes()

  async function handleAbrirNotificacao(n: {
    id: string
    lida: boolean
    oficioId: string | null
  }) {
    if (!n.lida) await marcarLida(n.id)
    if (n.oficioId) {
      setOpen(false)
      router.push(`/dashboard/secretaria/${n.oficioId}`)
    }
  }

  return (
    <header className="h-16 border-b-2 border-[#ffcd07] flex items-center justify-between px-6 bg-[#787878] text-white sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white hover:bg-white/15 hover:text-white"
          onClick={onOpenMobile}
        >
          <Menu />
        </Button>

        <Image
          src="/logo-camara.png"
          alt="Câmara Municipal de Alfenas"
          width={176}
          height={40}
          className="h-10 w-auto object-contain hidden sm:block"
          priority
        />

        <Separator orientation="vertical" className="h-6 hidden bg-white/40 sm:block" />

        <span className="hidden text-sm font-medium text-white/90 sm:block">
          Sistema de Ofícios
        </span>

        <span className="text-sm font-medium text-white sm:hidden">Sistema de Ofícios</span>
      </div>

      {/* Sino de notificações */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/15 hover:text-white">
            <Bell className="w-5 h-5" />
            {naoLidas > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                variant="destructive"
              >
                {naoLidas > 9 ? "9+" : naoLidas}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="end">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="font-semibold text-sm">Notificações</span>
              {naoLidas > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {naoLidas} nova(s)
                </Badge>
              )}
            </div>
            {naoLidas > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-muted-foreground"
                onClick={marcarTodasLidas}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>

          {/* Lista */}
          <ScrollArea className="h-80">
            {carregando ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y">
                {notificacoes.map((n) => (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3",
                      !n.lida && "bg-blue-50/50"
                    )}
                    onClick={() => handleAbrirNotificacao(n)}
                  >
                    <div className={cn("mt-0.5 p-1.5 rounded-md shrink-0", !n.lida ? "bg-blue-100" : "bg-muted")}>
                      <FileText className={cn("w-3.5 h-3.5", !n.lida ? "text-blue-600" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-tight", !n.lida ? "font-semibold" : "font-medium")}>
                          {n.titulo}
                        </p>
                        {!n.lida && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const data = new Date(n.createdAt)
                          if (Number.isNaN(data.getTime())) return ""
                          return formatDistanceToNow(data, { addSuffix: true, locale: ptBR })
                        })()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {notificacoes.length > 0 && (
            <>
              <Separator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground h-8"
                  onClick={() => { setOpen(false); router.push("/dashboard/secretaria") }}
                >
                  Ver todos os ofícios
                </Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </header>
  )
}