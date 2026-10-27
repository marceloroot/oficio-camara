// src/app/(protected)/dashboard/oficios/[id]/_components/oficio-detalhe-client.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, FileText, Clock, CheckCircle2, AlertTriangle,
  MessageSquare, History, Paperclip, PenLine, CalendarClock,
  User, Building2, Hash, Calendar, ChevronDown, ChevronUp, Loader2,
  X,
  XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { responderOficioAction, prorrogarOficioAction, assinarOficioAction, avaliarProrrogacaoAction } from "@/lib/actions/officio.actions"
import { removerProrrogacaoAction } from "@/lib/actions/officio.actions"

import { Pencil } from "lucide-react"
import { atualizarSecretariasOficioAction, editarOficioAction } from "@/lib/actions/officio.actions"
import { AnexoList } from "@/components/upload/anexo-list"
import { AnexoUploader } from "@/components/upload/anexo-uploader"
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
  secretarias: { id: string; nome: string; slaDias: number }[]
  criadoPor: { id: string; nome: string; email: string }
respostas: {
  id: string
  texto: string
  createdAt: Date
  respondidoPor: { id: string; nome: string }
  anexos: { id: string; nome: string; url: string; versao: number; createdAt: Date; enviadoPorId?: string | null }[]
  assinatura: {
    id: string
    hash: string
    signedAt: Date
    signedBy: { id: string; nome: string }
  } | null
}[]
prorrogacoes: {
  id: string
  diasSolicitados: number
  motivo: string
  aprovada: boolean | null
  createdAt: Date
  solicitadaPor: { id: string; nome: string }
  aprovadaPor: { id: string; nome: string } | null
}[]
  anexos: { id: string; nome: string; url: string; versao: number; createdAt: Date; enviadoPorId?: string | null }[]
  historico: {
    id: string
    evento: string
    userId: string
    createdAt: Date
  }[]
  assinatura: { id: string; hash: string; signedAt: Date } | null
}

type SecretariaDisponivel = {
  id: string
  nome: string
  slaDias: number
}

