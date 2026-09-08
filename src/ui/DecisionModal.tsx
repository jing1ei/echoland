import { useState } from 'react';
import { useGame } from '../game/store';
import { FAME_TEXT } from '../content/fame';
import { EVENT_MAP } from '../content/events';
import { ITEM_MAP, SONG_MAP } from '../content/gear';
import { fmtNum } from '../game/engine';
import { Chip, Sheet } from './bits';

export default function DecisionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, resolveDecision } = useGame();
  const [outcome, setOutcome] = useState<{ title: string; text: string } | null>(null);
  const dec = state.decisions[0];

  if (outcome) {
    return (
      <Sheet open={open} onClose={() => setOutcome(null)} title={outcome.title} sub="后来">
        <p className="ui whitespace-pre-line text-[13px] leading-[1.9] text-[#3f382c]">{outcome.text}</p>
        <button
          onClick={() => setOutcome(null)}
          className="ui btn btn-brass mt-6 h-11 w-full text-[13.5px]"
        >
          记下了
        </button>
      </Sheet>
    );
  }

  if (!dec) {
    return (
      <Sheet open={open} onClose={onClose} title="没有待答复的事" sub="路上暂时安静">
        <p className="ui text-[12.5px] leading-relaxed text-[#6a5f4c]">
          「边弹边聊」的姿态会让遇见的人多得多。带上候鸟哨也一样。
        </p>
        <button onClick={onClose} className="ui btn btn-quiet mt-5 h-11 w-full text-[13px]">
          好
        </button>
      </Sheet>
    );
  }

  const ev = EVENT_MAP[dec.eventId];
  if (!ev || !ev.choices) return null;

  return (
    <Sheet open={open} onClose={onClose} title={ev.title} sub={`还有 ${state.decisions.length} 件事等着`} tall>
      <p className="ui whitespace-pre-line text-[13px] leading-[1.9] text-[#3f382c]">{ev.text}</p>
      <div className="mt-5 space-y-2.5">
        {ev.choices.map((c, i) => (
          <button
            key={i}
            onClick={() => {
              const out = resolveDecision(dec.eventId, i);
              setOutcome({ title: ev.title, text: out });
            }}
            className="w-full rounded-2xl border border-[rgba(43,36,25,0.15)] bg-[rgba(255,253,246,0.72)] p-3.5 text-left transition-all active:scale-[0.99] hover:border-[rgba(184,135,63,0.6)] hover:bg-[rgba(217,174,99,0.1)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="display text-[15.5px] font-semibold text-[#2b2419]">{c.label}</h4>
              <span className="ui mt-[3px] text-[10px] text-[#6f6350]">选这个</span>
            </div>
            <p className="ui mt-0.5 text-[11.5px] leading-relaxed text-[#6b6050]">{c.detail}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.gain?.coin != null && (
                <Chip tone="brass">+{fmtNum(c.gain.coin * dec.coinPerHour)} 枚</Chip>
              )}
              {c.cost?.coin != null && (
                <Chip tone="wine">-{fmtNum(c.cost.coin * dec.coinPerHour)} 枚</Chip>
              )}
              {c.gain?.insp != null && <Chip tone="ink">+{fmtNum(c.gain.insp * dec.inspPerHour)} 灵感</Chip>}
              {c.cost?.insp != null && <Chip tone="wine">-{fmtNum(c.cost.insp * dec.inspPerHour)} 灵感</Chip>}
              {/* fame is a word, not a quantity: a choice can say it will
                  cost or earn you standing here without pricing it */}
              {c.gain?.renown != null && <Chip tone="wine">长{FAME_TEXT.label}</Chip>}
              {c.cost?.renown != null && <Chip tone="wine">损{FAME_TEXT.label}</Chip>}
              {c.item && <Chip tone="moss">{ITEM_MAP[c.item]?.name}</Chip>}
              {c.song && <Chip tone="moss">{SONG_MAP[c.song]?.name}</Chip>}
            </div>
          </button>
        ))}
      </div>
      <p className="ui mt-4 text-center text-[10.5px] text-[#6f6350]">选了就不能改。这也是规矩。</p>
    </Sheet>
  );
}
