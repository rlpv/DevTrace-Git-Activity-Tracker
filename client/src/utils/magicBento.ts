export interface MagicBentoOptions {
  textAutoHide: boolean;
  enableStars: boolean;
  enableSpotlight: boolean;
  enableBorderGlow: boolean;
  enableTilt: boolean;
  enableMagnetism: boolean;
  clickEffect: boolean;
  spotlightRadius: number;
  particleCount: number;
  glowColor: string;
  disableAnimations: boolean;
}

const defaultOptions: MagicBentoOptions = {
  textAutoHide: true,
  enableStars: true,
  enableSpotlight: true,
  enableBorderGlow: true,
  enableTilt: false,
  enableMagnetism: false,
  clickEffect: true,
  spotlightRadius: 400,
  particleCount: 12,
  glowColor: '132, 0, 255',
  disableAnimations: false,
};

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

function parseGlowColor(value: string): string {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : '132, 0, 255';
}

function createStars(count: number): Star[] {
  return Array.from({ length: Math.max(0, count) }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.00035,
    vy: (Math.random() - 0.5) * 0.00035,
    r: 0.6 + Math.random() * 1.8,
  }));
}

export function mountMagicBento(target: HTMLElement, input: Partial<MagicBentoOptions> = {}): () => void {
  const options = { ...defaultOptions, ...input };
  const glowColor = parseGlowColor(options.glowColor);

  target.classList.add('magic-bento');
  target.style.setProperty('--magic-glow-color', glowColor);

  if (options.textAutoHide) {
    target.classList.add('magic-text-auto-hide');
    target.querySelectorAll<HTMLElement>('p, .field-label').forEach((node) => {
      node.classList.add('magic-text-target');
    });
  }

  const cleanup: Array<() => void> = [];

  if (options.enableSpotlight) {
    const spotlight = document.createElement('div');
    spotlight.className = 'magic-bento-spotlight';
    spotlight.style.setProperty('--spotlight-radius', `${Math.max(80, options.spotlightRadius)}px`);
    target.appendChild(spotlight);
    cleanup.push(() => spotlight.remove());
  }

  if (options.enableStars) {
    const canvas = document.createElement('canvas');
    canvas.className = 'magic-bento-stars';
    target.appendChild(canvas);

    const rawCtx = canvas.getContext('2d');
    if (rawCtx) {
      const ctx: CanvasRenderingContext2D = rawCtx;
      const stars = createStars(options.particleCount);
      let raf = 0;
      let width = 0;
      let height = 0;

      const resize = () => {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const rect = target.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const draw = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = `rgba(${glowColor}, 0.45)`;

        for (const star of stars) {
          if (!options.disableAnimations) {
            star.x += star.vx;
            star.y += star.vy;
            if (star.x < 0 || star.x > 1) star.vx *= -1;
            if (star.y < 0 || star.y > 1) star.vy *= -1;
            star.x = Math.max(0, Math.min(1, star.x));
            star.y = Math.max(0, Math.min(1, star.y));
          }

          ctx.beginPath();
          ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
          ctx.fill();
        }

        if (!options.disableAnimations) {
          raf = requestAnimationFrame(draw);
        }
      };

      resize();
      draw();
      window.addEventListener('resize', resize);

      cleanup.push(() => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
      });
    }

    cleanup.push(() => canvas.remove());
  }

  const onMove = (event: MouseEvent) => {
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    target.style.setProperty('--mx', `${x}px`);
    target.style.setProperty('--my', `${y}px`);

    if (options.enableTilt && !options.disableAnimations) {
      const px = (x / rect.width) * 2 - 1;
      const py = (y / rect.height) * 2 - 1;
      target.style.transform = `perspective(900px) rotateX(${-py * 4}deg) rotateY(${px * 4}deg)`;
    }

    if (options.enableMagnetism && !options.disableAnimations) {
      const px = (x / rect.width) * 2 - 1;
      const py = (y / rect.height) * 2 - 1;
      target.style.transform = `translate(${px * 4}px, ${py * 4}px)`;
    }
  };

  const onLeave = () => {
    target.style.transform = '';
  };

  target.addEventListener('mousemove', onMove);
  target.addEventListener('mouseleave', onLeave);
  cleanup.push(() => {
    target.removeEventListener('mousemove', onMove);
    target.removeEventListener('mouseleave', onLeave);
  });

  if (options.enableBorderGlow) {
    const enter = () => target.classList.add('magic-bento-glow');
    const leave = () => target.classList.remove('magic-bento-glow');
    target.addEventListener('mouseenter', enter);
    target.addEventListener('mouseleave', leave);
    cleanup.push(() => {
      target.removeEventListener('mouseenter', enter);
      target.removeEventListener('mouseleave', leave);
    });
  }

  if (options.clickEffect) {
    const onClick = (event: MouseEvent) => {
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'magic-bento-ripple';
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      ripple.style.setProperty('--magic-glow-color', glowColor);
      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 600);
    };

    target.addEventListener('click', onClick);
    cleanup.push(() => target.removeEventListener('click', onClick));
  }

  return () => {
    cleanup.forEach((fn) => fn());
    target.classList.remove('magic-bento', 'magic-text-auto-hide', 'magic-bento-glow');
    target.style.removeProperty('--magic-glow-color');
    target.style.removeProperty('--mx');
    target.style.removeProperty('--my');
    target.style.transform = '';
  };
}
