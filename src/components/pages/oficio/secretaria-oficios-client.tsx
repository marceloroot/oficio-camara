// src/app/(protected)/dashboard/secretaria/_components/secretaria-oficios-client.tsx
"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Search, FileText, Clock, CheckCircle2, AlertTriangle,
  Eye, EyeOff, Filter, X, ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

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
  criadoPor: { id: string; nome: string }
  respostas: { id: string }[]
  prorrogacoes: { id: string; diasSolicitados: number; aprovada: boolean | null }[]
  leituras: { id: string }[]
  assinatura: { id: string } | null
}

interface Props {
  oficios: Oficio[]
  userId: string
}

const statusConfig: Record<OficioStatus, { label: string; icon: React.ElementType; className: string }> = {
  PENDENTE:   { label: "Pendente",   icon: Clock,         className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  RESPONDIDO: { label: "Respondido", icon: CheckCircle2,  className: "bg-green-100 text-green-800 border-green-200" },
  VENCIDO:    { label: "Vencido",    icon: AlertTriangle, className: "bg-red-100 text-red-800 border-red-200" },
}

function StatusBadge({ status }: { status: OficioStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

function calcularVencimento(dataCriacao: Date, prazoDias: number, prorrogacoes: { diasSolicitados: number; aprovada: boolean | null }[]) {
  const diasExtras = prorrogacoes
    .filter((p) => p.aprovada === true)
    .reduce((acc, p) => acc + p.diasSolicitados, 0)

  const venc = new Date(dataCriacao)
  venc.setDate(venc.getDate() + prazoDias + diasExtras)
  return venc
}

export function SecretariaOficiosClient({ oficios, userId }: Props) {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("TODOS")
  const [filterLeitura, setFilterLeitura] = useState("TODOS")
  const [filterPrazo, setFilterPrazo] = useState("TODOS")
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return oficios.filter((o) => {
      const matchSearch =
        search === "" ||
        o.numero.toLowerCase().includes(search.toLowerCase()) ||
        o.assunto.toLowerCase().includes(search.toLowerCase()) ||
        o.criadoPor.nome.toLowerCase().includes(search.toLowerCase())

      const matchStatus = filterStatus === "TODOS" || o.status === filterStatus

      const lido = o.leituras.length > 0
      const matchLeitura =
        filterLeitura === "TODOS" ||
        (filterLeitura === "NAO_LIDO" && !lido) ||
        (filterLeitura === "LIDO" && lido)

      const venc = calcularVencimento(new Date(o.dataCriacao), o.prazoDias, o.prorrogacoes)
      const diffDias = Math.ceil((venc.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      const matchPrazo =
        filterPrazo === "TODOS" ||
        (filterPrazo === "VENCENDO_HOJE" && diffDias === 0) ||
        (filterPrazo === "PROXIMOS_7" && diffDias > 0 && diffDias <= 7) ||
        (filterPrazo === "VENCIDOS" && diffDias < 0)

      return matchSearch && matchStatus && matchLeitura && matchPrazo
    })
  }, [oficios, search, filterStatus, filterLeitura, filterPrazo])

  const totais = useMemo(() => ({
    total: oficios.length,
    pendente: oficios.filter((o) => o.status === "PENDENTE").length,
    respondido: oficios.filter((o) => o.status === "RESPONDIDO").length,
    naoLidos: oficios.filter((o) => o.leituras.length === 0).length,
  }), [oficios])

  const hasActiveFilters = search !== "" || filterStatus !== "TODOS" || filterLeitura !== "TODOS" || filterPrazo !== "TODOS"

  function clearFilters() {
    setSearch("")
    setFilterStatus("TODOS")
    setFilterLeitura("TODOS")
    setFilterPrazo("TODOS")
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Ofícios</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {oficios.length} ofícios
          </p>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",       value: totais.total,      className: "border-l-4 border-l-primary" },
          { label: "Pendentes",   value: totais.pendente,   className: "border-l-4 border-l-yellow-400" },
          { label: "Respondidos", value: totais.respondido, className: "border-l-4 border-l-green-500" },
          { label: "Não lidos",   value: totais.naoLidos,   className: "border-l-4 border-l-blue-500" },
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

      {/* Busca e filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, assunto..."
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
            <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", showFilters && "rotate-180")} />
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="RESPONDIDO">Respondido</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leitura</label>
              <Select value={filterLeitura} onValueChange={setFilterLeitura}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="NAO_LIDO">Não lidos</SelectItem>
                  <SelectItem value="LIDO">Lidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo</label>
              <Select value={filterPrazo} onValueChange={setFilterPrazo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-[120px]">Número</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="hidden md:table-cell">Criado por</TableHead>
                <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell text-center">Respostas</TableHead>
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
                  const lido = oficio.leituras.length > 0
                  const vencimento = calcularVencimento(new Date(oficio.dataCriacao), oficio.prazoDias, oficio.prorrogacoes)
                  const diffDias = Math.ceil((vencimento.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  const isUrgente = diffDias <= 3 && oficio.status === "PENDENTE"
                  const prorrogacaoPendente = oficio.prorrogacoes.some((p) => p.aprovada === null)

                  return (
                    <TableRow
                      key={oficio.id}
                      className={cn(
                        "hover:bg-muted/40 transition-colors",
                        !lido && "font-medium",
                        isUrgente && "bg-red-50/50"
                      )}
                    >
                      <TableCell>
                        {lido
                          ? <Eye className="w-4 h-4 text-muted-foreground" />
                          : <EyeOff className="w-4 h-4 text-blue-500" />
                        }
                      </TableCell>
                      <TableCell className="font-mono text-sm">{oficio.numero}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-sm truncate">{oficio.assunto}</p>
                          {prorrogacaoPendente && (
                            <span className="text-xs text-orange-600 font-normal">
                              Prorrogação aguardando aprovação
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {oficio.criadoPor.nome}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">
                          <p className={cn(isUrgente && "text-red-600 font-medium")}>
                            {format(vencimento, "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className={cn("text-xs",
                            diffDias < 0 ? "text-red-500" :
                            diffDias <= 3 ? "text-orange-500" :
                            "text-muted-foreground"
                          )}>
                            {diffDias < 0
                              ? `Venceu há ${Math.abs(diffDias)} dia(s)`
                              : diffDias === 0 ? "Vence hoje"
                              : `${diffDias} dia(s) restante(s)`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={oficio.status} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-center text-sm text-muted-foreground">
                        {oficio.respostas.length}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/secretaria/${oficio.id}`}>Ver</Link>
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