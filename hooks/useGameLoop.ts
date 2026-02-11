import { useEffect, useRef } from 'react'
import { GAME_CONFIG } from '@/lib/constants'

export const useGameLoop = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  update: (deltaTime: number) => void,
  render: (ctx: CanvasRenderingContext2D, deltaTime: number) => void,
  isPlaying: boolean = true
) => {
  const requestRef = useRef<number>()
  const previousTimeRef = useRef<number>()
  
  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        // Calculate Delta Time in seconds
        const deltaTime = (time - previousTimeRef.current) / 1000
        
        // Cap max delta time to prevent spiral of death (e.g. tab inactive)
        const safeDeltaTime = Math.min(deltaTime, 0.1)

        // 1. Update Phase (Physics / Logic)
        update(safeDeltaTime)

        // 2. Render Phase (Draw)
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        
        if (canvas && ctx) {
            // Clear canvas before render
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            
            // Draw
            render(ctx, safeDeltaTime)
        }
      }
      
      previousTimeRef.current = time
      requestRef.current = requestAnimationFrame(animate)
    }

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [canvasRef, update, render, isPlaying])
}