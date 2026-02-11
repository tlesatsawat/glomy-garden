import { GAME_CONFIG, ASSETS } from '@/lib/constants';
import { FullFarmSlot, FullUser, Camera } from '@/lib/types';
import { getPixelPosition, calculateCropState } from '@/lib/game-logic';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private assets: Record<string, HTMLImageElement> = {};
  private isLoaded: boolean = false;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    // Disable anti-aliasing for crisp pixel art
    this.ctx.imageSmoothingEnabled = false;
  }

  // --- Asset Management ---

  public async loadAssets(): Promise<void> {
    const promises = Object.values(ASSETS.SPRITES).map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          this.assets[url] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load sprite: ${url}. Falling back to Emoji mode.`);
          resolve(); // Resolve anyway to allow game to start
        };
      });
    });

    await Promise.all(promises);
    this.isLoaded = true;
  }

  // --- Main Render Loop ---

  public render(
    user: FullUser | null,
    deltaTime: number,
    camera: Camera,
    mouseWorld: { x: number, y: number } | null
  ) {
    const { width, height } = this.ctx.canvas;
    
    // 1. Clear Screen
    this.ctx.fillStyle = '#2d3436'; // Dark background outside map
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.save();
    
    // 2. Apply Camera Transform
    // Center the camera
    this.ctx.translate(width / 2, height / 2);
    this.ctx.scale(camera.zoom, camera.zoom);
    this.ctx.translate(-camera.x, -camera.y);

    // 3. Draw Game Layers
    this.drawBackground();
    
    if (user) {
      this.drawFarmSlots(user.farmSlots);
    }

    // 4. Draw Interaction Highlight
    if (mouseWorld) {
      this.drawHighlight(mouseWorld);
    }

    this.ctx.restore();
  }

  // --- Layer Drawers ---

  private drawBackground() {
    const mapWidth = GAME_CONFIG.GRID_COLS * GAME_CONFIG.TILE_SIZE;
    const mapHeight = GAME_CONFIG.GRID_ROWS * GAME_CONFIG.TILE_SIZE;

    // Draw Grass Base
    this.ctx.fillStyle = '#7cbd6d'; // Grass Green
    this.ctx.fillRect(0, 0, mapWidth, mapHeight);

    // Draw Grid Lines (Opacity 0.1)
    this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    this.ctx.lineWidth = 1;
    
    this.ctx.beginPath();
    for (let x = 0; x <= GAME_CONFIG.GRID_COLS; x++) {
      const px = x * GAME_CONFIG.TILE_SIZE;
      this.ctx.moveTo(px, 0);
      this.ctx.lineTo(px, mapHeight);
    }
    for (let y = 0; y <= GAME_CONFIG.GRID_ROWS; y++) {
      const py = y * GAME_CONFIG.TILE_SIZE;
      this.ctx.moveTo(0, py);
      this.ctx.lineTo(mapWidth, py);
    }
    this.ctx.stroke();
  }

  private drawFarmSlots(slots: FullFarmSlot[]) {
    const tileSize = GAME_CONFIG.TILE_SIZE;
    const now = Date.now();

    slots.forEach(slot => {
      const pos = getPixelPosition(slot.gridIndex, GAME_CONFIG.GRID_COLS, tileSize);
      
      // Draw Soil (Tilled Earth)
      this.ctx.fillStyle = '#8d6e63'; // Brown
      this.ctx.fillRect(pos.x + 2, pos.y + 2, tileSize - 4, tileSize - 4);

      // Draw Crop
      if (slot.crop) {
        const { master, plantedAt, isWithered } = slot.crop;
        
        // Calculate dynamic stage
        const state = calculateCropState(plantedAt, master.growthTime, now);
        
        // Draw Logic: Priority = Withered > Sprite > Emoji
        if (isWithered) {
          this.drawEmoji('💀', pos.x, pos.y, tileSize);
        } else if (this.assets[ASSETS.SPRITES.CROPS] && master.frameConfig) {
          // Sprite Mode (Advanced)
          // Note: Real implementation would parse frameConfig JSON to get XY coords on spritesheet
          // For this MVP, we fallback to Emoji to ensure it works without real PNGs
          this.drawEmoji(master.emoji, pos.x, pos.y, tileSize, state.progress);
        } else {
          // Emoji Mode
          // Small plant for early stage, Big for ripe
          const scale = 0.5 + (state.progress * 0.5); // 0.5 to 1.0
          this.drawEmoji(master.emoji, pos.x, pos.y, tileSize, scale);
        }

        // Draw Progress Bar (if growing)
        if (!state.isReady && !isWithered) {
          this.drawProgressBar(pos.x, pos.y, tileSize, state.progress);
        }
      }
    });
  }

  private drawEmoji(emoji: string, x: number, y: number, size: number, scale: number = 1) {
    this.ctx.save();
    this.ctx.translate(x + size / 2, y + size / 2);
    this.ctx.scale(scale, scale);
    this.ctx.font = `${Math.floor(size * 0.8)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, 0, 4); // +4 for visual centering
    this.ctx.restore();
  }

  private drawProgressBar(x: number, y: number, size: number, progress: number) {
    const barWidth = size - 8;
    const barHeight = 4;
    const bx = x + 4;
    const by = y + size - 8;

    // Background
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(bx, by, barWidth, barHeight);

    // Fill
    this.ctx.fillStyle = '#00b894';
    this.ctx.fillRect(bx, by, barWidth * progress, barHeight);
  }

  private drawHighlight(pos: { x: number, y: number }) {
    const size = GAME_CONFIG.TILE_SIZE;
    const col = Math.floor(pos.x / size);
    const row = Math.floor(pos.y / size);

    // Only draw if inside grid bounds
    if (col >= 0 && col < GAME_CONFIG.GRID_COLS && row >= 0 && row < GAME_CONFIG.GRID_ROWS) {
      const hx = col * size;
      const hy = row * size;

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(hx, hy, size, size);
    }
  }
}