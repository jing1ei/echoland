/* ============================================================
   STALL VISITORS — content barrel

   registry.ts    who may turn up, and where
   values.ts      how often, how long, how loud
   art.ts         the silhouette
   text.ts        the one tip, and why there is no narration
   conditions.ts  gates in, and the `guest` seam out
   scenes.ts      what happens if one of them ever speaks
   triggers.ts    the odds of that

   Deliberately no audio.ts, and (since the caption was cut) almost no
   text: a figure that arrives with a sound effect or a line of narration
   is an announcement, and announcements are the opposite of this
   feature. The silhouette is the whole message.
   ============================================================ */

export { VISITOR_SPECS, VISITOR_SPEC_MAP, type VisitorSpec } from './registry';
export { VISITOR_VALUES, type VisitorValues } from './values';
export { VISITOR_ART, type VisitorArt, type VisitorProp } from './art';
export { VISITOR_UI_TEXT } from './text';
export { VISITOR_GATES, whileGuest, guestAnd } from './conditions';
export { VISITOR_CONTENT_SCENES } from './scenes';
export { VISITOR_CONTENT_TRIGGERS } from './triggers';
