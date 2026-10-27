"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("E-mail ou senha inválidos.")
      setLoading(false)
      return
    }

    // Recarrega o documento inteiro. No servidor, a navegação interna
    // chega no dashboard antes da sessão existir e a tela fica em branco.
    window.location.assign("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1c2b39] via-[#0262a2] to-[#1c2b39] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        <div className="flex flex-col items-center">
          <div className="rounded-xl bg-[#787878] px-5 py-3 shadow-lg">
            <Image
              src="/logo-camara.png"
              alt="Câmara Municipal de Alfenas"
              width={320}
              height={74}
              className="h-auto w-full object-contain"
              priority
            />
          </div>
        </div>

        {/* Card de login */}
        <Card className="shadow-lg border-0">
          <CardContent className="pt-6 pb-8 px-8 space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold text-[#1c2b39]">Sistema de Ofícios</h1>
              <p className="text-sm text-muted-foreground">Acesse com suas credenciais</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button className="w-full mt-2" disabled={loading} size="lg">
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</>
                  : "Entrar"
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#f0dfa0]">
          Câmara Municipal de Alfenas
        </p>
      </div>
    </div>
  )
}