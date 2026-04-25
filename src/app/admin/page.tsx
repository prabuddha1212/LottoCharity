'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Play, Users, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
   
  const [profiles, setProfiles] = useState<any[]>([])
  const [winners, setWinners] = useState<any[]>([])
  const [runningDraw, setRunningDraw] = useState(false)

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  const checkAdminAndLoad = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    // PRD rule: hardcoded admin check
    if (!user || user.email !== "admin@test.com") {
      alert("Unauthorized. Only admin@test.com can access this page.")
      router.push('/dashboard')
      return
    }
    
    setIsAdmin(true)
    
    // Load profiles (assuming RLS is disabled or admin has rights)
    const { data: profs } = await supabase.from('profiles').select('*')
    if (profs) setProfiles(profs)

    // Load winners
    const { data: wins } = await supabase
      .from('winners')
      .select('*, profiles(email), draws(month)')
      .order('created_at', { ascending: false })
    if (wins) setWinners(wins)

    setLoading(false)
  }

  const handleRunDraw = async () => {
    if (!confirm('Are you sure you want to run a new draw?')) return
    setRunningDraw(true)

    // 1. Generate Numbers
    const drawNumbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 45) + 1)
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

    // 2. Insert Draw
    const { data: draw, error: drawError } = await supabase
      .from('draws')
      .insert({ month: currentMonth, numbers: drawNumbers, status: 'published' })
      .select()
      .single()

    if (drawError || !draw) {
      alert('Error creating draw')
      setRunningDraw(false)
      return
    }

    // 3. Match Logic
    // Fetch all scores
    const { data: allScores } = await supabase.from('scores').select('user_id, score')
    if (allScores) {
      // Group by user
      const userScores: Record<string, number[]> = {}
      allScores.forEach(s => {
        if (!userScores[s.user_id]) userScores[s.user_id] = []
        userScores[s.user_id].push(s.score)
      })

      // Compare
      const newWinners = []
      for (const [userId, scores] of Object.entries(userScores)) {
        let matchCount = 0
        scores.forEach(s => {
          if (drawNumbers.includes(s)) matchCount++
        })

        if (matchCount >= 3) {
          newWinners.push({
            user_id: userId,
            draw_id: draw.id,
            match_count: matchCount,
            status: 'pending'
          })
        }
      }

      // Insert Winners
      if (newWinners.length > 0) {
        await supabase.from('winners').insert(newWinners)
      }
    }

    alert(`Draw completed! Numbers: ${drawNumbers.join(', ')}`)
    checkAdminAndLoad() // Refresh
    setRunningDraw(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
  if (!isAdmin) return null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <button
          onClick={handleRunDraw}
          disabled={runningDraw}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 disabled:opacity-50"
        >
          {runningDraw ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          Run Draw
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Users */}
        <div className="bg-card border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-zinc-400" /> Users ({profiles.length})</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {profiles.length === 0 ? <p className="text-zinc-500">No users found.</p> : profiles.map(p => (
              <div key={p.id} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 flex justify-between items-center">
                <span className="font-medium text-sm">{p.email || 'Unknown User'}</span>
                <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">
                  {p.subscription_status || 'inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Winners */}
        <div className="bg-card border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Winners</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {winners.length === 0 ? <p className="text-zinc-500">No winners yet.</p> : winners.map(w => (
              <div key={w.id} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">{w.profiles?.email || 'Unknown User'}</span>
                  <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                    {w.match_count} Matches
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Draw: {w.draws?.month}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}