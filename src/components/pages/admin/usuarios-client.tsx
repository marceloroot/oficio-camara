// src/app/(protected)/dashboard/usuarios/_components/usuarios-client.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Users, Plus, Pencil, Power, PowerOff, KeyRound,
  Loader2, Building2, ShieldCheck, Eye, EyeOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  criarUsuarioAction,
  editarUsuarioAction,
  toggleUsuarioAction,
  redefinirSenhaAction,
} from "@/lib/actions/master.actions"

type Role = "MPMG" | "SECRETARIA" | "MASTER"

type Usuario = {
  id: string
  nome: string
  email: string
  role: Role
  createdAt: Date
  secretaria: { id: string; nome: string } | null
}

type Secretaria = { id: string; nome: string }

const roleConfig: Record<Role, { label: string; className: string }> = {
  MPMG:      { label: "MPMG",      className: "bg-blue-100 text-blue-800 border-blue-200" },
  SECRETARIA:{ label: "Secretaria", className: "bg-purple-100 text-purple-800 border-purple-200" },
  MASTER:    { label: "Master",     className: "bg-orange-100 text-orange-800 border-orange-200" },
}

interface Props {
  usuarios: Usuario[]
  secretarias: Secretaria[]
}

export function UsuariosClient({ usuarios, secretarias }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [busca, setBusca] = useState("")
  const [filtroRole, setFiltroRole] = useState<string>("TODOS")

  // Modais
  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState<Usuario | null>(null)
  const [modalSenha, setModalSenha] = useState<Usuario | null>(null)

  // Formulário criar/editar
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<Role>("SECRETARIA")
  const [secretariaId, setSecretariaId] = useState("")

  // Formulário senha
  const [novaSenha, setNovaSenha] = useState("")
  const [showNovaSenha, setShowNovaSenha] = useState(false)

  const filtrados = usuarios.filter((u) => {
    const emailReal = u.email.replace("__disabled__", "")
    const matchBusca =
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      emailReal.toLowerCase().includes(busca.toLowerCase())
    const matchRole = filtroRole === "TODOS" || u.role === filtroRole
    return matchBusca && matchRole
  })

  function handleAction(fn: () => Promise<void>) {
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message)
      }
    })
  }

  function abrirCriar() {
    setNome(""); setEmail(""); setPassword("")
    setRole("SECRETARIA"); setSecretariaId(""); setError("")
    setModalCriar(true)
  }

  function abrirEditar(u: Usuario) {
    setNome(u.nome)
    setEmail(u.email.replace("__disabled__", ""))
    setRole(u.role)
    setSecretariaId(u.secretaria?.id ?? "")
    setError("")
    setModalEditar(u)
  }

  function submitCriar() {
    if (!nome.trim() || !email.trim() || !password.trim()) return setError("Preencha todos os campos.")
    if (password.length < 6) return setError("Senha deve ter ao menos 6 caracteres.")
    handleAction(async () => {
      const fd = new FormData()
      fd.append("nome", nome)
      fd.append("email", email)
      fd.append("password", password)
      fd.append("role", role)
      if (secretariaId) fd.append("secretariaId", secretariaId)
      await criarUsuarioAction(fd)
      setModalCriar(false)
      setSuccess("Usuário criado com sucesso!")
    })
  }

  function submitEditar() {
    if (!nome.trim() || !email.trim()) return setError("Preencha todos os campos.")
    handleAction(async () => {
      const fd = new FormData()
      fd.append("id", modalEditar!.id)
      fd.append("nome", nome)
      fd.append("email", email)
      fd.append("role", role)
      if (secretariaId) fd.append("secretariaId", secretariaId)
      await editarUsuarioAction(fd)
      setModalEditar(null)
      setSuccess("Usuário atualizado com sucesso!")
    })
  }

  function submitToggle(u: Usuario) {
    handleAction(async () => {
      const fd = new FormData()
      fd.append("id", u.id)
      await toggleUsuarioAction(fd)
      const isDesativado = u.email.startsWith("__disabled__")
      setSuccess(isDesativado ? "Usuário ativado!" : "Usuário desativado.")
    })
  }

  function submitSenha() {
    if (!novaSenha || novaSenha.length < 6) return setError("Senha deve ter ao menos 6 caracteres.")
    handleAction(async () => {
      const fd = new FormData()
      fd.append("id", modalSenha!.id)
      fd.append("novaSenha", novaSenha)
      await redefinirSenhaAction(fd)
      setModalSenha(null)
      setNovaSenha("")
      setSuccess("Senha redefinida com sucesso!")
    })
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-sm text-muted-foreground">{usuarios.length} usuário(s) cadastrado(s)</p>
          </div>
        </div>
        <Button onClick={abrirCriar}>
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-green-500 bg-green-50 text-green-800"><AlertDescription>{success}</AlertDescription></Alert>}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filtroRole} onValueChange={setFiltroRole}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os perfis</SelectItem>
            <SelectItem value="MPMG">MPMG</SelectItem>
            <SelectItem value="SECRETARIA">Secretaria</SelectItem>
            <SelectItem value="MASTER">Master</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtrados.map((u) => {
          const isDesativado = u.email.startsWith("__disabled__")
          const emailReal = u.email.replace("__disabled__", "")
          const cfg = roleConfig[u.role]

          return (
            <Card key={u.id} className={cn(isDesativado && "opacity-60 border-dashed")}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{u.nome}</p>
                      <p className="text-xs text-muted-foreground font-normal">{emailReal}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", cfg.className)}>
                      {cfg.label}
                    </span>
                    <Badge variant={isDesativado ? "secondary" : "default"}>
                      {isDesativado ? "Inativo" : "Ativo"}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                {u.secretaria && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                    <Building2 className="w-3 h-3" /> {u.secretaria.nome}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => abrirEditar(u)}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setModalSenha(u); setNovaSenha(""); setError("") }}>
                    <KeyRound className="w-3 h-3 mr-1" /> Redefinir Senha
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={isDesativado ? "text-green-600 hover:bg-green-50" : "text-red-600 hover:bg-red-50"}
                    onClick={() => submitToggle(u)}
                    disabled={isPending}
                  >
                    {isDesativado
                      ? <><Power className="w-3 h-3 mr-1" /> Ativar</>
                      : <><PowerOff className="w-3 h-3 mr-1" /> Desativar</>
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filtrados.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhum usuário encontrado.</p>
        )}
      </div>

      {/* Modal Criar */}
      <Dialog open={modalCriar} onOpenChange={setModalCriar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Usuário
            </DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome completo</label>
              <Input placeholder="Nome do usuário" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">E-mail</label>
              <Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Senha inicial</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Perfil</label>
              <Select value={role} onValueChange={(v) => { setRole(v as Role); setSecretariaId("") }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MPMG">MPMG</SelectItem>
                  <SelectItem value="SECRETARIA">Secretaria</SelectItem>
                  <SelectItem value="MASTER">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "SECRETARIA" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Secretaria</label>
                <Select value={secretariaId} onValueChange={setSecretariaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a secretaria" /></SelectTrigger>
                  <SelectContent>
                    {secretarias.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button onClick={submitCriar} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={!!modalEditar} onOpenChange={(o) => !o && setModalEditar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Editar Usuário
            </DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome completo</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">E-mail</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Perfil</label>
              <Select value={role} onValueChange={(v) => { setRole(v as Role); setSecretariaId("") }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MPMG">MPMG</SelectItem>
                  <SelectItem value="SECRETARIA">Secretaria</SelectItem>
                  <SelectItem value="MASTER">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "SECRETARIA" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Secretaria</label>
                <Select value={secretariaId} onValueChange={setSecretariaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a secretaria" /></SelectTrigger>
                  <SelectContent>
                    {secretarias.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditar(null)}>Cancelar</Button>
            <Button onClick={submitEditar} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Redefinir Senha */}
      <Dialog open={!!modalSenha} onOpenChange={(o) => !o && setModalSenha(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Redefinir Senha
            </DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <p className="text-sm text-muted-foreground">
            Redefinindo senha de <strong>{modalSenha?.nome}</strong>.
          </p>
          <Separator />
          <div className="space-y-1">
            <label className="text-sm font-medium">Nova senha</label>
            <div className="relative">
              <Input
                type={showNovaSenha ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNovaSenha(!showNovaSenha)}
              >
                {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalSenha(null)}>Cancelar</Button>
            <Button onClick={submitSenha} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}