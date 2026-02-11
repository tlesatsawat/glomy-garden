// Game Loop & Rendering
export const GAME_CONFIG = {
  TARGET_FPS: 60,
  FRAME_TIME: 1000 / 60, // ~16.67ms
  TILE_SIZE: 48,         // Base pixel size for grid
  GRID_COLS: 20,
  GRID_ROWS: 12,
  CANVAS_WIDTH: 960,     // 20 * 48
  CANVAS_HEIGHT: 576,    // 12 * 48
  SPRITE_SCALE: 1,
  INTERPOLATION_FACTOR: 0.1, // For smooth movement
} as const;

// Animation States
export const ANIMATION_CONFIG = {
  IDLE_FRAME_COUNT: 2,
  WALK_FRAME_COUNT: 4,
  ACTION_FRAME_COUNT: 2,
  FRAME_DURATION: 150, // ms per frame
} as const;

// Asset Paths
export const ASSETS = {
  SPRITES: {
    PLAYER: '/sprites/player_sheet.png',
    CROPS: '/sprites/crops_sheet.png',
    TILES: '/sprites/tiles_sheet.png',
  },
  SOUNDS: {
    PLANT: '/sounds/plant.mp3',
    HARVEST: '/sounds/harvest.mp3',
  }
} as const;

// Economy Balance
export const ECONOMY = {
  INITIAL_GOLD: 100,
  INITIAL_SLOTS: 6,
  MAX_SLOTS: 24,
  SLOT_PRICE_MULTIPLIER: 1.5,
  MARKET_FEE_PERCENT: 0.05,
} as const;

// Network / API
export const API_ROUTES = {
  SYNC: '/api/game/sync',
  ACTION: '/api/game/action',
  MARKET: '/api/market',
} as const;

export enum GAME_LAYERS {
  GROUND = 0,
  SOIL = 1,
  CROPS = 2,
  OBJECTS = 3,
  CHARACTERS = 4,
  PARTICLES = 5,
  UI = 6
}

export enum DIRECTIONS {
  DOWN = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3,
}