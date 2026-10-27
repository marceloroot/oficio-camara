// src/app/(protected)/dashboard/perfil/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AlterarSenhaClient } from "@/components/pages/perfil/alterar-senha-client"

export default async function PerfilPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any

  return (
    <AlterarSenhaClient
      nome={user?.name ?? "Usuário"}
      email={user?.email ?? ""}
      role={user?.role ?? ""}
    />
  )
}