interface Props {
  oficio: Oficio
  role: string
  userId: string
  secretariasDisponiveis: SecretariaDisponivel[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig: Record<OficioStatus, { label: string; icon: React.ElementType; className: string }> = {
  PENDENTE:   { label: "Pendente",   icon: Clock,         className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  RESPONDIDO: { label: "Respondido", icon: CheckCircle2,  className: "bg-green-100 text-green-800 border-green-200" },
  VENCIDO:    { label: "Vencido",    icon: AlertTriangle, className: "bg-red-100 text-red-800 border-red-200" },
}

const eventoLabel: Record<string, string> = {
  OFICIO_CRIADO:     "Ofício criado",
  OFICIO_RESPONDIDO: "Ofício respondido",
  OFICIO_PRORROGADO: "Prazo prorrogado",
  OFICIO_ASSINADO:   "Ofício assinado",
  OFICIO_VENCIDO:    "Ofício vencido",
  OFICIO_REDIRECIONADO: "Ofício redirecionado para secretaria",
  PRORROGACAO_APROVADA: "Prorrogação aprovada",
  PRORROGACAO_REJEITADA: "Prorrogação rejeitada",
  PRORROGACAO_SOLICITADA: "Prorrogação solicitada",
}

function parseEventoHistorico(evento: string) {
  const prefixo = "OFICIO_REDIRECIONADO_OBS|"
  if (evento.startsWith(prefixo)) {
    return {
      titulo: "Ofício redirecionado para secretaria",
      observacao: evento.slice(prefixo.length),
    }
  }

  return { titulo: eventoLabel[evento] ?? evento, observacao: null as string | null }
}

function StatusBadge({ status }: { status: OficioStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border", config.className)}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 rounded-md bg-muted p-1.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {typeof value === "string" ? (
          <p className="break-words text-sm font-medium">{value}</p>
        ) : (
          value
        )}
      </div>
    </div>
  )
}

function SecretariasLista({ secretarias }: { secretarias: { id: string; nome: string }[] }) {
  if (secretarias.length === 0) {
    return <p className="text-sm font-medium text-muted-foreground">Nenhuma secretaria</p>
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {secretarias.map((sec) => (
        <span
          key={sec.id}
          className="inline-flex max-w-full rounded-full border bg-muted px-2.5 py-1 text-xs font-medium leading-snug break-words"
        >
          {sec.nome}
        </span>
      ))}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export function OficioDetalheClient({ oficio, role, userId, secretariasDisponiveis }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Modais
  const [modalResponder, setModalResponder] = useState(false)
  const [modalProrrogar, setModalProrrogar] = useState(false)
  const [modalAssinar, setModalAssinar] = useState(false)

  // Formulários
  const [textoResposta, setTextoResposta] = useState("")
  const [diasProrrogacao, setDiasProrrogacao] = useState("15")
  const [motivoProrrogacao, setMotivoProrrogacao] = useState("")

  // Seções colapsáveis
  const [showHistorico, setShowHistorico] = useState(true)
  const [showProrrogacoes, setShowProrrogacoes] = useState(true)


  const [modalEditar, setModalEditar] = useState(false)
  const [editAssunto, setEditAssunto] = useState(oficio.assunto)
  const [editDescricao, setEditDescricao] = useState(oficio.descricao)
  const [editPrazoDias, setEditPrazoDias] = useState(String(oficio.prazoDias))
  const [editSecretariaIds, setEditSecretariaIds] = useState<string[]>(
    oficio.secretarias.map((sec) => sec.id)
  )
  const [editObservacaoRedirecionamento, setEditObservacaoRedirecionamento] = useState("")
  const [modalAnexar, setModalAnexar] = useState(false)
  const [modalEncaminhar, setModalEncaminhar] = useState(false)
  const [secretariasSelecionadas, setSecretariasSelecionadas] = useState<string[]>(
    oficio.secretarias.map((sec) => sec.id)
  )
  const [observacaoMasterRedirecionamento, setObservacaoMasterRedirecionamento] = useState("")
 const prazoTotal = oficio.prorrogacoes
  .filter((p) => p.aprovada === true)
  .reduce((acc, p) => acc + p.diasSolicitados, oficio.prazoDias)
  const vencimento = new Date(oficio.dataCriacao)
  vencimento.setDate(vencimento.getDate() + prazoTotal)
  const hoje = new Date()
  const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  
  function handleAction(fn: () => Promise<void>) {
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          const e = err as { digest?: string }
          if (e.digest?.startsWith("NEXT_REDIRECT")) throw err
          setError(err.message || "Erro inesperado.")
        }
      }
    })
  }
  function submitRemoverProrrogacao(prorrogacaoId: string) {
  handleAction(async () => {
    const fd = new FormData()
    fd.append("prorrogacaoId", prorrogacaoId)
    fd.append("oficioId", oficio.id)
    await removerProrrogacaoAction(fd)
    setSuccess("Prorrogação removida com sucesso!")
  })
  }
  function submitEditar() {
  if (!editAssunto.trim()) return setError("Assunto é obrigatório.")
  if (!editDescricao.trim()) return setError("Descrição é obrigatória.")
  if (role === "MPMG" && editSecretariaIds.length === 0) {
    return setError("Selecione ao menos uma secretaria.")
  }

  handleAction(async () => {
    const secretariasOriginais = [...oficio.secretarias.map((sec) => sec.id)].sort()
    const secretariasEditadas = [...editSecretariaIds].sort()
    const secretariasForamAlteradas =
      role === "MPMG" &&
      (secretariasOriginais.length !== secretariasEditadas.length ||
        secretariasOriginais.some((id, idx) => id !== secretariasEditadas[idx]))

    const fd = new FormData()
    fd.append("oficioId", oficio.id)
    fd.append("assunto", editAssunto)
    fd.append("descricao", editDescricao)
    fd.append("prazoDias", editPrazoDias)
    if (role === "MPMG") {
      editSecretariaIds.forEach((id) => fd.append("secretariaIds", id))
      if (secretariasForamAlteradas && editObservacaoRedirecionamento.trim()) {
        fd.append("observacaoRedirecionamento", editObservacaoRedirecionamento.trim())
      }
    }
    await editarOficioAction(fd)
    setModalEditar(false)
    setEditObservacaoRedirecionamento("")
    setSuccess("Ofício atualizado com sucesso!")
  })
  }

  function submitResponder() {
    if (!textoResposta.trim()) return setError("Digite o texto da resposta.")
    handleAction(async () => {
      const fd = new FormData()
      fd.append("oficioId", oficio.id)
      fd.append("texto", textoResposta)
      await responderOficioAction(fd)
      setModalResponder(false)
      setTextoResposta("")
      setSuccess("Resposta enviada com sucesso!")
    })
  }

  function submitProrrogar() {
    if (!motivoProrrogacao.trim()) return setError("Digite o motivo.")
    if (!diasProrrogacao || Number(diasProrrogacao) < 1) return setError("Informe um prazo válido.")
    handleAction(async () => {
      const fd = new FormData()
      fd.append("oficioId", oficio.id)
      fd.append("dias", diasProrrogacao)
      fd.append("motivo", motivoProrrogacao)
      await prorrogarOficioAction(fd)
      setModalProrrogar(false)
      setMotivoProrrogacao("")
      setDiasProrrogacao("15")
      setSuccess("Prazo prorrogado com sucesso!")
    })
  }

  function submitAssinar() {
    handleAction(async () => {
      const fd = new FormData()
      fd.append("oficioId", oficio.id)
      await assinarOficioAction(fd)
      setModalAssinar(false)
      setSuccess("Ofício assinado com sucesso!")
    })
  }

  function submitAtualizarSecretarias() {
    if (secretariasSelecionadas.length === 0) {
      return setError("Selecione ao menos uma secretaria para o ofício.")
    }

    handleAction(async () => {
      const secretariasOriginais = [...oficio.secretarias.map((sec) => sec.id)].sort()
      const secretariasEditadas = [...secretariasSelecionadas].sort()
      const secretariasForamAlteradas =
        secretariasOriginais.length !== secretariasEditadas.length ||
        secretariasOriginais.some((id, idx) => id !== secretariasEditadas[idx])

      const fd = new FormData()
      fd.append("oficioId", oficio.id)
      secretariasSelecionadas.forEach((id) => fd.append("secretariaIds", id))
      if (secretariasForamAlteradas && observacaoMasterRedirecionamento.trim()) {
        fd.append("observacaoRedirecionamento", observacaoMasterRedirecionamento.trim())
      }
      await atualizarSecretariasOficioAction(fd)
      setObservacaoMasterRedirecionamento("")
      setModalEncaminhar(false)
      setSuccess("Encaminhamento atualizado com sucesso!")
    })
  }

  function abrirModalEncaminhar() {
    setSecretariasSelecionadas(oficio.secretarias.map((sec) => sec.id))
    setObservacaoMasterRedirecionamento("")
    setError("")
    setModalEncaminhar(true)
  }

  // Pode haver mais de uma resposta no mesmo ofício, independente do status
  const canResponder = role === "SECRETARIA"
  const canProrrogar = oficio.status === "PENDENTE"
  const canAssinar   = !oficio.assinatura
  const canEditar = !oficio.assinatura
  // Encaminhar secretarias permanece liberado mesmo após assinatura/resposta
  const canEditarSecretarias = role === "MASTER" || role === "MPMG"
  const canAvaliarProrrogacao = role === "MASTER" || role === "MPMG"

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{oficio.numero}</h1>
            <StatusBadge status={oficio.status} />
            {oficio.assinatura && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                <PenLine className="w-3 h-3" /> Assinado
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{oficio.assunto}</p>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        {canResponder && (
          <Button onClick={() => setModalResponder(true)}>
            <MessageSquare className="w-4 h-4 mr-2" /> Responder
          </Button>
        )}
        {canProrrogar && (
          <Button variant="outline" onClick={() => setModalProrrogar(true)}>
            <CalendarClock className="w-4 h-4 mr-2" /> Prorrogar Prazo
          </Button>
        )}
        {canAssinar && (
          <Button variant="outline" onClick={() => setModalAssinar(true)}>
            <PenLine className="w-4 h-4 mr-2" /> Assinar Ofício
          </Button>
        )}
        {canEditar && (
          <Button variant="outline" onClick={() => setModalEditar(true)}>
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </Button>
        )}
        <Button variant="outline" onClick={() => setModalAnexar(true)}>
          <Paperclip className="w-4 h-4 mr-2" /> Anexar Arquivo
        </Button>
        {canEditarSecretarias && (
          <Button variant="outline" onClick={abrirModalEncaminhar}>
            <Building2 className="w-4 h-4 mr-2" /> Encaminhar Secretarias
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do ofício */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Dados do Ofício
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoItem icon={Hash} label="Número" value={oficio.numero} />
                <InfoItem icon={User} label="Criado por" value={oficio.criadoPor.nome} />
                <InfoItem icon={Calendar} label="Data" value={format(new Date(oficio.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
                <div className="sm:col-span-2">
                  <InfoItem
                    icon={Building2}
                    label={`Secretarias (${oficio.secretarias.length})`}
                    value={<SecretariasLista secretarias={oficio.secretarias} />}
                  />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{oficio.descricao}</p>
              </div>
            </CardContent>
          </Card>

          {/* Respostas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Respostas
                <Badge variant="secondary" className="ml-auto">{oficio.respostas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {oficio.respostas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma resposta ainda.</p>
              ) : (
                <div className="space-y-4">
                {oficio.respostas.map((r) => (
                  <div key={r.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r.respondidoPor.nome}</span>
                      <div className="flex items-center gap-2">
                        {/* Badge de assinatura */}
                        {r.assinatura ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                            <PenLine className="w-3 h-3" /> Assinada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
                            Não assinada
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(r.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.texto}</p>

                    {/* Detalhes da assinatura */}
                    {r.assinatura && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200">
                        <PenLine className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="text-xs text-blue-700">
                          Assinada por <strong>{r.assinatura.signedBy.nome}</strong> em{" "}
                          {format(new Date(r.assinatura.signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}

                    {/* Anexos */}
                  <AnexoList
                    anexos={r.anexos}
                    canDelete
                    currentUserId={userId}
                    onDeleted={() => router.refresh()}
                  />
                  </div>
                ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Anexos do ofício */}
          {oficio.anexos.length > 0 && (
           <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="w-4 h-4" /> Anexos
                <Badge variant="secondary" className="ml-auto">{oficio.anexos.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnexoList
                anexos={oficio.anexos}
                canDelete
                currentUserId={userId}
                onDeleted={() => router.refresh()}
              />
            </CardContent>
          </Card>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Prazo */}
          <Card className={cn(diffDias < 0 ? "border-red-300" : diffDias <= 3 ? "border-orange-300" : "")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Prazo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className="text-sm font-medium">{format(vencimento, "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Situação</p>
                <p className={cn("text-sm font-medium",
                  diffDias < 0 ? "text-red-600" : diffDias <= 3 ? "text-orange-600" : "text-green-600"
                )}>
                  {diffDias < 0
                    ? `Venceu há ${Math.abs(diffDias)} dia(s)`
                    : diffDias === 0
                    ? "Vence hoje"
                    : `${diffDias} dia(s) restante(s)`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prazo original</p>
                <p className="text-sm">{oficio.prazoDias} dias</p>
              </div>
              {oficio.prorrogacoes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Prorrogações</p>
                  <p className="text-sm">+{oficio.prorrogacoes.filter((p) => p.aprovada === true).reduce((a, p) => a + p.diasSolicitados, 0)} dias</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prorrogações */}
             {oficio.prorrogacoes
                .filter((p) => p.aprovada === null)
                .map((p) => (
                  <div key={p.id} className="border border-orange-200 rounded-md p-3 bg-orange-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-600">+{p.diasSolicitados} dias</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                        Aguardando aprovação
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.motivo}</p>
                    {canAvaliarProrrogacao && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const fd = new FormData()
                            fd.append("prorrogacaoId", p.id)
                            fd.append("oficioId", oficio.id)
                            fd.append("aprovada", "true")
                            handleAction(async () => {
                              await avaliarProrrogacaoAction(fd)
                              setSuccess("Prorrogação aprovada!")
                            })
                          }}
                          disabled={isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            const fd = new FormData()
                            fd.append("prorrogacaoId", p.id)
                            fd.append("oficioId", oficio.id)
                            fd.append("aprovada", "false")
                            handleAction(async () => {
                              await avaliarProrrogacaoAction(fd)
                              setSuccess("Prorrogação rejeitada.")
                            })
                          }}
                          disabled={isPending}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

          {/* Histórico */}
          <Card>
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowHistorico(!showHistorico)}>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico
                <Badge variant="secondary" className="ml-auto">{oficio.historico.length}</Badge>
                {showHistorico ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {showHistorico && (
              <CardContent>
                <div className="relative space-y-0">
                  {oficio.historico.map((h, i) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        {i < oficio.historico.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">
                          {parseEventoHistorico(h.evento).titulo}
                        </p>
                        {parseEventoHistorico(h.evento).observacao && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Observação: {parseEventoHistorico(h.evento).observacao}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(h.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Assinatura */}
          {oficio.assinatura && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <PenLine className="w-4 h-4" /> Assinatura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xs text-muted-foreground">Assinado em</p>
                <p className="text-sm font-medium">
                  {format(new Date(oficio.assinatura.signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Hash</p>
                <p className="text-xs font-mono break-all text-blue-700">{oficio.assinatura.hash}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    
      {/* Modal Responder */}
      <Dialog open={modalResponder} onOpenChange={setModalResponder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Ofício</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Digite a resposta..."
            className="min-h-[150px]"
            value={textoResposta}
            onChange={(e) => setTextoResposta(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalResponder(false)}>Cancelar</Button>
            <Button onClick={submitResponder} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Enviar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Prorrogar */}
      <Dialog open={modalProrrogar} onOpenChange={setModalProrrogar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prorrogar Prazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Dias adicionais</label>
              <Input
                type="number"
                min={1}
                max={365}
                value={diasProrrogacao}
                onChange={(e) => setDiasProrrogacao(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Motivo</label>
              <Textarea
                placeholder="Justifique a prorrogação..."
                value={motivoProrrogacao}
                onChange={(e) => setMotivoProrrogacao(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalProrrogar(false)}>Cancelar</Button>
            <Button onClick={submitProrrogar} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirmar Prorrogação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Assinar */}
     <Dialog open={modalAssinar} onOpenChange={setModalAssinar}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <PenLine className="w-4 h-4" /> Assinar Ofício
      </DialogTitle>
    </DialogHeader>

    {/* Aviso em destaque */}
    <Alert className="border-orange-300 bg-orange-50 text-orange-800">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription>
        <p className="font-semibold">Atenção! Esta ação é irreversível.</p>
        <p className="text-sm mt-1">
          Após assinar, o ofício <strong>não poderá mais ser alterado</strong>, 
          respondido ou ter seu prazo prorrogado. Um hash criptográfico será 
          gerado como garantia de integridade do documento.
        </p>
      </AlertDescription>
    </Alert>

    <p className="text-sm text-muted-foreground">
      Tem certeza que deseja assinar o ofício <strong>{oficio.numero}</strong>?
    </p>

    <DialogFooter>
      <Button variant="outline" onClick={() => setModalAssinar(false)}>
        Cancelar
      </Button>
      <Button
        variant="destructive"
        onClick={submitAssinar}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <PenLine className="w-4 h-4 mr-2" />
        )}
        Sim, assinar ofício
      </Button>
    </DialogFooter>
  </DialogContent>
     </Dialog>

     {/*modal editar*/}
     <Dialog open={modalEditar} onOpenChange={setModalEditar}>
      <DialogContent
        className={cn(
          "flex w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          // Evita o corte do centro da tela: ancora no topo e limita a altura
          "top-4 bottom-4 translate-y-0 max-h-[calc(100dvh-2rem)]",
          "data-[state=open]:zoom-in-95"
        )}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Editar Ofício
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Assunto</label>
              <Input
                value={editAssunto}
                onChange={(e) => setEditAssunto(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                className="min-h-[90px] resize-y"
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Prazo (dias)</label>
              <Input
                type="number"
                min={1}
                max={365}
                value={editPrazoDias}
                onChange={(e) => setEditPrazoDias(e.target.value)}
              />
            </div>
            {role === "MPMG" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Secretarias</label>
                <div className="grid max-h-36 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                  {secretariasDisponiveis.map((sec) => {
                    const checked = editSecretariaIds.includes(sec.id)
                    return (
                      <label key={sec.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 break-words">{sec.nome}</span>
                        <input
                          type="checkbox"
                          className="shrink-0"
                          checked={checked}
                          onChange={(e) => {
                            setEditSecretariaIds((prev) =>
                              e.target.checked
                                ? [...new Set([...prev, sec.id])]
                                : prev.filter((id) => id !== sec.id)
                            )
                          }}
                        />
                      </label>
                    )
                  })}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Observação do redirecionamento (opcional)</label>
                  <Textarea
                    placeholder="Ex.: Redirecionado para complementar análise técnica."
                    className="min-h-[70px] resize-y"
                    value={editObservacaoRedirecionamento}
                    onChange={(e) => setEditObservacaoRedirecionamento(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => setModalEditar(false)}>
            Cancelar
          </Button>
          <Button onClick={submitEditar} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
     </Dialog>


     {/* Modal Encaminhar Secretarias */}
     <Dialog open={modalEncaminhar} onOpenChange={setModalEncaminhar}>
      <DialogContent
        className={cn(
          "flex w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          "top-4 bottom-4 translate-y-0 max-h-[calc(100dvh-2rem)]",
          "data-[state=open]:zoom-in-95"
        )}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Encaminhar Secretarias
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adicione ou remova secretarias mesmo após a assinatura ou resposta.
              Ao incluir novas secretarias, o status volta para pendente.
            </p>
            <div className="grid max-h-64 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
              {secretariasDisponiveis.map((sec) => {
                const checked = secretariasSelecionadas.includes(sec.id)
                return (
                  <label key={sec.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 break-words">{sec.nome}</span>
                    <input
                      type="checkbox"
                      className="shrink-0"
                      checked={checked}
                      onChange={(e) => {
                        setSecretariasSelecionadas((prev) =>
                          e.target.checked
                            ? [...new Set([...prev, sec.id])]
                            : prev.filter((id) => id !== sec.id)
                        )
                      }}
                    />
                  </label>
                )
              })}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Observação do redirecionamento (opcional)</label>
              <Textarea
                placeholder="Ex.: Secretaria incluída para suporte técnico."
                className="min-h-[80px] resize-y"
                value={observacaoMasterRedirecionamento}
                onChange={(e) => setObservacaoMasterRedirecionamento(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => setModalEncaminhar(false)}>
            Cancelar
          </Button>
          <Button onClick={submitAtualizarSecretarias} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar Encaminhamento
          </Button>
        </DialogFooter>
      </DialogContent>
     </Dialog>

     {/* Modal Anexar */}
     <Dialog open={modalAnexar} onOpenChange={setModalAnexar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" /> Anexar Arquivo
          </DialogTitle>
        </DialogHeader>
        <AnexoUploader
          oficioId={oficio.id}
          onSuccess={() => {
            setModalAnexar(false)
            router.refresh()
          }}
        />
      </DialogContent>
     </Dialog>
    </div>
  )
}