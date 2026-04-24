'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, Loader2, Trophy } from 'lucide-react'

type Score = { id: string; score: number; created_at: string }
type Charity = { id: string; name: string; description: string; image_url: string }

export default function Dashboard() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [charities, setCharities] = useState<Charity[]>([])
  const [winnings, setWinnings] = useState<any[]>([])
  
  const [newScore, setNewScore] = useState('')
  const [selectedCharity, setSelectedCharity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingScore, setAddingScore] = useState(false)
  
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    // Load scores
    const { data: userScores } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    if (userScores) setScores(userScores)

    // Load Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('charity_id')
      .eq('id', user.id)
      .single()
    
    if (profile?.charity_id) setSelectedCharity(profile.charity_id)

    // Load Charities
    const { data: charitiesList } = await supabase.from('charities').select('*')
    if (charitiesList) setCharities(charitiesList)

    // Load Winnings
    const { data: userWinnings } = await supabase
      .from('winners')
      .select('*, draws(month)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      
    if (userWinnings) setWinnings(userWinnings)

    setLoading(false)
  }

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseInt(newScore)
    if (isNaN(num) || num < 1 || num > 45) return alert('Score must be between 1 and 45')
    if (!user) return

    setAddingScore(true)
    
    let currentScores = [...scores]
    if (currentScores.length >= 5) {
      // Delete oldest
      const oldest = currentScores[0]
      await supabase.from('scores').delete().eq('id', oldest.id)
      currentScores = currentScores.slice(1)
    }

    const { data, error } = await supabase
      .from('scores')
      .insert({ user_id: user.id, score: num })
      .select()
      .single()

    if (!error && data) {
      setScores([...currentScores, data])
      setNewScore('')
    }
    setAddingScore(false)
  }

  const handleSelectCharity = async (charityId: string) => {
    setSelectedCharity(charityId)
    await supabase.from('profiles').update({ charity_id: charityId }).eq('id', user.id)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm mb-1">Subscription Status</h3>
          <p className="text-2xl font-bold text-success flex items-center gap-2">
            Active
          </p>
          <p className="text-xs text-zinc-500 mt-2">Mocked for demo</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm mb-1">Total Winnings</h3>
          <p className="text-2xl font-bold">${winnings.length * 100}</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm mb-1">Numbers Played</h3>
          <p className="text-2xl font-bold">{scores.length} / 5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Scores & Winnings */}
        <div className="lg:col-span-1 space-y-8">
          {/* Scores */}
          <div className="bg-card border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Your 5 Numbers</h2>
            <p className="text-sm text-zinc-400 mb-4">Enter numbers between 1 and 45. Entering a 6th will remove the oldest.</p>
            
            <form onSubmit={handleAddScore} className="flex gap-2 mb-6">
              <input
                type="number"
                min="1"
                max="45"
                required
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                placeholder="Ex: 42"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md p-2 focus:ring-2 focus:ring-primary outline-none"
              />
              <button disabled={addingScore} className="bg-primary text-white p-2 rounded-md hover:bg-blue-600 disabled:opacity-50">
                {addingScore ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>

            <div className="flex flex-wrap gap-3">
              {scores.map(s => (
                <div key={s.id} className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-lg">
                  {s.score}
                </div>
              ))}
              {scores.length === 0 && <p className="text-sm text-zinc-500">No numbers selected yet.</p>}
            </div>
          </div>

          {/* Winnings */}
          <div className="bg-card border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Recent Winnings</h2>
            <div className="space-y-3">
              {winnings.length === 0 ? (
                <p className="text-sm text-zinc-500">No winnings yet. Good luck!</p>
              ) : (
                winnings.map(w => (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div>
                      <p className="font-semibold">{w.match_count} Matches</p>
                      <p className="text-xs text-zinc-400">{w.draws?.month}</p>
                    </div>
                    <span className="text-success font-bold text-sm bg-success/10 px-2 py-1 rounded-md">
                      {w.status.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Charity Selection */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Select a Charity</h2>
            <p className="text-sm text-zinc-400 mb-6">Choose where your impact goes. 50% of proceeds go to your selected charity.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {charities.map(charity => (
                <div
                  key={charity.id}
                  onClick={() => handleSelectCharity(charity.id)}
                  className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    selectedCharity === charity.id ? 'border-primary' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <img src={charity.image_url} alt={charity.name} className="w-full h-32 object-cover" />
                  <div className="p-4 bg-zinc-900">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold">{charity.name}</h3>
                      {selectedCharity === charity.id && <Check className="text-primary w-5 h-5" />}
                    </div>
                    <p className="text-xs text-zinc-400">{charity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
