import { useMemo } from 'react';
import type { WeatherId } from '../game/types';
import { hash32, rand01 } from '../game/rng';
import { weatherArt } from '../game/systems/weather';

/* ============================================================
   WEATHER OVERLAY

   The home screen's scenery is a procedural canvas that took a while to
   get right, so weather is not allowed to replace it: this component is a
   mask laid over the top. It tints, it blurs *through* the mask, and it
   adds particles — the landscape underneath keeps its own light, its own
   crowd and its own animation.

   Everything it draws is described in content/weather/art.ts. This file
   knows how to turn "46 streaks tilted 12°" into DOM; it does not know
   that rain is wetter than fog.

   Particles are plain divs with CSS animations rather than a second
   canvas: at these counts it is cheaper, it composites on the GPU, and it
   keeps the scene canvas single-purpose.
   ============================================================ */

interface Props {
  weather: WeatherId;
  /** part of the particle seed, so two overlooks never rain identically */
  overlookId: string;
  reduceMotion?: boolean;
  /** the widget trims particle counts to stay light on a lock screen */
  minimal?: boolean;
}

/** deterministic 0..1 series — same sky, same drops, no reflow jitter */
function series(seed: string, n: number, salt: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(rand01(hash32(seed, i, salt)));
  return out;
}

export default function WeatherOverlay({ weather, overlookId, reduceMotion, minimal }: Props) {
  const art = weatherArt(weather);
  const seed = `${weather}:${overlookId}`;
  const density = minimal ? 0.55 : 1;

  const streaks = useMemo(() => {
    if (!art.streaks) return [];
    const n = Math.max(1, Math.round(art.streaks.count * density));
    const x = series(seed, n, 1);
    const delay = series(seed, n, 2);
    const scale = series(seed, n, 3);
    return x.map((left, i) => ({ left, delay: delay[i], scale: 0.7 + scale[i] * 0.6 }));
  }, [art.streaks, seed, density]);

  const flakes = useMemo(() => {
    if (!art.flakes) return [];
    const n = Math.max(1, Math.round(art.flakes.count * density));
    const x = series(seed, n, 11);
    const delay = series(seed, n, 12);
    const scale = series(seed, n, 13);
    const dir = series(seed, n, 14);
    return x.map((left, i) => ({
      left,
      delay: delay[i],
      scale: 0.6 + scale[i] * 0.9,
      drift: (dir[i] > 0.5 ? 1 : -1) * (0.4 + dir[i] * 0.6),
    }));
  }, [art.flakes, seed, density]);

  const bands = useMemo(() => {
    const spec = art.bands;
    if (!spec) return [];
    const n = Math.max(1, Math.round(spec.count));
    const top = series(seed, n, 21);
    const delay = series(seed, n, 22);
    return top.map((t, i) => ({ top: t, delay: delay[i] }));
  }, [art.bands, seed]);

  const gusts = useMemo(() => {
    const spec = art.gusts;
    if (!spec) return [];
    const n = Math.max(1, Math.round(spec.count));
    const top = series(seed, n, 31);
    const delay = series(seed, n, 32);
    const len = series(seed, n, 33);
    return top.map((t, i) => ({ top: t, delay: delay[i], len: 0.18 + len[i] * 0.34 }));
  }, [art.gusts, seed]);

  const frozen = reduceMotion ? ('paused' as const) : ('running' as const);

  /* a clear sky still mounts, empty: the layer is always present so nothing
     downstream has to care whether weather exists, and `data-weather` is a
     truthful readout of the rolled sky for tests and for debugging */
  if (weather === 'clear') {
    return <div className="pointer-events-none absolute inset-0" data-weather="clear" aria-hidden />;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      data-weather={weather}
      aria-hidden
    >
      {/* the mask itself: a wash plus a blur applied *through* it, so the
          scenery is still the thing you are looking at */}
      {art.tint && (
        <div
          className="absolute inset-0"
          style={{
            background: art.tint,
            opacity: art.tintOpacity,
            backdropFilter: art.blur > 0 ? `blur(${art.blur}px)` : undefined,
            WebkitBackdropFilter: art.blur > 0 ? `blur(${art.blur}px)` : undefined,
          }}
        />
      )}

      {art.vignette > 0 && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 50% 40%, transparent 40%, rgba(10,12,18,${art.vignette}) 100%)`,
          }}
        />
      )}

      {/* drifting bands — fog banks, and the low ceiling of an overcast sky */}
      {art.bands &&
        bands.map((b, i) => (
          <div
            key={`b${i}`}
            className="absolute left-0 wx-band"
            style={{
              top: `${b.top * 92}%`,
              height: `${art.bands!.height * 100}%`,
              width: '160%',
              background: `radial-gradient(60% 100% at 50% 50%, ${art.bands!.color} 0%, transparent 72%)`,
              opacity: art.bands!.opacity,
              animationDuration: `${art.bands!.speed}s`,
              animationDelay: `-${b.delay * art.bands!.speed}s`,
              animationPlayState: frozen,
              filter: 'blur(6px)',
            }}
          />
        ))}

      {/* rain / sleet: one rotated frame, so every drop shares the tilt */}
      {art.streaks && (
        <div
          className="absolute"
          style={{
            inset: '-30%',
            transform: `rotate(${art.streaks.tilt}deg)`,
          }}
        >
          {streaks.map((d, i) => (
            <span
              key={`s${i}`}
              className="absolute top-0 wx-fall"
              style={{
                left: `${d.left * 100}%`,
                width: `${art.streaks!.width}px`,
                height: `${art.streaks!.len * d.scale}px`,
                background: `linear-gradient(to bottom, transparent, ${art.streaks!.color})`,
                opacity: art.streaks!.opacity,
                animationDuration: `${art.streaks!.speed * (1.6 - d.scale * 0.5)}s`,
                animationDelay: `-${d.delay * art.streaks!.speed * 2}s`,
                animationPlayState: frozen,
              }}
            />
          ))}
        </div>
      )}

      {/* snow: slower, and it wanders sideways on the way down */}
      {art.flakes &&
        flakes.map((f, i) => (
          <span
            key={`f${i}`}
            className="absolute top-0 rounded-full wx-flake"
            style={
              {
                left: `${f.left * 100}%`,
                width: `${art.flakes!.size * f.scale}px`,
                height: `${art.flakes!.size * f.scale}px`,
                background: art.flakes!.color,
                opacity: art.flakes!.opacity,
                animationDuration: `${art.flakes!.speed * (1.4 - f.scale * 0.4)}s`,
                animationDelay: `-${f.delay * art.flakes!.speed}s`,
                animationPlayState: frozen,
                '--wx-drift': `${art.flakes!.drift * f.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}

      {/* wind: nothing falls, things streak past */}
      {art.gusts &&
        gusts.map((g, i) => (
          <span
            key={`g${i}`}
            className="absolute wx-gust"
            style={{
              top: `${g.top * 100}%`,
              width: `${g.len * 100}%`,
              height: `${Math.max(1, art.gusts!.height * 100)}px`,
              background: `linear-gradient(to right, transparent, ${art.gusts!.color}, transparent)`,
              opacity: art.gusts!.opacity,
              animationDuration: `${art.gusts!.speed * (1.4 - g.len)}s`,
              animationDelay: `-${g.delay * art.gusts!.speed * 2}s`,
              animationPlayState: frozen,
            }}
          />
        ))}

      {/* lightning: a wash over everything, on the config's own rhythm */}
      {art.flash && (
        <div
          className="absolute inset-0 wx-flash"
          style={{
            background: art.flash.color,
            animationDuration: `${art.flash.every / 1000}s`,
            animationPlayState: frozen,
            ['--wx-flash-opacity' as string]: art.flash.opacity,
          }}
        />
      )}
    </div>
  );
}
