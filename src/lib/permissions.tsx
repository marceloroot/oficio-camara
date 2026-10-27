import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  ClipboardList,
  KeyRound
} from "lucide-react"

export const menuByRole = {
  MPMG: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Novo Ofício", href: "/officio/novo-oficio", icon: FileText },
    { label: "Ofícios", href: "/officio", icon: ClipboardList },
    { label: "Meu Perfil", href: "/perfil", icon: KeyRound },
  ],
  SECRETARIA: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Ofícios Recebidos", href: "/dashboard/secretaria", icon: FileText },
    { label: "Meu Perfil", href: "/perfil", icon: KeyRound },
  ],
  MASTER: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Ofícios", href: "/officio", icon: ClipboardList },
    { label: "Secretarias", href: "/admin/secretarias", icon: Building2 },
    { label: "Usuários", href: "/admin/usuarios", icon: Users },
    { label: "Meu Perfil", href: "/perfil", icon: KeyRound },
  ],
}