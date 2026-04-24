'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, LayoutDashboard, Settings } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="border-b border-zinc-800 bg-background px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-xl text-primary">LottoCharity</span>
        <div className="hidden md:flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm">
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link href="/admin" className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm">
            <Settings size={16} /> Admin
          </Link>
        </div>
      </div>
      <button onClick={handleLogout} className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm">
        <LogOut size={16} /> Logout
      </button>
    </nav>
  )
}
