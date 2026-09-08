import { useEffect, useRef } from 'react';
import type { Expression, PortraitSpec } from '../game/story/types';
import { drawPortrait, P_H, P_W, type PortraitOpts } from './portrait';

/**
 * A portrait is a still image — it only needs redrawing when the
 * expression or the lighting changes, so this deliberately has no
 * animation frame loop. The motion in a scene comes from CSS
 * transforms on this element, which the compositor handles for free.
 */
export default function Portrait({
  look,
  as = 'calm',
  className = '',
  height = 420,
  rim,
  dim,
  halo,
}: {
  look: PortraitSpec;
  as?: Expression;
  className?: string;
  height?: number;
  rim?: string;
  dim?: number;
  halo?: boolean;
} & PortraitOpts) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = P_W * dpr;
    cv.height = P_H * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPortrait(ctx, look, as, { rim, dim, halo });
  }, [look, as, rim, dim, halo]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ height, width: (height * P_W) / P_H, display: 'block' }}
      aria-hidden
    />
  );
}
