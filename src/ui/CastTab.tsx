import { useMemo } from 'react';
import { useGame } from '../game/store';
import { CHARACTERS, tierIndex, tierLabel } from '../game/story';
import { closeness, castNote } from '../game/systems/bond';
import { enmityIndex, enmityLabel, enmityOf, grudgeLine } from '../game/systems/enmity';
import { TOWN_MAP } from '../content/towns';
import { missing, probeTriggers, type Cond } from '../game/story';
import Portrait from '../render/PortraitCanvas';
import { Chip, Empty } from './bits';

/* ============================================================
   The cast page

   Affection is a hidden number and stays hidden — no score, no bar, no
   "12 / 26". What a player actually wants to know is: does this person
   like me yet, and what would move that. So each row shows the
   relationship word, one line about which way it is drifting
   (content/bond/text.ts), and — only when it is knowable — the one
   condition still standing between them and the next scene with that
   person.

   Grudges are the same, one axis over. They are not the bottom of the
   affection scale, so they get their own word and their own line rather
   than dragging the relationship chip down: 熟人 who is also 怀恨 is a
   real and interesting state, and the card is allowed to say both. Still
   no numbers, and nothing at all when the slate is clean.

   People you have not met are drawn as silhouettes with no name. The
   roster length is itself a mild spoiler ("there are eight people out
   there"), which reads as promise rather than leak.
   ============================================================ */

/** pull every `who` mentioned anywhere in a condition tree */
function whoIn(c: Cond | undefined, out = new Set<string>()): Set<string> {
  if (!c) return out;
  if (c.k === 'all' || c.k === 'any') c.of.forEach((x) => whoIn(x, out));
  else if (c.k === 'not') whoIn(c.of, out);
  else if ('who' in c && typeof c.who === 'string') out.add(c.who);
  return out;
}

const CHANCE_WORD = (p: number) =>
  p >= 0.999 ? '一定会遇上' : p >= 0.75 ? '多半会遇上' : p >= 0.4 ? '碰巧才遇上' : '很难得';

export default function CastTab() {
  const { state } = useGame();
  const story = state.story;

  /* what is the next unseen bond beat for each person, and why hasn't it
     happened yet — computed off the same trigger table the router uses,
     so this page can never drift out of sync with the actual rules */
  const nextFor = useMemo(() => {
    const ctx = { now: Date.now(), hook: 'collect' as const };
    const probes = (['collect', 'open', 'arrive', 'node'] as const).flatMap((hook) =>
      probeTriggers(state, { now: ctx.now, hook }),
    );

    type Hint = { eligible: boolean; why: string[]; chance: number };
    const out: Record<string, Hint> = {};
    probes
      .filter((p) => p.trigger.line === 'bond' && p.reason !== '已经演过' && p.reason !== '只触发一次')
      .forEach((p) => {
        const why = p.eligible ? [] : missing(state, p.trigger.when, ctx).filter(Boolean).slice(0, 2);
        /* A trigger we cannot describe is worse than silence — it produces
           "还差：一点时间" on every row, which teaches the player nothing.
           So an eligible probe wins outright, and otherwise only a probe
           with something real to say may claim the slot. */
        if (!p.eligible && why.length === 0) return;
        whoIn(p.trigger.when).forEach((who) => {
          const cur = out[who];
          if (cur && (cur.eligible || !p.eligible)) return;
          out[who] = { eligible: p.eligible, why, chance: p.trigger.chance };
        });
      });
    return out;
  }, [state]);

  const met = CHARACTERS.filter((c) => story.met[c.id]);
  const unmet = CHARACTERS.length - met.length;

  if (met.length === 0)
    return (
      <Empty>
        还没认识谁。摆摊久一点，总有人会站下来听完一整首。
      </Empty>
    );

  return (
    <div className="space-y-3">
      {met.map((c) => {
        const bond = story.bond[c.id] ?? 0;
        const ti = tierIndex(c, bond);
        const hate = enmityOf(story, c.id);
        const hi = enmityIndex(c, hate);
        const nx = nextFor[c.id];
        return (
          <div
            key={c.id}
            className="relative overflow-hidden rounded-2xl border border-[rgba(43,36,25,0.13)] bg-[rgba(255,253,246,0.62)]"
          >
            <div className="flex gap-3 p-3.5">
              {/* portrait chip — same renderer as the story layer, so the
                  face here is literally the face you talked to */}
              <div className="relative h-[92px] w-[66px] flex-none overflow-hidden rounded-[14px] bg-[rgba(43,36,25,0.08)]">
                <div className="absolute left-1/2 top-1 -translate-x-1/2">
                  <Portrait look={c.look} as="calm" height={124} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <h4 className="display text-[16px] font-semibold leading-tight text-[#2b2419]">{c.name}</h4>
                  <span className="ui text-[10px] text-[#8a7f6c]">{c.nameEn}</span>
                </div>
                <p className="ui mt-0.5 text-[11px] text-[#6f6350]">
                  {c.role}
                  {c.home && TOWN_MAP[c.home] ? ` · ${TOWN_MAP[c.home].name}` : ''}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Chip tone={ti >= 4 ? 'wine' : ti >= 2 ? 'brass' : 'ghost'}>{tierLabel(c, bond)}</Chip>
                  {/* the second axis, and only when there is one */}
                  {hi > 0 && <Chip tone="wine">{enmityLabel(c, hate)}</Chip>}
                  {/* where the score used to be: one sentence, no number */}
                  <span className="ui text-[10.5px] leading-snug text-[#8a7f6c]">
                    {closeness(c, bond, ti)}
                  </span>
                </div>

                {hi > 0 && (
                  <p className="ui mt-1.5 text-[10.5px] leading-snug text-[#8b6a6a]">
                    {grudgeLine(c, hate, ti)}
                  </p>
                )}
              </div>
            </div>

            <p className="ui border-t border-[rgba(43,36,25,0.08)] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#6b6050]">
              {c.blurb}
            </p>

            {/* the honest bit: what is still in the way */}
            {nx && (
              <div className="border-t border-[rgba(43,36,25,0.08)] bg-[rgba(184,135,63,0.07)] px-3.5 py-2.5">
                {nx.eligible ? (
                  <p className="ui text-[11.5px] text-[#7a5a1e]">
                    还有话要说 · {CHANCE_WORD(nx.chance)}
                  </p>
                ) : (
                  <p className="ui text-[11.5px] leading-relaxed text-[#6f6350]">
                    下次见面还差：{nx.why.join('、')}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <p className="ui px-1 text-[10.5px] text-[#8a7f6c]">{castNote()}</p>

      {unmet > 0 && (
        <div className="flex items-center gap-2.5 rounded-[16px] border border-dashed border-[rgba(43,36,25,0.18)] px-3.5 py-3">
          <div className="flex gap-1">
            {Array.from({ length: Math.min(4, unmet) }).map((_, i) => (
              <span
                key={i}
                className="h-6 w-4 rounded-t-full rounded-b-[3px] bg-[rgba(43,36,25,0.16)]"
              />
            ))}
          </div>
          <p className="ui text-[11.5px] text-[#6f6350]">
            路上还有 {unmet} 个人没打过照面。
          </p>
        </div>
      )}
    </div>
  );
}
