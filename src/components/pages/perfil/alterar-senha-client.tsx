// src/app/(protected)/dashboard/perfil/_components/alterar-senha-client.tsx
"use client"

import { useState, useTransition } from "react"
import { KeyRound, Eye, EyeOff, User, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { alterarSenhaAction } from "@/lib/actions/alterar-senha.action"

const roleLabel: Record<string, string> = {
  MPMG:       "Promotoria de Justiça",
  SECRETARIA: "Secretaria Municipal",
  MASTER:     "Administrador",
}

interface Props {
  nome: string
  email: string
  role: string
}

export function AlterarSenhaClient({ nome, email, role }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")

  const [showAtual, setShowAtual] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)

  function handleSubmit() {
    setError("")
    setSuccess(false)

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append("senhaAtual", senhaAtual)
        fd.append("novaSenha", novaSenha)
        fd.append("confirmarSenha", confirmarSenha)
        await alterarSenhaAction(fd)
        setSuccess(true)
        setSenhaAtual("")
        setNovaSenha("")
        setConfirmarSenha("")
      } catch (err: unknown) {
        if (err instanceof Error) {
          const e = err as { digest?: string }
          if (e.digest?.startsWith("NEXT_REDIRECT")) throw err
          setError(err.message || "Erro inesperado.")
        }
      }
    })
  }

  // Indicador de força da senha
  function forca(senha: string): { nivel: number; label: string; color: string } {
    if (!senha) return { nivel: 0, label: "", color: "" }
    let pontos = 0
    if (senha.length >= 6) pontos++
    if (senha.length >= 10) pontos++
    if (/[A-Z]/.test(senha)) pontos++
    if (/[0-9]/.test(senha)) pontos++
    if (/[^A-Za-z0-9]/.test(senha)) pontos++

    if (pontos <= 1) return { nivel: 1, label: "Fraca", color: "bg-red-500" }
    if (pontos <= 3) return { nivel: 2, label: "Média", color: "bg-yellow-500" }
    return { nivel: 3, label: "Forte", color: "bg-green-500" }
  }

  const forcaSenha = forca(novaSenha)

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações e segurança</p>
        </div>
      </div>

      {/* Card de informações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
              {nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{nome}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
            <div className="ml-auto">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-medium">
                {roleLabel[role] ?? role}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de alteração de senha */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Alterar Senha
          </CardTitle>
          <CardDescription>
            Use uma senha forte com letras, números e símbolos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-800">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription>Senha alterada com sucesso!</AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Senha atual */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Senha atual</label>
            <div className="relative">
              <Input
                type={showAtual ? "text" : "password"}
                placeholder="Digite sua senha atual"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
                onClick={() => setShowAtual(!showAtual)}
              >
                {showAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Nova senha */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Nova senha</label>
            <div className="relative">
              <Input
                type={showNova ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
                onClick={() => setShowNova(!showNova)}
              >
                {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>

            {/* Indicador de força */}
            {novaSenha && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        i <= forcaSenha.nivel ? forcaSenha.color : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Força: <span className="font-medium">{forcaSenha.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirmar senha */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Confirmar nova senha</label>
            <div className="relative">
              <Input
                type={showConfirmar ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className={`pr-10 ${
                  confirmarSenha && confirmarSenha !== novaSenha
                    ? "border-red-400 focus-visible:ring-red-400"
                    : confirmarSenha && confirmarSenha === novaSenha
                    ? "border-green-400 focus-visible:ring-green-400"
                    : ""
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
                onClick={() => setShowConfirmar(!showConfirmar)}
              >
                {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {confirmarSenha && confirmarSenha !== novaSenha && (
              <p className="text-xs text-red-500">As senhas não coincidem.</p>
            )}
            {confirmarSenha && confirmarSenha === novaSenha && (
              <p className="text-xs text-green-600">Senhas coincidem!</p>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isPending || !senhaAtual || !novaSenha || !confirmarSenha}
          >
            {isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Alterando...</>
              : <><KeyRound className="w-4 h-4 mr-2" /> Alterar Senha</>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}