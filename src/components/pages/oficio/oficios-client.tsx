// src/app/(protected)/dashboard/oficios/_components/oficios-client.tsx
"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Search, Plus, Filter, X, FileText,
  Clock, CheckCircle2, AlertTriangle, ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ── Tipos ────────────────────────────────────────────────────────────────────
type OficioStatus = "PENDENTE" | "RESPONDIDO" | "VENCIDO"

type Oficio = {
  id: string
  numero: string
  assunto: string
  descricao: string
  status: OficioStatus
  prazoDias: number
  dataCriacao: Date
  createdAt: Date
  secretarias: { id: string; nome: string }[]
  criadoPor: { id: string; nome: string }
  respostas: { id: string }[]
}

type Secretaria = { id: string; nome: string }

interface OficiosClientProps {
  oficios: Oficio[]
  secretarias: Secretaria[]
  role: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig: Record<OficioStatus, { label: string; icon: React.ElementType; className: string }> = {
  PENDENTE: {
    label: "Pendente",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  RESPONDIDO: {
    label: "Respondido",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  VENCIDO: {
    label: "Vencido",
    icon: AlertTriangle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
}

function StatusBadge({ status }: { status: OficioStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

function calcularVencimento(dataCriacao: Date, prazoDias: number) {
  const vencimento = new Date(dataCriacao)
  vencimento.setDate(vencimento.getDate() + prazoDias)
  return vencimento
}

function SecretariasResumo({
  secretarias,
  limite = 2,
  className,
}: {
  secretarias: { id: string; nome: string }[]
  limite?: number
  className?: string
}) {
  if (secretarias.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const visiveis = secretarias.slice(0, limite)
  const extras = secretarias.length - visiveis.length

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-1", className)}>
      {visiveis.map((sec) => (
        <span
          key={sec.id}
          title={sec.nome}
          className="inline-block max-w-full truncate rounded-full border bg-muted px-2 py-0.5 text-xs"
        >
          {sec.nome}
        </span>
      ))}
      {extras > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/15"
              aria-label={`Ver mais ${extras} secretaria(s)`}
            >
              +{extras}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {secretarias.length} secretaria{secretarias.length === 1 ? "" : "s"}
            </p>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto">
              {secretarias.map((sec) => (
                <li key={sec.id} className="text-sm leading-snug break-words">
                  {sec.nome}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export function OficiosClient({ oficios, secretarias, role }: OficiosClientProps) {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("TODOS")
  const [filterSecretaria, setFilterSecretaria] = useState<string>("TODAS")
  const [filterPrazo, setFilterPrazo] = useState<string>("TODOS")
  const [showFilters, setShowFilters] = useState(false)

  // ── Filtros ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return oficios.filter((o) => {
      const matchSearch =
        search === "" ||
        o.numero.toLowerCase().includes(search.toLowerCase()) ||
        o.assunto.toLowerCase().includes(search.toLowerCase()) ||
        o.secretarias.some((sec) =>
          sec.nome.toLowerCase().includes(search.toLowerCase())
        ) ||
        o.criadoPor.nome.toLowerCase().includes(search.toLowerCase())

      const matchStatus = filterStatus === "TODOS" || o.status === filterStatus

      const matchSecretaria =
        filterSecretaria === "TODAS" ||
        o.secretarias.some((sec) => sec.id === filterSecretaria)

      const matchPrazo = (() => {
        if (filterPrazo === "TODOS") return true
        const venc = calcularVencimento(new Date(o.dataCriacao), o.prazoDias)
        const hoje = new Date()
        const diffDias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        if (filterPrazo === "VENCENDO_HOJE") return diffDias === 0
        if (filterPrazo === "PROXIMOS_7") return diffDias > 0 && diffDias <= 7
        if (filterPrazo === "VENCIDOS") return diffDias < 0
        return true
      })()

      return matchSearch && matchStatus && matchSecretaria && matchPrazo
    })
  }, [oficios, search, filterStatus, filterSecretaria, filterPrazo])

  // ── Contadores para os cards de resumo ──────────────────────────────────
  const totais = useMemo(() => ({
    total: oficios.length,
    pendente: oficios.filter((o) => o.status === "PENDENTE").length,
    respondido: oficios.filter((o) => o.status === "RESPONDIDO").length,
    vencido: oficios.filter((o) => o.status === "VENCIDO").length,
  }), [oficios])

  function clearFilters() {
    setSearch("")
    setFilterStatus("TODOS")
    setFilterSecretaria("TODAS")
    setFilterPrazo("TODOS")
  }

  const hasActiveFilters =
    search !== "" ||
    filterStatus !== "TODOS" ||
    filterSecretaria !== "TODAS" ||
    filterPrazo !== "TODOS"

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ofícios</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} de {oficios.length} ofícios
            </p>
          </div>
        </div>

        {role === "MPMG" && (
          <Button asChild>
            <Link href="/officio/novo-oficio">
              <Plus className="w-4 h-4 mr-2" />
              Novo Ofício
            </Link>
          </Button>
        )}
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: totais.total, className: "border-l-4 border-l-primary" },
          { label: "Pendentes", value: totais.pendente, className: "border-l-4 border-l-yellow-400" },
          { label: "Respondidos", value: totais.respondido, className: "border-l-4 border-l-green-500" },
          { label: "Vencidos", value: totais.vencido, className: "border-l-4 border-l-red-500" },
        ].map((card) => (
          <Card key={card.label} className={card.className}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="text-2xl font-bold">{card.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barra de busca e filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, assunto, secretaria..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasActiveFilters && "border-primary text-primary")}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                !
              </Badge>
            )}
            <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", showFilters && "rotate-180")} />
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="RESPONDIDO">Respondido</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Secretaria */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Secretaria</label>
              <Select value={filterSecretaria} onValueChange={setFilterSecretaria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {secretarias.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prazo */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo</label>
              <Select value={filterPrazo} onValueChange={setFilterPrazo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="VENCENDO_HOJE">Vence hoje</SelectItem>
                  <SelectItem value="PROXIMOS_7">Próximos 7 dias</SelectItem>
                  <SelectItem value="VENCIDOS">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[120px]">Número</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="hidden w-[14rem] md:table-cell">Secretaria</TableHead>
                <TableHead className="hidden xl:table-cell">Criado por</TableHead>
                <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell text-center">Respostas</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhum ofício encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((oficio) => {
                  const vencimento = calcularVencimento(new Date(oficio.dataCriacao), oficio.prazoDias)
                  const hoje = new Date()
                  const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
                  const isUrgente = diffDias <= 3 && oficio.status === "PENDENTE"

                  return (
                    <TableRow
                      key={oficio.id}
                      className={cn("hover:bg-muted/40 transition-colors", isUrgente && "bg-red-50/50")}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        <span className="block max-w-[8.5rem] truncate" title={oficio.numero}>
                          {oficio.numero}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="max-w-[12rem] 2xl:max-w-[18rem]">
                          <p className="truncate text-sm font-medium">{oficio.assunto}</p>
                          <p className="truncate text-xs text-muted-foreground">{oficio.descricao}</p>
                          <div className="mt-1 max-w-[14rem] md:hidden">
                            <SecretariasResumo secretarias={oficio.secretarias} limite={1} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden whitespace-normal md:table-cell">
                        <div className="w-[14rem] max-w-[14rem]">
                          <SecretariasResumo secretarias={oficio.secretarias} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-[9rem] truncate text-sm text-muted-foreground xl:table-cell">
                        <span className="block max-w-[9rem] truncate" title={oficio.criadoPor.nome}>
                          {oficio.criadoPor.nome}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">
                          <p className={cn(isUrgente && "text-red-600 font-medium")}>
                            {format(vencimento, "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className={cn("text-xs", diffDias < 0 ? "text-red-500" : diffDias <= 3 ? "text-orange-500" : "text-muted-foreground")}>
                            {diffDias < 0
                              ? `Venceu há ${Math.abs(diffDias)} dia(s)`
                              : diffDias === 0
                              ? "Vence hoje"
                              : `${diffDias} dia(s) restante(s)`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={oficio.status} />
                      </TableCell>
                      <TableCell className="hidden text-center text-sm text-muted-foreground xl:table-cell">
                        {oficio.respostas.length}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/officio/${oficio.id}`}>
                            Ver
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}