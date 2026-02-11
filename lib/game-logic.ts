import { CropInstance, CropMaster, FarmSlot } from "@prisma/client";

// --- Time & Growth Logic ---

export interface CropState {
  progress: number;       // 0.0 to 1.0
  stage: number;          // 0 = Seed, 1 = Sprout, 2 = Ripe
  isReady: boolean;
  isWithered: boolean;
  secondsRemaining: number;
}

/**
 * Calculates the current state of a crop based on time elapsed.
 * Shared by both Frontend (for progress bars) and Backend (for validation).
 */
export const calculateCropState = (
  plantedAt: Date | string,
  growthTimeSeconds: number,
  now: number = Date.now()
): CropState => {
  const plantTime = new Date(plantedAt).getTime();
  const elapsedSeconds = (now - plantTime) / 1000;
  
  // 1. Calculate Growth Progress
  const rawProgress = elapsedSeconds / growthTimeSeconds;
  const progress = Math.max(0, Math.min(rawProgress, 1));
  
  // 2. Determine Stage (Assuming 3 visual stages: Seed -> Sprout -> Ripe)
  // 0% - 49% = Stage 0 (Seed)
  // 50% - 99% = Stage 1 (Sprout)
  // 100%      = Stage 2 (Ripe)
  let stage = 0;
  if (progress >= 1) stage = 2;
  else if (progress >= 0.5) stage = 1;
  
  // 3. Wither Logic (Example: Withers after 2x growth time if not harvested)
  // In a real game, this might depend on water/events
  const isWithered = elapsedSeconds > (growthTimeSeconds * 3); 

  return {
    progress,
    stage: isWithered ? 3 : stage, // Stage 3 = Withered Sprite
    isReady: progress >= 1 && !isWithered,
    isWithered,
    secondsRemaining: Math.max(0, growthTimeSeconds - elapsedSeconds)
  };
};

// --- Grid & Positioning Logic ---

export const getGridPosition = (index: number, cols: number) => {
  return {
    col: index % cols,
    row: Math.floor(index / cols)
  };
};

export const getPixelPosition = (
  index: number, 
  cols: number, 
  tileSize: number
) => {
  const { col, row } = getGridPosition(index, cols);
  return {
    x: col * tileSize,
    y: row * tileSize
  };
};

export const isWithinInteractionRange = (
  playerX: number,
  playerY: number,
  targetX: number,
  targetY: number,
  range: number = 64 // pixels
) => {
  const dx = playerX - targetX;
  const dy = playerY - targetY;
  return (dx * dx + dy * dy) <= (range * range);
};

// --- Economy Logic ---

export const calculateSellPrice = (
  basePrice: number, 
  quality: number = 1,
  marketMultiplier: number = 1.0
) => {
  return Math.floor(basePrice * quality * marketMultiplier);
};