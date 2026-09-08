import type { ReactNode } from 'react';

/* ============================================================
   GLYPHS — one small line drawing per thing you can own

   The satchel used to be a list of cards: a name, a kind chip, a
   sentence of prose, a sell button, repeated fifteen times. Reading it
   took a scroll and told you nothing at a glance. A bag should look
   like a bag — a tray of objects you recognise by shape.

   So every ownable thing gets a glyph. The drawings live here because
   they are pictures; *which* picture belongs to *which* object is
   content, and lives next to the object (content/items/art.ts,
   content/instruments/art.ts, content/upgrades/art.ts).

   House style, so a tray of twenty of these looks like one hand drew
   them: 24×24 box, ~3.5 units of margin, stroke only, no fills, 1.35
   stroke inherited from the root <svg> so a glyph takes its colour from
   whatever cell it sits in. Three to six strokes each — at 26px on a
   phone, a seventh line is mud.
   ============================================================ */

const PEN = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.35,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const GLYPHS: Record<string, ReactNode> = {
  /* ---------------- items: trinkets ---------------- */
  /* a scallop: hinge at the bottom, wavy lip, three heavy ribs. Drawn
     wide and low — the taller version read as a folding paper fan. */
  shell: (
    <>
      <path d="M12 20.4c-6-1.4-9.6-5.6-9.6-9.6 0-.8.9-1.2 1.6-.8 1.4.8 2.7.6 3.8-.6.6-.7 1.6-.7 2.2 0 1.1 1.2 2.9 1.2 4 0 .6-.7 1.6-.7 2.2 0 1.1 1.2 2.4 1.4 3.8.6.7-.4 1.6 0 1.6.8 0 4-3.6 8.2-9.6 9.6z" />
      <path d="M12 20.4V10.6M7.4 19.4L5.6 11.2M16.6 19.4L18.4 11.2" />
    </>
  ),
  button: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <circle cx="9.6" cy="9.6" r="1.05" />
      <circle cx="14.4" cy="9.6" r="1.05" />
      <circle cx="9.6" cy="14.4" r="1.05" />
      <circle cx="14.4" cy="14.4" r="1.05" />
    </>
  ),
  /* a quill: vane on the upper half only, bare shaft running past it to
     a cut nib. With the vane hugging the whole shaft it was a leaf. */
  feather: (
    <>
      <path d="M19.4 4.2c-6.4 1.6-10 5-10.8 10.2" />
      <path d="M19.4 4.2c1.4 5.4-1.8 9.4-7.4 10.6" />
      <path d="M19.4 4.2L4.2 20.2" />
      <path d="M14.6 6.6l1 2.6M11.6 9.4l1 2.6" opacity="0.65" />
    </>
  ),
  /* three pairs of grains, not six — at 27px the old six-grain ear
     collapsed into a vertical smudge */
  wheat: (
    <>
      <path d="M12 20.6V8.2" />
      <path d="M12 8.2c-1-1.7-1-3.3 0-4.9 1 1.6 1 3.2 0 4.9z" />
      <path d="M12 12.6c-2.7-.6-4.1-2.3-4.3-5 2.7.4 4.1 2.2 4.3 5zM12 12.6c2.7-.6 4.1-2.3 4.3-5-2.7.4-4.1 2.2-4.3 5z" />
      <path d="M12 17.4c-2.7-.6-4.1-2.3-4.3-5 2.7.4 4.1 2.2 4.3 5zM12 17.4c2.7-.6 4.1-2.3 4.3-5-2.7.4-4.1 2.2-4.3 5z" />
    </>
  ),
  /* a leaning petal with a notched tip and one bead of wax. Drawn upright
     and symmetric it was a flower bud, and a twin of the bell. */
  waxpetal: (
    <>
      <path d="M5.6 18.6c-1.7-5.6 1.1-10 8.2-13.1l-.7 3.4 3-1.7c1.7 5.9-2 10.9-10.5 11.4z" />
      <path d="M17.6 16.2c1.1 1.5 1.5 2.7 1 3.6-.5 1-1.9.9-2.4-.2-.4-.9 0-2 1.4-3.4z" />
    </>
  ),
  /* a narrow sliver with a kinked fracture, catching light. Drawn broad
     it read as a tipped-over drinking glass. */
  mirror: (
    <>
      <path d="M7.4 3l6 2.8-1.4 4.8 2.2 3.4-2.8 6.6-4.6-2.4 1.7-5.2-2-3.6L7.4 3z" />
      <path d="M19.8 5l-2.4 2.4M21 10.4l-3 .4" />
    </>
  ),
  /* a curved band broken off a bowl's rim, cut ends and all. Both the
     tidy pentagon and the chipped blob read as crumpled paper. */
  glaze: (
    <>
      <path d="M3.4 16.6C4.4 9.2 10.6 3.8 18.4 4.6l1 4.6c-5.6-.6-10 3.2-11 8.6l-5-1.2z" />
      <path d="M7.4 14.2c1.4-2.8 3.6-4.6 6.6-5.4" opacity="0.7" />
    </>
  ),
  /* an hourglass with the sand already down. Every attempt at drawing it
     literally half-broken read as a tent, so the drawing says hourglass
     and the item's name says half. */
  hourglass: (
    <>
      <path d="M6.4 3.6h11.2M6.4 20.4h11.2" />
      <path d="M8 3.6c0 4 4 5.8 4 8.4s-4 4.4-4 8.4M16 3.6c0 4-4 5.8-4 8.4s4 4.4 4 8.4" />
      <path d="M9.2 20.4c.2-2.6 2.8-4.2 2.8-4.2s2.6 1.6 2.8 4.2" />
    </>
  ),
  teabrick: (
    <>
      <rect x="4" y="7.4" width="16" height="9.4" rx="1.6" />
      <path d="M4 10.6h16M4 13.6h16" opacity="0.7" />
      <path d="M14.4 5c1.8.4 2.6 1.4 2.6 2.4h-2.8c-1 0-1.6-.6-1.6-1.4 0-.7.6-1.2 1.8-1z" />
    </>
  ),
  icecore: (
    <>
      <path d="M12 3.8l6.4 4v8.4L12 20.2l-6.4-4V7.8l6.4-4z" />
      <path d="M12 8.4l3 1.9v3.9L12 16l-3-1.8v-3.9l3-1.9z" opacity="0.7" />
    </>
  ),
  /* ---------------- items: reagents ---------------- */
  /* a skein of string, tied across the middle. A single ring was a
     balloon; a figure of eight was a pair of spectacles. */
  coil: (
    <>
      <ellipse cx="12" cy="11.8" rx="4.6" ry="7.8" />
      <rect x="6.2" y="9.8" width="11.6" height="4.2" rx="1.4" />
    </>
  ),
  /* the block with a bow drawn through it, so it reads as something you
     rub a bow on rather than a bar of soap */
  rosin: (
    <>
      <path d="M2.6 20.2C7.4 16.2 14 9.8 20.8 4.4" />
      <rect x="8.4" y="9.2" width="7.2" height="5.6" rx="1.4" transform="rotate(-40 12 12)" />
    </>
  ),
  bottle: (
    <>
      <path d="M10.4 3.8h3.2v3.4c0 1 2 2.4 2 4.6v6.4a1.8 1.8 0 01-1.8 1.8h-3.6a1.8 1.8 0 01-1.8-1.8v-6.4c0-2.2 2-3.6 2-4.6V3.8z" />
      <path d="M8.4 13.6h7.2" opacity="0.75" />
    </>
  ),
  fork: (
    <>
      <path d="M9.2 4v7.2a2.8 2.8 0 105.6 0V4" />
      <path d="M12 14v6.2" />
    </>
  ),
  /* ---------------- items: relics ---------------- */
  umbrella: (
    <>
      <path d="M3.8 12.6c0-4.6 3.7-8.2 8.2-8.2s8.2 3.6 8.2 8.2H3.8z" />
      <path d="M12 12.6v5.4a2.1 2.1 0 01-4.2 0" />
      <path d="M12 4.4V2.9" opacity="0.75" />
    </>
  ),
  /* the bell's tongue, hanging out below the open mouth of the bell it
     was taken from. Drawn shut inside the bell it was just a handbell. */
  clapper: (
    <>
      <path d="M6 15.2c0-4.6 2-7.4 6-8.2 4 .8 6 3.6 6 8.2" />
      <path d="M5 15.2h14" />
      <path d="M12 15.2v2.5" />
      <circle cx="12" cy="19.6" r="1.9" />
    </>
  ),
  wishslip: (
    <>
      <rect x="6.8" y="6.6" width="10.4" height="12.8" rx="1.8" />
      <circle cx="12" cy="9.6" r="1.1" />
      <path d="M9.4 4.2l2.6 3.2 2.6-3.2" opacity="0.8" />
    </>
  ),
  /* a whale's scale: pointed at both ends, growth ridges near the edge.
     The dome it used to be was the third bell-shaped cell in the tray. */
  scale: (
    <>
      <path d="M12 3.2c4.6 3 6.9 5.9 6.9 8.8s-2.3 5.8-6.9 8.8c-4.6-3-6.9-5.9-6.9-8.8S7.4 6.2 12 3.2z" />
      <path d="M7.6 14.4c2.8-2 5.9-2 8.8 0M8.8 17.6c2-1.4 4.4-1.4 6.4 0" opacity="0.7" />
    </>
  ),
  collar: (
    <>
      <ellipse cx="12" cy="10.4" rx="6.6" ry="4.6" />
      <rect x="10.3" y="4.2" width="3.4" height="2.6" rx="0.8" />
      <rect x="9.5" y="16.2" width="5" height="3.9" rx="1.2" />
    </>
  ),
  /* a page of music with the bottom burnt off */
  burntpage: (
    <>
      <path d="M6.4 4.4h11.2v9.8l-1.9 1.3-2.1-.9-2.3 1.5-2.3-1.1-1.4 1.1-1.2-1.3V4.4z" />
      <circle cx="10" cy="9.4" r="1.35" />
      <path d="M11.35 9.4V5.9l3.1 1.1" />
    </>
  ),
  oldmap: (
    <>
      <path d="M4 6.8l5-1.8 6 2 5-1.8v11.4l-5 1.8-6-2-5 1.8V6.8z" />
      <path d="M9 5v13.2M15 7v13.2" opacity="0.5" />
      <path d="M11.2 10.6l2.4 2.4M13.6 10.6l-2.4 2.4" />
    </>
  ),
  token: (
    <>
      <rect x="7.4" y="4.6" width="9.2" height="14.8" rx="4.6" />
      <circle cx="12" cy="8" r="1.1" />
      <path d="M9.8 12.4h4.4M12 12.4v4" opacity="0.8" />
    </>
  ),

  /* ---------------- instrument silhouettes ---------------- */
  lute: (
    <>
      <circle cx="9.2" cy="15.2" r="5.2" />
      <circle cx="9.2" cy="15.2" r="1.6" opacity="0.7" />
      <path d="M12.7 11.4l6.6-6.6" />
      <path d="M17.6 3.2l2.9 2.9" />
    </>
  ),
  /* held at an angle, the way it is played — flat it read as a pill with
     three dots and lost against the drum and the accordion */
  flute: (
    <g transform="rotate(-36 12 12)">
      <rect x="2.4" y="9.2" width="19.2" height="5.6" rx="2.8" />
      <path d="M6.4 9.2v5.6" opacity="0.6" />
      <circle cx="10.4" cy="12" r="0.9" />
      <circle cx="13.6" cy="12" r="0.9" />
      <circle cx="16.8" cy="12" r="0.9" />
    </g>
  ),
  horn: (
    <>
      <path d="M7.6 18.4a6.2 6.2 0 116-10" />
      <path d="M13.6 5.2l6 3.2-6 3.2V5.2z" />
    </>
  ),
  box: (
    <>
      <rect x="2.9" y="5.6" width="4.2" height="12.8" rx="1.3" />
      <rect x="16.9" y="5.6" width="4.2" height="12.8" rx="1.3" />
      <path d="M9.4 6.6v10.8M12 5.9v12.2M14.6 6.6v10.8" opacity="0.85" />
      <path d="M7.1 12h9.8" opacity="0.5" />
    </>
  ),
  keys: (
    <>
      <rect x="3.6" y="8.2" width="16.8" height="7.6" rx="1.4" />
      <path d="M7.4 8.2v7.6M11 8.2v7.6M14.6 8.2v7.6M18.2 8.2v7.6" opacity="0.8" />
    </>
  ),
  zither: (
    <>
      <path d="M3.6 15.8L7.2 8.2h9.6l3.6 7.6H3.6z" />
      <path d="M7.4 10.8h9.2M6.2 13.4h11.6" opacity="0.8" />
    </>
  ),
  bow: (
    <>
      <path d="M11.4 3.8v9.4" />
      <path d="M9.2 5.4h4.4" />
      <ellipse cx="11.4" cy="16.4" rx="4.3" ry="3.6" />
      <path d="M3.9 12.4c5 .4 10.4 1.6 16.2 3.6" />
    </>
  ),
  harp: (
    <>
      <path d="M18 4.6c-7 1.6-11 7-11.4 14.8" />
      <path d="M18 4.6v14.8M6.6 19.4H18" />
      <path d="M9.8 19.4v-6M12.4 19.4v-8.4M15 19.4v-10.4" opacity="0.8" />
    </>
  ),
  lamella: (
    <>
      <rect x="4.6" y="4.8" width="14.8" height="14.4" rx="2.6" />
      <path d="M6.6 15.4h10.8" />
      <path d="M8.2 15.4V8.8M10.8 15.4V7.6M13.4 15.4V7.6M16 15.4v-6.6" opacity="0.85" />
    </>
  ),
  drum: (
    <>
      <ellipse cx="12" cy="7.6" rx="7.4" ry="2.9" />
      <path d="M4.6 7.6v8.6c0 1.6 3.3 2.9 7.4 2.9s7.4-1.3 7.4-2.9V7.6" />
      <path d="M6.8 9.8l2.8 6.4M17.2 9.8l-2.8 6.4" opacity="0.75" />
    </>
  ),

  /* ---------------- moods, for songs ---------------- */
  mood_sea: (
    <>
      <path d="M3.6 10.4c2-1.8 3.6-1.8 5.6 0s3.6 1.8 5.6 0 3.6-1.8 5.6 0" />
      <path d="M3.6 15.4c2-1.8 3.6-1.8 5.6 0s3.6 1.8 5.6 0 3.6-1.8 5.6 0" />
    </>
  ),
  mood_wind: (
    <>
      <path d="M3.6 9.2h9.6a2.6 2.6 0 10-.8-2.8" />
      <path d="M4.8 13h12.6a2.6 2.6 0 11.6 2.9" />
      <path d="M6.6 17h5" opacity="0.8" />
    </>
  ),
  mood_night: (
    <>
      <path d="M18 14.2A7 7 0 019.8 6 7.6 7.6 0 1018 14.2z" />
      <path d="M6.2 5.4l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7L3.8 7.8l1.7-.7.7-1.7z" opacity="0.85" />
    </>
  ),
  mood_floral: (
    <>
      <circle cx="12" cy="7.8" r="2.7" />
      <circle cx="16.3" cy="10.9" r="2.7" />
      <circle cx="14.6" cy="16" r="2.7" />
      <circle cx="9.4" cy="16" r="2.7" />
      <circle cx="7.7" cy="10.9" r="2.7" />
    </>
  ),
  mood_desert: (
    <>
      <circle cx="8" cy="7.2" r="2.8" />
      <path d="M2.8 17.6c3.4 0 4.6-4.4 8-4.4s4.6 4.4 8 4.4" />
      <path d="M2.8 20.4h18.4" opacity="0.7" />
    </>
  ),
  mood_cloud: (
    <>
      <path d="M6.8 16.8h10a3.4 3.4 0 00.4-6.8 5 5 0 00-9.6-.8 3.8 3.8 0 00-.8 7.6z" />
    </>
  ),
  mood_ice: (
    <>
      <path d="M12 3.6v16.8M4.7 7.8l14.6 8.4M4.7 16.2l14.6-8.4" />
      <path d="M9.8 5.8L12 3.6l2.2 2.2M9.8 18.2L12 20.4l2.2-2.2" opacity="0.8" />
    </>
  ),
  mood_ruin: (
    <>
      <path d="M6.4 19.6V7.6h3.2v12M14.4 19.6v-8h3.2v8" />
      <path d="M4.6 19.6h14.8" />
    </>
  ),
  mood_rain: (
    <>
      <path d="M7 12.6h9.6a3 3 0 00.4-6 4.6 4.6 0 00-8.8-.8A3.4 3.4 0 007 12.6z" />
      <path d="M8.4 15.4l-1 3M12 15.4l-1 3M15.6 15.4l-1 3" />
    </>
  ),
  mood_sky: (
    <>
      <circle cx="16.8" cy="7" r="2.6" />
      <path d="M3.6 14.8c2.2-2.8 4-2.8 6 0 2-2.8 3.8-2.8 6 0" />
      <path d="M5.6 19.2h12" opacity="0.6" />
    </>
  ),
  mood_forest: (
    <>
      <path d="M8.6 20v-3M8.6 4.8l3.6 7H5l3.6-7z" />
      <path d="M8.6 9.6l4.2 6.2H4.4l4.2-6.2" opacity="0.85" />
      <path d="M16.6 20v-2.4M16.6 9.6l2.8 5.6h-5.6l2.8-5.6z" />
    </>
  ),
  mood_city: (
    <>
      <path d="M3.6 18.6h16.8" />
      <path d="M5 18.6v-6l3.4-2.6 3.4 2.6v6" />
      <path d="M12 18.6V10l3.2-2.4 3.2 2.4v8.6" />
    </>
  ),
  mood_holy: (
    <>
      <path d="M12 3.4c1.8 2.4 1.8 4.2 0 5.6-1.8-1.4-1.8-3.2 0-5.6z" />
      <path d="M6.6 19.8v-6.6L12 9.6l5.4 3.6v6.6" />
      <path d="M4.8 19.8h14.4" />
    </>
  ),
  mood_melancholy: (
    <>
      <path d="M12 4.2c3.1 4.1 4.7 6.6 4.7 8.8a4.7 4.7 0 11-9.4 0c0-2.2 1.6-4.7 4.7-8.8z" />
      <path d="M9.8 13.6c0 1.4 1 2.4 2.4 2.4" opacity="0.7" />
    </>
  ),
  mood_festive: (
    <>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 3.8v3.2M12 17v3.2M3.8 12h3.2M17 12h3.2M6.4 6.4l2.2 2.2M15.4 15.4l2.2 2.2M17.6 6.4L15.4 8.6M8.6 15.4l-2.2 2.2" />
    </>
  ),

  /* ---------------- upgrades ---------------- */
  coffer: (
    <>
      <rect x="3.8" y="8" width="16.4" height="10.6" rx="1.6" />
      <path d="M3.8 12h16.4M12 12v6.6" />
      <path d="M6.6 8V6.8a1.8 1.8 0 011.8-1.8h7.2a1.8 1.8 0 011.8 1.8V8" />
    </>
  ),
  apprentice: (
    <>
      <circle cx="12" cy="7.2" r="3" />
      <path d="M6.6 20v-3.2a5.4 5.4 0 0110.8 0V20" />
    </>
  ),
  lantern: (
    <>
      <path d="M8 7.6a4 4 0 018 0" />
      <rect x="6.6" y="7.6" width="10.8" height="11.8" rx="2" />
      <path d="M12 11v4.8" />
    </>
  ),
  journal: (
    <>
      <path d="M5.6 4.8h9.8a2 2 0 012 2v12.4H7.6a2 2 0 01-2-2V4.8z" />
      <path d="M5.6 16.4h11.8" />
      <path d="M8.6 8h6.2M8.6 11h4.4" opacity="0.75" />
    </>
  ),
  pass: (
    <>
      <rect x="3.6" y="7" width="16.8" height="10" rx="2" />
      <path d="M8.4 7v10" strokeDasharray="2 1.6" />
      <circle cx="14.8" cy="12" r="2.2" />
    </>
  ),
  cushion: (
    <>
      <rect x="4.6" y="8.4" width="14.8" height="4.6" rx="2.3" />
      <path d="M6.8 13v6.4M17.2 13v6.4" />
    </>
  ),
  dice: (
    <>
      <rect x="4.6" y="4.6" width="14.8" height="14.8" rx="3" />
      <circle cx="9" cy="9" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="15" cy="15" r="1" />
    </>
  ),
  whistle: (
    <>
      <path d="M4.6 9.4h10.6a4.6 4.6 0 010 9.2H9.2a4.6 4.6 0 01-4.6-4.6V9.4z" />
      <circle cx="15.2" cy="14" r="1.4" />
      <path d="M6.6 9.4V6.6" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="14.2" r="5.4" />
      <path d="M9.6 9l2.4-4.6L14.4 9" />
    </>
  ),
  cart: (
    <>
      <path d="M3.8 6.6h2.6l2.4 9h9" />
      <path d="M8 9.4h11.4l-1.4 4.6H9.2" />
      <circle cx="10.6" cy="18.8" r="1.7" />
      <circle cx="17.4" cy="18.8" r="1.7" />
    </>
  ),
  cloak: (
    <>
      <path d="M12 4.4l4.6 2.4 2.2 12.6H5.2L7.4 6.8 12 4.4z" />
      <path d="M12 4.4v15" opacity="0.7" />
    </>
  ),

  /* ---------------- category tabs & fallbacks ---------------- */
  crate: (
    <>
      <path d="M4.4 8.6l7.6-3.2 7.6 3.2v7.2L12 19l-7.6-3.2V8.6z" />
      <path d="M4.4 8.6L12 11.8l7.6-3.2M12 11.8V19" />
    </>
  ),
  score: (
    <>
      <rect x="6" y="4.4" width="12" height="15.2" rx="1.6" />
      <path d="M9 8.2h6M9 10.8h6" opacity="0.75" />
      <circle cx="10.2" cy="15.6" r="1.5" />
      <path d="M11.7 15.6v-4.2l2.9 1" />
    </>
  ),
  /* the 行装 tab: a knapsack. The boot it used to be depicted nothing. */
  pack: (
    <>
      <path d="M5.6 11.6c0-2.9 2.5-4.8 6.4-4.8s6.4 1.9 6.4 4.8v6c0 1.6-1.3 2.9-2.9 2.9H8.5c-1.6 0-2.9-1.3-2.9-2.9v-6z" />
      <path d="M9.4 7.2V5.7c0-1.4 1.2-2.5 2.6-2.5s2.6 1.1 2.6 2.5v1.5" />
      <path d="M9 14.8h6" />
    </>
  ),
  boot: (
    <>
      <path d="M8 4.6h3.6v7.2c0 1.4 1.4 2.1 3.4 2.5 2.6.6 4 1.4 4 3v1.3a1.6 1.6 0 01-1.6 1.6H9.6A1.6 1.6 0 018 18.6V4.6z" />
      <path d="M11.6 15.4h7.4" opacity="0.7" />
    </>
  ),
  thing: (
    <>
      <path d="M8.4 4.8h7.2l1.6 4.2a6 6 0 11-10.4 0l1.6-4.2z" />
      <path d="M8.4 9h7.2" opacity="0.7" />
    </>
  ),
};

export function Glyph({
  name,
  size = 26,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const g = GLYPHS[name] ?? GLYPHS.thing;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...PEN} aria-hidden>
      {g}
    </svg>
  );
}
