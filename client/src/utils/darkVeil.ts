export interface DarkVeilOptions {
  hueShift: number;
  noiseIntensity: number;
  scanlineIntensity: number;
  speed: number;
  scanlineFrequency: number;
  warpAmount: number;
}

const defaultOptions: DarkVeilOptions = {
  hueShift: 0,
  noiseIntensity: 0,
  scanlineIntensity: 0,
  speed: 0.5,
  scanlineFrequency: 0,
  warpAmount: 0,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s);
  const ll = clamp01(l);

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hh < 60) {
    r = c;
    g = x;
  } else if (hh < 120) {
    r = x;
    g = c;
  } else if (hh < 180) {
    g = c;
    b = x;
  } else if (hh < 240) {
    g = x;
    b = c;
  } else if (hh < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function pseudoNoise(x: number, y: number): number {
  const t = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return t - Math.floor(t);
}

export function mountDarkVeil(target: HTMLElement, input: Partial<DarkVeilOptions> = {}): () => void {
  const options: DarkVeilOptions = {
    ...defaultOptions,
    ...input,
  };

  const canvas = document.createElement('canvas');
  canvas.className = 'dark-veil-canvas';
  target.appendChild(canvas);

  const rawCtx = canvas.getContext('2d', { alpha: true });
  if (!rawCtx) {
    return () => {
      canvas.remove();
    };
  }
  const ctx: CanvasRenderingContext2D = rawCtx;

  let frameId = 0;
  let width = 0;
  let height = 0;
  let start = performance.now();

  function resize(): void {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now: number): void {
    const t = ((now - start) / 1000) * options.speed;
    const hueBase = 220 + options.hueShift;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `hsl(${hueBase}, 35%, 8%)`);
    gradient.addColorStop(0.5, `hsl(${hueBase + 12}, 32%, 10%)`);
    gradient.addColorStop(1, `hsl(${hueBase + 24}, 30%, 7%)`);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const warp = options.warpAmount;
    if (warp > 0) {
      ctx.globalAlpha = Math.min(0.4, warp * 0.5);
      for (let y = 0; y < height; y += 4) {
        const offset = Math.sin(y * 0.015 + t * 2.5) * warp * 12;
        ctx.drawImage(canvas, 0, y, width, 4, offset, y, width, 4);
      }
      ctx.globalAlpha = 1;
    }

    if (options.scanlineIntensity > 0 && options.scanlineFrequency > 0) {
      const a = clamp01(options.scanlineIntensity) * 0.25;
      const freq = Math.max(1, options.scanlineFrequency);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      for (let y = 0; y < height; y += freq) {
        ctx.fillRect(0, y, width, 1);
      }
    }

    if (options.noiseIntensity > 0) {
      const n = clamp01(options.noiseIntensity) * 0.18;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const index = (y * width + x) * 4;
          const grain = (pseudoNoise(x + t * 40, y - t * 20) - 0.5) * 255 * n;
          data[index] = Math.max(0, Math.min(255, data[index] + grain));
          data[index + 1] = Math.max(0, Math.min(255, data[index + 1] + grain));
          data[index + 2] = Math.max(0, Math.min(255, data[index + 2] + grain));
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const glowHue = (hueBase + t * 20) % 360;
    const [r, g, b] = hslToRgb(glowHue, 0.6, 0.52);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
    ctx.beginPath();
    ctx.ellipse(width * 0.75, height * 0.25, width * 0.32, height * 0.25, t * 0.07, 0, Math.PI * 2);
    ctx.fill();

    frameId = requestAnimationFrame(draw);
  }

  resize();
  frameId = requestAnimationFrame(draw);
  window.addEventListener('resize', resize);

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', resize);
    canvas.remove();
  };
}

