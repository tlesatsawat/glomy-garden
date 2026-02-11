import { create } from 'zustand'
import { FullUser, FullFarmSlot, FullAI } from '@/lib/types'

interface GameState {
  user: FullUser | null
  isLoading: boolean
  lastSyncTime: number
  
  // Actions
  setUser: (user: FullUser) => void
  setLoading: (loading: boolean) => void
  
  // Optimistic Updates
  updateFarmSlot: (slot: FullFarmSlot) => void
  updateWallet: (gold: number, gems: number) => void
  updateAI: (ai: FullAI) => void
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  isLoading: true,
  lastSyncTime: 0,

  setUser: (user) => set({ 
    user, 
    isLoading: false, 
    lastSyncTime: Date.now() 
  }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  updateFarmSlot: (updatedSlot) => set((state) => {
    if (!state.user) return state;
    
    // Replace the specific slot in the array
    const newSlots = state.user.farmSlots.map(slot => 
      slot.id === updatedSlot.id ? updatedSlot : slot
    );
    
    return {
      user: {
        ...state.user,
        farmSlots: newSlots
      }
    };
  }),

  updateWallet: (gold, gems) => set((state) => {
    if (!state.user) return state;
    
    return {
      user: {
        ...state.user,
        wallet: { 
          ...state.user.wallet, 
          gold, 
          gems 
        }
      }
    };
  }),

  updateAI: (updatedAI) => set((state) => {
    if (!state.user) return state;

    const newAgents = state.user.aiAgents.map(agent =>
        agent.id === updatedAI.id ? updatedAI : agent
    );

    return {
        user: {
            ...state.user,
            aiAgents: newAgents
        }
    };
  })
}))