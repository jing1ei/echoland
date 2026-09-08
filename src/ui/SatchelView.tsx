import { useMemo, useState } from 'react';
import { useGame } from '../game/store';
import { INSTRUMENTS, ITEM_MAP, UPGRADE_MAP, UPGRADES } from '../content/gear';
import { itemArt } from '../content/items/art';
import { upgradeArt } from '../content/upgrades/art';
import { songArt } from '../content/songs/art';
import { SATCHEL_TABS, SATCHEL_TEXT, type SatchelTabId } from '../content/satchel';
import { isMine, ownedSongs } from '../game/systems/songs';
import { INSTRUMENT_MAP } from '../content/instruments';
import { CATEGORY_TEXT, PROFICIENCY_TEXT, PROFICIENCY_VALUES } from '../content/proficiency';
import { PERFORMANCE_TEXT } from '../content/performance';
import { categoryBonus, categoryOf, effectiveProf, ownProf, tierOf } from '../game/systems/proficiency';
import { performancePay, practiceForecast } from '../game/systems/performance';
import { spiritStatus } from '../game/systems/spirits';
import { fmtNum } from '../game/engine';
import { Card, Chip, Icon, Meter } from './bits';
import { Glyph } from './Glyph';

/* ============================================================
   SATCHEL — a tray, not a ledger

   The bag used to be a scroll of cards: every object spent a headline,
   a chip, a sentence and a button, whether or not you cared about it.
   Fifteen things meant four screens of reading to answer "do I still
   have that shell".

   Now it is what a bag looks like when you tip it out: four icon tabs,
   a grid of drawings, a number in the corner of the ones you have
   several of. Nothing writes itself out until you tap it — then one
   slab tells you what it is and what you can do with it.

   The other half of this screen's job is what it *stopped* showing.
   名气, 灵感 and 闲暇 lived here as a 2×2 of stat boxes; they now live
   on the explore screen, next to the things they buy. The bag reports
   coin, because coin is the one number you check before you go out.
   ============================================================ */

type Cell = {
  id: string;
  glyph: string;
  tint: string;
  name: string;
  /** printed at the corner — how many you carry */
  n?: number;
  /** a small filled corner mark instead of a count: in hand / in play */
  mark?: boolean;
};

