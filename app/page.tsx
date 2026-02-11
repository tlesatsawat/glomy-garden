'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/store'
import GameCanvas from '@/components/game/GameCanvas'
import { API_ROUTES } from '@/lib/constants'
import { Coins, Hexagon, Loader2, Sprout } from 'lucide-react'

export default function GamePage() {
  const { user, setUser } = useGameStore()
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Handle Login / Sync
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(API_ROUTES.SYNC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })

      const data = await res.json()

      if (data.success) {
        setUser(data.data.user)
      } else {
        setError(data.error || 'Failed to sync')
      }
    } catch (err) {
      setError('Connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  // --- Render: Login Screen ---
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#2d3436] p-4 font-sans text-white">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
              <Sprout size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Glomy Garden</h1>
            <p className="mt-2 text-sm text-gray-300">Enter your farm name to start</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="sr-only">
                Farm Name
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="relative block w-full appearance-none rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                placeholder="Ex. MorningStar Farm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                'Start Farming'
              )}
            </button>
          </form>
          
          <div className="text-center text-xs text-gray-500">
            Version 0.1.0 (Production Build)
          </div>
        </div>
      </main>
    )
  }

  // --- Render: Game Screen (HUD + Canvas) ---
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#2d3436]">
      {/* 1. The Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas />
      </div>

      {/* 2. HUD - Top Left (Profile) */}
      <div className="absolute left-4 top-4 z-10 flex items-center space-x-3 rounded-xl bg-black/60 p-3 text-white backdrop-blur-md">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 font-bold">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-bold">{user.username}</div>
          <div className="text-xs text-gray-300">Lv. 1 Farmer</div>
        </div>
      </div>

      {/* 3. HUD - Top Right (Wallet) */}
      <div className="absolute right-4 top-4 z-10 flex space-x-2">
        <div className="flex items-center space-x-2 rounded-full bg-black/60 px-4 py-2 text-yellow-400 backdrop-blur-md border border-yellow-500/30">
          <Coins size={18} />
          <span className="font-mono font-bold">{user.wallet.gold.toLocaleString()}</span>
        </div>
        <div className="flex items-center space-x-2 rounded-full bg-black/60 px-4 py-2 text-pink-400 backdrop-blur-md border border-pink-500/30">
          <Hexagon size={18} />
          <span className="font-mono font-bold">{user.wallet.gems.toLocaleString()}</span>
        </div>
      </div>

      {/* 4. HUD - Bottom (Toolbar Placeholder) */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 space-x-2 rounded-2xl bg-black/60 p-2 backdrop-blur-md">
        {[1, 2, 3, 4, 5].map((slot) => (
          <button
            key={slot}
            className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all hover:scale-105 ${
              slot === 1 
                ? 'border-green-500 bg-green-500/20 text-green-400' 
                : 'border-gray-600 bg-gray-700/50 text-gray-500'
            }`}
          >
            {slot}
          </button>
        ))}
      </div>
    </main>
  )
}