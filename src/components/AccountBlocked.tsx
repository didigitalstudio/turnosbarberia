'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Variant = 'pending' | 'paused'

const CONFIG = {
  pending: {
    icon: '⏳',
    title: 'Tu barbería está pendiente de aprobación',
    description: 'Te avisaremos por email cuando tu cuenta sea aprobada. Mientras tanto, podés terminar de configurarla en Ajustes.',
  },
  paused: {
    icon: '⏸',
    title: 'Cuenta suspendida',
    description: 'Tu acceso fue suspendido temporalmente. Contactate con nosotros en info@didigitalstudio.com.',
  },
}

export function AccountBlocked({ variant }: { variant: Variant }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const { icon, title, description } = CONFIG[variant]

  return (
    <div className="min-h-screen bg-dark text-bg flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="text-6xl">{icon}</div>
        <div>
          <h1 className="text-2xl font-semibold mb-2">{title}</h1>
          <p className="text-sm text-bg/70 leading-relaxed">{description}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-bg/50 hover:text-bg/80 underline"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
