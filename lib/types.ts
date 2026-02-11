import { AIInstance, AIMaster, CropInstance, CropMaster, FarmSlot, User, Wallet } from "@prisma/client";

// --- Game Engine Types ---

export type Vector2 = {
  x: number;
  y: number;
};

export interface Renderable {
  render(ctx: CanvasRenderingContext2D, deltaTime: number): void;
  update(deltaTime: number): void;
}

export interface SpriteConfig {
  texture: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  rows: number;
  cols: number;
}

// --- Entity States ---

// Extended types with relations for Frontend usage
export type FullFarmSlot = FarmSlot & {
  crop: (CropInstance & { master: CropMaster }) | null;
};

export type FullAI = AIInstance & {
  master: AIMaster;
};

export type FullUser = User & {
  wallet: Wallet;
  farmSlots: FullFarmSlot[];
  aiAgents: FullAI[];
};

// --- Network / API Payloads ---

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
};

export type SyncResponse = {
  user: FullUser;
  serverTime: number;
  events: any[]; // Define Event type if needed
};

export type ActionType = 'PLANT' | 'HARVEST' | 'MOVE_AI' | 'BUY_SLOT' | 'UNLOCK_SLOT';

export interface GameActionPayload {
  action: ActionType;
  slotId?: string;
  cropMasterId?: string;
  aiId?: string;
  targetGridIndex?: number;
}

// --- Canvas State ---

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface MouseInput {
  x: number;
  y: number;
  isDown: boolean;
  worldX: number;
  worldY: number;
}