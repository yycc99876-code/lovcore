/**
 * Lovcore High-Aesthetic UI & Dynamic Interaction Helper Library
 * 
 * Provides:
 * 1. Magnetic Boundary Attraction: Physics calculations for magnetic hover buttons/icons.
 * 2. Dynamic Noise Texture: Canvas grain overlay renderer to emulate organic paper/stone textures.
 * 3. Easing & Curves: Custom luxury timing curves and constants.
 */

// ==========================================
// 1. Magnetic Physics Helper
// ==========================================

export interface MagneticTarget {
  x: number;
  y: number;
}

/**
 * Calculates the magnetic attraction vector based on cursor distance.
 * Returns the target offset for elements to warp toward the cursor.
 * 
 * @param cursorX Cursor X coordinate relative to container
 * @param cursorY Cursor Y coordinate relative to container
 * @param width Container width
 * @param height Container height
 * @param range Activation distance radius
 * @param strength Attraction multiplier (0 to 1)
 */
export function calculateMagneticPull(
  cursorX: number,
  cursorY: number,
  width: number,
  height: number,
  range: number = 60,
  strength: number = 0.45
): MagneticTarget {
  const centerX = width / 2;
  const centerY = height / 2;
  
  const distanceX = cursorX - centerX;
  const distanceY = cursorY - centerY;
  
  const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
  
  if (distance < range) {
    // Linear interpolation based on proximity
    const factor = (range - distance) / range;
    return {
      x: distanceX * strength * factor,
      y: distanceY * strength * factor,
    };
  }
  
  return { x: 0, y: 0 };
}


// ==========================================
// 2. High-Performance Canvas Grain Noise Overlay
// ==========================================

export interface NoiseConfig {
  opacity: number;
  patternSize: number;
  patternScale: number;
  grainSpeed: number;
}

/**
 * Attaches a dynamic grain noise shader overlay to a target HTML5 Canvas.
 * Generates an organic paper-like micro-grain overlay that rotates/shifts
 * slightly to make flat color gradients look alive and textured.
 */
export class CanvasGrainNoise {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: NoiseConfig;
  private animationFrameId: number | null = null;
  private patternCanvas: HTMLCanvasElement;
  private patternCtx: CanvasRenderingContext2D;
  private frameCount: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    config: Partial<NoiseConfig> = {}
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    this.config = {
      opacity: 0.045, // Serene, barely noticeable
      patternSize: 120, // Grid size for pattern cache
      patternScale: 1.0,
      grainSpeed: 4, // Update pattern every N frames to save CPU
      ...config
    };

    // Initialize sub-canvas for pattern cache
    this.patternCanvas = document.createElement('canvas') as HTMLCanvasElement;
    this.patternCanvas.width = this.config.patternSize;
    this.patternCanvas.height = this.config.patternSize;
    const pCtx = this.patternCanvas.getContext('2d');
    if (!pCtx) throw new Error('Could not create offscreen pattern canvas');
    this.patternCtx = pCtx;

    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);

    window.addEventListener('resize', this.resize);
    this.resize();
  }

  public start() {
    if (this.animationFrameId === null) {
      this.render();
    }
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Generates a noise pattern tile in the offscreen canvas cache
   */
  private generateNoisePattern() {
    const size = this.config.patternSize;
    const imgData = this.patternCtx.createImageData(size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Monochromatic random noise value
      const val = Math.floor(Math.random() * 255);
      data[i] = val;     // Red
      data[i + 1] = val; // Green
      data[i + 2] = val; // Blue
      data[i + 3] = Math.floor(Math.random() * 255 * this.config.opacity); // Alpha
    }

    this.patternCtx.putImageData(imgData, 0, 0);
  }

  private render() {
    this.frameCount++;

    // Only regenerate noise grain every few frames to conserve CPU/GPU
    if (this.frameCount % this.config.grainSpeed === 0) {
      this.generateNoisePattern();
    }

    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, w, h);

    // Draw the offscreen pattern repeated across the screen with random translates/scales
    const pattern = this.ctx.createPattern(this.patternCanvas, 'repeat');
    if (pattern) {
      this.ctx.fillStyle = pattern;
      
      // Slightly rotate or translate pattern matrix to simulate running celluloid noise
      const matrix = new DOMMatrix();
      const xTranslate = (Math.random() - 0.5) * this.config.patternSize;
      const yTranslate = (Math.random() - 0.5) * this.config.patternSize;
      
      matrix.translateSelf(xTranslate, yTranslate);
      pattern.setTransform(matrix);
      
      this.ctx.fillRect(0, 0, w, h);
    }

    this.animationFrameId = requestAnimationFrame(this.render);
  }
}


// ==========================================
// 3. Custom Easing Constants
// ==========================================

export const EASE_COSMIC = {
  // Ultra smooth decelerate for transitions and popups
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  
  // Springy bouncy curve for modal popups and card hover returns
  springElastic: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  
  // Slow ease in and out for natural drifting loops
  slowDrift: 'cubic-bezier(0.445, 0.05, 0.55, 0.95)'
};
