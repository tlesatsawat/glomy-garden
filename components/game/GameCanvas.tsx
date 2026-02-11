'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useGameLoop } from '@/hooks/useGameLoop'
import { GameRenderer } from '@/engine/Renderer'
import { useGameStore } from '@/lib/store'
import { GAME_CONFIG, API_ROUTES } from '@/lib/constants'
import { Camera, GameActionPayload } from '@/lib/types'
import { SlotStatus } from '@prisma/client'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<GameRenderer | null>(null)
  const { user, updateFarmSlot, updateWallet } = useGameStore()
  
  // Local State
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 })
  const [mouseWorld, setMouseWorld] = useState<{ x: number, y: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize Renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        const renderer = new GameRenderer(ctx)
        renderer.loadAssets().then(() => {
          console.log('Assets loaded')
        })
        rendererRef.current = renderer
      }
    }
  }, [])

  // Input Handling: Mouse Move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height

    const screenX = (e.clientX - rect.left) * scaleX
    const screenY = (e.clientY - rect.top) * scaleY

    // Convert Screen to World (Reverse Camera Transform)
    // Formula matches Renderer logic: (Screen - Center) / Zoom + Camera + Center
    // Simplified for fixed center offset if needed, but here is standard 2D camera reverse:
    const centerX = canvasRef.current.width / 2
    const centerY = canvasRef.current.height / 2
    
    const worldX = (screenX - centerX) / camera.zoom + camera.x + centerX // Approximate for centered camera
    const worldY = (screenY - centerY) / camera.zoom + camera.y + centerY // Simplified

    // Correction: The renderer translates center, scales, then translates -camera
    // We need exact inverse for accurate clicking
    const finalWorldX = (screenX - centerX) / camera.zoom + camera.x
    const finalWorldY = (screenY - centerY) / camera.zoom + camera.y

    setMouseWorld({ x: finalWorldX, y: finalWorldY })
  }, [camera])

  // Input Handling: Click
  const handleCanvasClick = async () => {
    if (!mouseWorld || !user || isProcessing) return

    const col = Math.floor(mouseWorld.x / GAME_CONFIG.TILE_SIZE)
    const row = Math.floor(mouseWorld.y / GAME_CONFIG.TILE_SIZE)
    
    // Check bounds
    if (col < 0 || col >= GAME_CONFIG.GRID_COLS || row < 0 || row >= GAME_CONFIG.GRID_ROWS) return

    // Find Slot
    const targetIndex = row * GAME_CONFIG.GRID_COLS + col
    const slot = user.farmSlots.find(s => s.gridIndex === targetIndex)
    
    if (!slot) return // Slot locked or invalid

    setIsProcessing(true)

    try {
      let payload: GameActionPayload | null = null

      // Logic: If Empty -> Plant (Test with first available seed/crop)
      // Logic: If Planted -> Harvest
      if (slot.status === SlotStatus.EMPTY) {
        // TODO: In real UI, open modal to select seed. 
        // For MVP, we auto-plant the first CropMaster found in DB (hardcoded ID for demo or logic needed)
        // Let's assume we have a hardcoded ID for "Turnip" or "Carrot" for this demo
        // In production, this ID comes from a selected item in UI state
        const demoCropId = "crop-turnip-id" // Placeholder
        
        payload = {
          action: 'PLANT',
          slotId: slot.id,
          cropMasterId: demoCropId 
        }
      } else if (slot.status === SlotStatus.PLANTED) {
        payload = {
          action: 'HARVEST',
          slotId: slot.id
        }
      }

      if (payload) {
        // API Call
        const res = await fetch(API_ROUTES.ACTION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: user.username,
            payload
          })
        })

        const data = await res.json()
        
        if (data.success) {
           // State update handled by re-fetching or syncing? 
           // Better: Use return data from Action API to update store
           const updatedUser = data.data.user
           
           // Update specific slot to avoid full re-render flickering if possible, 
           // but replacing user is safer for sync
           // In `lib/store.ts` we have setUser
           useGameStore.getState().setUser(updatedUser)
        } else {
            console.error(data.error)
            alert(data.error) // Simple feedback
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Game Loop
  const update = useCallback((deltaTime: number) => {
    // Update logic (Physics, Animations)
    // Here we can interpolate animations if we had them in a separate system
  }, [])

  const render = useCallback((ctx: CanvasRenderingContext2D, deltaTime: number) => {
    if (rendererRef.current) {
      rendererRef.current.render(user, deltaTime, camera, mouseWorld)
    }
  }, [user, camera, mouseWorld])

  // Start Loop
  useGameLoop(canvasRef, update, render)

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.CANVAS_WIDTH}
        height={GAME_CONFIG.CANVAS_HEIGHT}
        className="max-w-full max-h-full shadow-2xl rounded-lg cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMouseWorld(null)}
        onClick={handleCanvasClick}
      />
      
      {/* Loading Overlay */}
      {(!user || isProcessing) && (
        <div className="absolute top-4 right-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}
      
      {/* UI Hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
        {mouseWorld 
          ? `Grid: ${Math.floor(mouseWorld.x/GAME_CONFIG.TILE_SIZE)}, ${Math.floor(mouseWorld.y/GAME_CONFIG.TILE_SIZE)}`
          : 'Hover to inspect'}
      </div>
    </div>
  )
}