export default function SatchelView() {
  const { state, sell, setStrategy } = useGame();
  const [tab, setTab] = useState<SatchelTabId>('things');
  const [pick, setPick] = useState<string | null>(null);
  const [flash, setFlash] = useState('');

  const things = useMemo(
    () =>
      Object.entries(state.items)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => {
          const it = ITEM_MAP[id];
          const art = itemArt(id, it?.kind ?? 'trinket');
          return { id, glyph: art.glyph, tint: art.tint, name: it?.name ?? id, n } as Cell;
        }),
    [state.items],
  );

  const instruments = useMemo(
    () =>
      /* an instrument already carries its own art (content/instruments/art.ts,
         assembled onto the object) — the tray just reads it */
      INSTRUMENTS.filter((i) => state.instruments.includes(i.id)).map(
        (i) =>
          ({
            id: i.id,
            glyph: i.art.silhouette,
            tint: i.art.accent,
            name: i.name,
            mark: i.id === state.instrument,
          }) as Cell,
      ),
    [state.instruments, state.instrument],
  );

  const songs = useMemo(
    () =>
      ownedSongs(state).map((s) => {
        const art = songArt(s);
        return {
          id: s.id,
          glyph: art.glyph,
          tint: art.tint,
          name: s.name,
          mark: state.repertoire.includes(s.id),
        } as Cell;
      }),
    [state.songs, state.composed, state.repertoire],
  );

  const kit = useMemo(
    () =>
      UPGRADES.filter((u) => state.upgrades.includes(u.id)).map((u) => {
        const art = upgradeArt(u.id);
        return { id: u.id, glyph: art.glyph, tint: art.tint, name: u.name } as Cell;
      }),
    [state.upgrades],
  );

  const trays: Record<SatchelTabId, Cell[]> = { things, instruments, songs, kit };
  const cells = trays[tab];
  const meta = SATCHEL_TABS.find((t) => t.id === tab)!;
  const worth = things.reduce((a, c) => a + (ITEM_MAP[c.id]?.value ?? 0) * (c.n ?? 1), 0);

  const swap = (id: SatchelTabId) => {
    setTab(id);
    setPick(null);
    setFlash('');
  };

  return (
    <div className="relative h-full overflow-y-auto no-scrollbar bg-[#f4ecdc]">
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply grain" />
      <div className="relative px-5 pt-[max(16px,env(safe-area-inset-top))] pb-nav">
        {/* -------- head: the title, and the only number in here -------- */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">{SATCHEL_TEXT.kicker}</p>
            <h1 className="display text-[26px] font-semibold leading-tight text-[#2b2419]">
              {SATCHEL_TEXT.title}
            </h1>
          </div>
          <div
            className="flex flex-none items-center gap-1.5 rounded-full border border-[rgba(184,135,63,0.35)] bg-[rgba(255,253,246,0.72)] px-3 py-1.5"
            data-purse="coin"
          >
            <Icon name="coin" size={14} className="text-[#8a6220]" />
            <span className="display tnum text-[16px] font-semibold leading-none text-[#2b2419]">
              {fmtNum(state.coin)}
            </span>
            <span className="ui text-[10.5px] text-[#6f6350]">{SATCHEL_TEXT.coinUnit}</span>
          </div>
        </div>

        {/* -------- tabs: pictures, in a row -------- */}
        <div className="mt-3.5 flex gap-1.5">
          {SATCHEL_TABS.map((t) => {
            const on = t.id === tab;
            const count = trays[t.id].length;
            return (
              <button
                key={t.id}
                onClick={() => swap(t.id)}
                aria-label={t.label}
                aria-pressed={on}
                data-tray-tab={t.id}
                className={`relative flex h-12 flex-1 items-center justify-center rounded-2xl border transition-all active:scale-[0.97] ${
                  on
                    ? 'border-[rgba(184,135,63,0.7)] bg-[rgba(217,174,99,0.2)] text-[#7a5418] shadow-[0_6px_16px_-12px_rgba(168,116,40,0.9)]'
                    : 'border-[rgba(43,36,25,0.13)] bg-[rgba(255,253,246,0.6)] text-[#8a8070]'
                }`}
              >
                <Glyph name={t.glyph} size={on ? 25 : 23} />
                {count > 0 && (
                  <span
                    className={`ui tnum absolute right-2 top-1.5 text-[9px] leading-none ${
                      on ? 'text-[#8a6220]' : 'text-[#9a9080]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* -------- the tray -------- */}
        {cells.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[rgba(43,36,25,0.2)] px-4 py-8 text-center">
            <p className="ui text-[12.5px] leading-relaxed text-[#6a5f4c]">{meta.empty}</p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {cells.map((c) => {
              const on = pick === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setPick(on ? null : c.id)}
                  aria-label={c.name}
                  data-cell={c.id}
                  className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-[rgba(255,253,246,0.72)] transition-all active:scale-[0.95] ${
                    on
                      ? 'border-[rgba(184,135,63,0.85)] shadow-[0_0_0_2px_rgba(217,174,99,0.45),0_6px_16px_-10px_rgba(168,116,40,0.9)]'
                      : 'border-[rgba(43,36,25,0.12)]'
                  }`}
                >
                  {/* a breath of the object's own colour behind it, so two
                      drawings of the same waves still tell each other apart
                      at a glance without either of them being selected */}
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ background: c.tint, opacity: on ? 0.2 : 0.14 }}
                  />
                  <span style={{ color: c.tint }}>
                    <Glyph name={c.glyph} size={30} />
                  </span>
                  {/* how many you have, on a small pale plate so the digit
                      never has to fight the drawing behind it. One reads
                      faint, several read solid — that is the whole signal. */}
                  {c.n !== undefined && (
                    <span className="ui tnum absolute bottom-[2px] right-[2px] min-w-[16px] rounded-[6px] border border-[rgba(43,36,25,0.1)] bg-[#fffdf6] px-[3px] py-[1px] text-center text-[11px] font-semibold leading-none text-[#443a2a]">
                      {c.n}
                    </span>
                  )}
                  {/* in hand / in play — put at the *top* corner, because the
                      bottom corner is where counts live and a lone dot down
                      there looked like a badge that failed to print. */}
                  {c.mark && c.n === undefined && (
                    <span className="absolute right-[5px] top-[5px] h-[7px] w-[7px] rounded-full bg-[#a8742b]" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* -------- the slab: nothing until you tap -------- */}
        <div className="mt-3">
          {pick === null ? (
            <p className="ui px-1 text-[11.5px] leading-relaxed text-[#8a8070]">
              {cells.length === 0 ? '' : meta.hint}
              {tab === 'things' && cells.length > 0 && worth > 0 && (
                <span className="ml-1 text-[#9a9080]">{SATCHEL_TEXT.worth(fmtNum(worth))}</span>
              )}
            </p>
          ) : tab === 'things' ? (
            <ThingSlab
              id={pick}
              n={things.find((c) => c.id === pick)?.n ?? 1}
              onSell={() => setFlash(sell(pick).msg)}
            />
          ) : tab === 'instruments' ? (
            <InstrumentCard id={pick} />
          ) : tab === 'songs' ? (
            <SongSlab
              id={pick}
              onToggle={() => {
                const cur = state.repertoire;
                if (cur.includes(pick)) {
                  if (cur.length === 1) {
                    setFlash(SATCHEL_TEXT.lastSong);
                    return;
                  }
                  setStrategy({ repertoire: cur.filter((x) => x !== pick) });
                } else {
                  setStrategy({
                    repertoire: cur.length >= 3 ? [...cur.slice(1), pick] : [...cur, pick],
                  });
                }
              }}
            />
          ) : (
            <KitSlab id={pick} />
          )}
        </div>

        {flash && (
          <p className="ui mt-2.5 rounded-xl bg-[rgba(184,135,63,0.12)] px-3 py-2 text-[12px] text-[#8a6220]">
            {flash}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   One tapped object
   ------------------------------------------------------------ */

function ThingSlab({ id, n, onSell }: { id: string; n: number; onSell: () => void }) {
  const { state } = useGame();
  const it = ITEM_MAP[id];
  if (!it) return null;
  const art = itemArt(id, it.kind);
  /* the same price the engine will actually pay, so the button never lies */
  const price = Math.round(it.value * (1 + Math.min(1.2, state.renown / 400)));

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span style={{ color: art.tint }} className="flex-none pt-[2px]">
          <Glyph name={art.glyph} size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="display truncate text-[15px] font-semibold text-[#2b2419]">{it.name}</h4>
            {n > 1 && <Chip tone="ghost">×{n}</Chip>}
            <Chip tone={it.kind === 'relic' ? 'wine' : it.kind === 'reagent' ? 'moss' : 'ink'}>
              {SATCHEL_TEXT.kind[it.kind]}
            </Chip>
          </div>
          <p className="ui mt-1 text-[12px] leading-relaxed text-[#6b6050]">{it.desc}</p>
        </div>
        {it.value > 0 ? (
          <button onClick={onSell} className="ui btn btn-quiet h-9 flex-none px-3 text-[12px]">
            {SATCHEL_TEXT.sell(fmtNum(price))}
          </button>
        ) : (
          <span className="ui flex-none pt-2 text-[11px] text-[#8a8070]">{SATCHEL_TEXT.priceless}</span>
        )}
      </div>
      {it.value === 0 && (
        <p className="ui mt-1.5 border-t border-[rgba(43,36,25,0.1)] pt-1.5 text-[11px] text-[#8a8070]">
          {SATCHEL_TEXT.pricelessNote}
        </p>
      )}
    </Card>
  );
}

function SongSlab({ id, onToggle }: { id: string; onToggle: () => void }) {
  const { state } = useGame();
  const song = ownedSongs(state).find((s) => s.id === id);
  if (!song) return null;
  const art = songArt(song);
  const playing = state.repertoire.includes(id);
  const mul = Object.entries(song.mul).filter(([, v]) => (v ?? 1) !== 1);

  return (
    <Card active={playing}>
      <div className="flex items-start gap-3">
        <span style={{ color: art.tint }} className="flex-none pt-[2px]">
          <Glyph name={art.glyph} size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="display truncate text-[15px] font-semibold text-[#2b2419]">{song.name}</h4>
            {isMine(state, song.id) && <Chip tone="brass">{SATCHEL_TEXT.mine}</Chip>}
            {playing && <Chip tone="moss">{SATCHEL_TEXT.playing}</Chip>}
          </div>
          <p className="ui mt-1 text-[12px] leading-relaxed text-[#6b6050]">{song.desc}</p>
          {mul.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {mul.map(([k, v]) => (
                <Chip key={k} tone="ghost" className="tnum">
                  {MUL_LABEL[k] ?? k} +{Math.round(((v ?? 1) - 1) * 100)}%
                </Chip>
              ))}
            </div>
          )}
        </div>
        <button onClick={onToggle} className="ui btn btn-quiet h-9 flex-none px-3 text-[12px]">
          {playing ? SATCHEL_TEXT.drop : SATCHEL_TEXT.play}
        </button>
      </div>
    </Card>
  );
}

const MUL_LABEL: Record<string, string> = {
  coin: '铜板',
  insp: '灵感',
  leisure: '闲暇',
  renown: '名气',
  event: '奇遇',
};

function KitSlab({ id }: { id: string }) {
  const u = UPGRADE_MAP[id];
  if (!u) return null;
  const art = upgradeArt(id);
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span style={{ color: art.tint }} className="flex-none pt-[2px]">
          <Glyph name={art.glyph} size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="display truncate text-[15px] font-semibold text-[#2b2419]">{u.name}</h4>
            <Chip tone="moss">{u.effect}</Chip>
          </div>
          <p className="ui mt-1 text-[12px] leading-relaxed text-[#6b6050]">{u.desc}</p>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------
   One owned instrument, in detail

   There is deliberately no proficiency screen. Practice is not a tab you
   visit; it is what happened while you were away, and the place you go
   to look at your own things is the satchel. So the whole proficiency
   story — your own points, the permanent bonus the technique carries,
   what both are worth in coin, and whether something is living in the
   instrument — is told here, on the card for the object it belongs to.

   Every number is read back out of the same systems the economy uses,
   and every word comes from content/proficiency/text.ts.
   ------------------------------------------------------------ */

function InstrumentCard({ id }: { id: string }) {
  const { state, setStrategy } = useGame();
  const inst = INSTRUMENT_MAP[id];
  if (!inst) return null;

  const T = PROFICIENCY_TEXT.card;
  const V = PROFICIENCY_VALUES;
  const cat = categoryOf(id);
  const catText = cat ? CATEGORY_TEXT[cat] : undefined;

  const own = ownProf(state, id);
  const bonus = categoryBonus(state, cat);
  const eff = effectiveProf(state, id);
  const tier = tierOf(eff);
  const pay = performancePay(state, id);
  const forecast = practiceForecast(state, id);
  const spirit = spiritStatus(state, id);
  const held = id === state.instrument;
  const art = inst.art;

  const coinSkill = Math.round((pay.skill.coin - 1) * 100);
  const coinRare = Math.round((pay.rarity.coin - 1) * 100);
  const toNextMilestone = V.milestone - (own % V.milestone);

  return (
    <Card active={held}>
      <div className="flex items-start gap-3">
        <span style={{ color: art.accent }} className="flex-none pt-[2px]">
          <Glyph name={art.silhouette} size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="display truncate text-[15px] font-semibold text-[#2b2419]">{inst.name}</h4>
            {held && <Chip tone="brass">{T.inHand}</Chip>}
            <Chip tone={inst.rarity === 'myth' || inst.rarity === 'rare' ? 'wine' : 'ink'}>
              {PERFORMANCE_TEXT.rarity[inst.rarity] ?? inst.rarity}
            </Chip>
            {spirit && <Chip tone={spirit.stage === 'awake' ? 'wine' : 'moss'}>{spirit.label}</Chip>}
          </div>
          {catText && (
            <p className="ui mt-1 text-[11.5px] text-[#6b6050]">
              {catText.name} · {catText.examples}
            </p>
          )}
        </div>
        {!held && (
          <button
            onClick={() => setStrategy({ instrument: id })}
            className="ui btn btn-quiet h-9 flex-none px-3 text-[12px]"
          >
            {SATCHEL_TEXT.take}
          </button>
        )}
      </div>

      {/* the bar carries two facts: the dashed reach is what your hands
          manage, the solid part is what you personally practised */}
      <div className="mt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">
            {T.profLabel} · {tier.label}
          </span>
          <span className="display tnum text-[13px] font-semibold text-[#2b2419]">
            {eff.toFixed(eff >= 10 ? 0 : 1)}%
          </span>
        </div>
        <div className="mt-1.5">
          <Meter value={own} max={V.max} ghost={eff / V.max} tone="#8a6220" />
        </div>
        <p className="ui mt-1.5 text-[11px] text-[#6b6050]">
          {T.ownLabel} {own.toFixed(own >= 10 ? 0 : 1)}%
          {bonus > 0 && catText ? ` ＋ ${catText.name}${T.categoryLabel} ${bonus}%` : ''}
          {own >= V.max ? ` · ${T.masteredTag}` : ` · 再练 ${toNextMilestone.toFixed(1)} 点得 +${V.categoryBonus}% 同类底子`}
        </p>
      </div>

      {/* what the craft is worth, straight from the economy */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {coinSkill !== 0 && <span className="ui text-[11px] text-[#6a5f4c]">{T.earnHint(coinSkill)}</span>}
        {coinRare !== 0 && <span className="ui text-[11px] text-[#6a5f4c]">{T.rarityHint(coinRare)}</span>}
        {pay.novice < 1 && (
          <span className="ui text-[11px] text-[#8a5b4b]">
            {PERFORMANCE_TEXT.rates.novice} ×{pay.novice.toFixed(2)}
          </span>
        )}
      </div>

      <p className="ui mt-1.5 text-[11.5px] leading-relaxed text-[#6b6050]">
        {own <= 0
          ? T.untouched
          : forecast.mastered
            ? PERFORMANCE_TEXT.strategy.masteredNote(tier.label)
            : T.practiceHint(forecast.perHour.toFixed(2))}
      </p>

      {/* the spirit line: a hint before, a fact after */}
      {spirit && (
        <p className="ui mt-1.5 border-t border-[rgba(43,36,25,0.1)] pt-1.5 text-[11.5px] leading-relaxed text-[#7a5a63]">
          {spirit.stage === 'awake' ? T.spiritAwake : spirit.note}
        </p>
      )}

      {catText && bonus > 0 && (
        <p className="ui mt-1 text-[10.5px] text-[#8a8070]">{T.bonusHint(V.milestone, V.categoryBonus)}</p>
      )}
    </Card>
  );
}
