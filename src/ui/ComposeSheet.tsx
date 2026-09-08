import { useMemo, useState } from 'react';
import { useGame } from '../game/store';
import { OVERLOOK_MAP } from '../content/overlooks';
import type { MoodTag } from '../game/types';
import {
  COMPOSE_TEXT,
  COMPOSE_VALUES,
  FOCI,
  GRADE_MAP,
  type ComposeFocus,
  type ComposeGradeId,
} from '../content/compose';
import {
  availableMotifs,
  composeCost,
  composeLeisure,
  canCompose,
  titleSuggestions,
} from '../game/systems/compose';
import { Card, Chip, Divider, Sheet } from './bits';
import { moodZh } from './TravelMap';

/* ============================================================
   COMPOSE — the sheet

   Inspiration was a number that only events spent. This is where it
   becomes a song with your name on it: two motifs, one reason, one
   grade, one title you may overwrite. Everything numeric shown here is a
   *price*; the result is described in words, like every other song.
   ============================================================ */

const MUL_NAMES: Record<string, string> = {
  coin: '钱',
  insp: '灵感',
  leisure: '闲暇',
  renown: '名气',
  event: '奇遇',
};

export default function ComposeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, composeSong } = useGame();
  const motifsAll = useMemo(() => availableMotifs(state), [state.overlooks, state.scores]);

  const [grade, setGrade] = useState<ComposeGradeId>('fair');
  const [motifs, setMotifs] = useState<MoodTag[]>([]);
  const [focus, setFocus] = useState<ComposeFocus>('coin');
  const [seed, setSeed] = useState(() => Math.random());
  const [name, setName] = useState('');
  const [done, setDone] = useState<{ name: string; mul: Record<string, number | undefined> } | null>(
    null,
  );

  const slots = GRADE_MAP[grade].motifs;
  const chosen = motifs.slice(0, slots);
  const cost = composeCost(state, grade);
  const leisure = composeLeisure();
  const gate = canCompose(state, grade);
  const suggestions = useMemo(
    () => (chosen.length > 0 ? titleSuggestions(chosen, seed) : []),
    [chosen.join(','), seed],
  );

  const toggleMotif = (m: MoodTag) => {
    setMotifs((cur) => {
      if (cur.includes(m)) return cur.filter((x) => x !== m);
      const next = [...cur, m];
      return next.length > slots ? next.slice(next.length - slots) : next;
    });
    setName('');
  };

  const write = () => {
    if (chosen.length === 0 || !gate.ok) return;
    const r = composeSong({ motifs: chosen, focus, grade, name: name || suggestions[0] });
    if (!r) return;
    setDone({ name: r.name, mul: r.mul as Record<string, number | undefined> });
    setMotifs([]);
    setName('');
    setSeed(Math.random());
  };

  const place = OVERLOOK_MAP[state.overlook]?.name ?? '';

  return (
    <Sheet
      open={open}
      onClose={() => {
        setDone(null);
        onClose();
      }}
      title={COMPOSE_TEXT.title}
      sub={`${COMPOSE_TEXT.sub} · 此刻在${place}`}
      tall
    >
      {done ? (
        <div className="fade-in">
          <Divider label={COMPOSE_TEXT.doneTitle} />
          <Card>
            <h4 className="display text-[17px] font-semibold text-[#2b2419]">{done.name}</h4>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(done.mul)
                .filter(([, v]) => v != null && Math.abs((v as number) - 1) > 0.001)
                .map(([k, v]) => (
                  <Chip key={k} tone={(v as number) > 1 ? 'moss' : 'wine'}>
                    {MUL_NAMES[k] ?? k} +{Math.round(((v as number) - 1) * 100)}%
                  </Chip>
                ))}
            </div>
            <p className="ui mt-2 text-[11.5px] leading-relaxed text-[#6b6050]">
              {COMPOSE_TEXT.doneNote}
            </p>
          </Card>
          <button
            onClick={() => setDone(null)}
            className="ui btn btn-quiet mt-3 h-10 w-full text-[13px]"
          >
            再写一首
          </button>
        </div>
      ) : (
        <>
          <p className="ui mb-3 whitespace-pre-line text-[11.5px] leading-relaxed text-[#6b6050]">
            {COMPOSE_TEXT.premise}
          </p>

          <Divider label={COMPOSE_TEXT.gradeLabel} />
          <div className="space-y-2">
            {COMPOSE_VALUES.grades.map((g) => {
              const t = COMPOSE_TEXT.grades[g.id];
              const c = composeCost(state, g.id);
              return (
                <Card key={g.id} active={grade === g.id} onClick={() => setGrade(g.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="display text-[15px] font-semibold text-[#2b2419]">{t.name}</h4>
                      <p className="ui mt-0.5 text-[11.5px] leading-relaxed text-[#6b6050]">
                        {t.note}
                      </p>
                    </div>
                    <span
                      className={`ui tnum flex-none text-[11.5px] ${
                        state.insp >= c ? 'text-[#3f6b7a]' : 'text-[#8a4a4a]'
                      }`}
                    >
                      {c} {COMPOSE_TEXT.costLabel}
                    </span>
                  </div>
                  <p className="ui mt-1 text-[10.5px] text-[#6f6350]">
                    {g.motifs === 1 ? '一个动机' : '两个动机'} · {COMPOSE_TEXT.leisureLabel}{' '}
                    {COMPOSE_VALUES.leisure}
                  </p>
                </Card>
              );
            })}
          </div>

          <Divider label={`${COMPOSE_TEXT.motifLabel}（挑 ${slots} 个）`} />
          {motifsAll.length === 0 ? (
            <p className="ui text-[11.5px] text-[#6b6050]">{COMPOSE_TEXT.motifNone}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {motifsAll.map((m) => (
                <button key={m} onClick={() => toggleMotif(m)} className="ui">
                  <Chip tone={chosen.includes(m) ? 'brass' : 'ghost'}>{moodZh(m)}</Chip>
                </button>
              ))}
            </div>
          )}

          <Divider label={COMPOSE_TEXT.focusLabel} />
          <div className="space-y-2">
            {FOCI.map((f) => (
              <Card key={f} active={focus === f} onClick={() => setFocus(f)}>
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="display text-[14.5px] font-semibold text-[#2b2419]">
                    {COMPOSE_TEXT.foci[f].name}
                  </h4>
                  {focus === f && <Chip tone="brass">就这个</Chip>}
                </div>
                <p className="ui mt-0.5 text-[11.5px] leading-relaxed text-[#6b6050]">
                  {COMPOSE_TEXT.foci[f].note}
                </p>
              </Card>
            ))}
          </div>

          {chosen.length > 0 && (
            <>
              <Divider label={COMPOSE_TEXT.nameLabel} />
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => (
                  <button key={sug} onClick={() => setName(sug)} className="ui">
                    <Chip tone={name === sug ? 'brass' : 'ink'}>{sug}</Chip>
                  </button>
                ))}
                <button onClick={() => setSeed(Math.random())} className="ui">
                  <Chip tone="ghost">{COMPOSE_TEXT.reroll}</Chip>
                </button>
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={suggestions[0] ?? ''}
                className="ui mt-2 h-10 w-full rounded-xl border border-[rgba(43,36,25,0.16)] bg-[rgba(255,253,246,0.8)] px-3 text-[13px] text-[#2b2419] outline-none"
              />
              <p className="ui mt-1 text-[10.5px] text-[#6f6350]">{COMPOSE_TEXT.nameHint}</p>
            </>
          )}

          <button
            onClick={write}
            disabled={chosen.length === 0 || !gate.ok}
            className="ui btn btn-brass mt-4 h-11 w-full text-[13.5px] disabled:opacity-45"
          >
            {chosen.length === 0
              ? '先挑一个动机'
              : gate.ok
                ? `${COMPOSE_TEXT.submit} · ${cost} ${COMPOSE_TEXT.costLabel} · ${leisure} ${COMPOSE_TEXT.leisureLabel}`
                : (gate.why ?? COMPOSE_TEXT.notEnough)}
          </button>
          <p className="ui mt-2 text-center text-[10.5px] leading-relaxed text-[#6f6350]">
            手上灵感 {Math.round(state.insp)} · 闲暇 {Math.round(state.leisure)}
            <br />
            写得越多，下一首越贵。族谱找回得越多，写出来的越好。
          </p>
        </>
      )}
    </Sheet>
  );
}
