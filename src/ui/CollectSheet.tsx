import { EVENT_MAP } from '../content/events';
import { ITEM_MAP } from '../content/gear';
import { fmtDuration, fmtNum } from '../game/engine';
import { OVERLOOK_MAP } from '../content/overlooks';
import { useGame } from '../game/store';
import { CATEGORY_TEXT, PROFICIENCY_TEXT, PROFICIENCY_VALUES } from '../content/proficiency';
import { FAME_TEXT } from '../content/fame';
import { categoryOf } from '../game/systems/proficiency';
import { Chip, Divider, Icon, Sheet } from './bits';

/** the technique an instrument belongs to, for the milestone line */
function catName(instrumentId: string): string {
  const cat = categoryOf(instrumentId);
  return cat ? CATEGORY_TEXT[cat].name : '同类';
}

const TONE: Record<string, { c: string; label: string }> = {
  warm: { c: '#8a6220', label: '暖' },
  odd: { c: '#5a7f8c', label: '奇' },
  eerie: { c: '#5c5470', label: '异' },
  lucky: { c: '#4d7a52', label: '运' },
  sad: { c: '#7b3b46', label: '憾' },
  grand: { c: '#8f5a2a', label: '壮' },
};

export default function CollectSheet({
  open,
  onClose,
  onExplore,
}: {
  open: boolean;
  onClose: () => void;
  onExplore: () => void;
}) {
  const { lastReport, state, rates } = useGame();
  if (!lastReport) return null;
  const r = lastReport;
  const ov = OVERLOOK_MAP[state.overlook];
  const items = r.events.filter((e) => e.item);
  /* collecting twice in a row is legal but the second report is empty —
     say so out loud instead of printing a wall of zeros */
  const empty = r.coin < 1 && r.insp < 1 && r.leisure < 1 && r.events.length === 0;

  return (
    <Sheet open={open} onClose={onClose} tall>
      <div className="pt-1">
        <div className="text-center">
          <div className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">
            {ov?.name} · 演奏 {fmtDuration(r.hours)}
          </div>
          <h2 className="display mt-1 text-[27px] font-semibold leading-none text-[#2b2419]">今天的收成</h2>
          <div className="display tnum mt-3 text-[52px] font-semibold leading-none text-[#a97528]">
            {fmtNum(r.coin)}
          </div>
          <div className="ui mt-1 text-[11px] text-[#6a5f4c]">枚铜板进了口袋</div>
          {empty && (
            <p className="ui mx-auto mt-3 max-w-[30ch] rounded-xl bg-[rgba(43,36,25,0.05)] px-3 py-2 text-[11.5px] leading-relaxed text-[#5f5544]">
              刚刚才收过一次，琴盒还是空的。<br />
              把页面关掉，过一会儿再回来 — 时间才是这门生意的本钱。
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { icon: 'spark', label: '灵感', v: r.insp < 1 ? '—' : fmtNum(r.insp), c: '#3f6b7a' },
            /* fame has no number the player is allowed to see. The slot
               shows the word this town uses for you, and the line under the
               grid is where a change of word gets said out loud. */
            { icon: 'fame', label: FAME_TEXT.column, v: r.fameWord, c: '#7b3b46' },
            {
              icon: 'leisure',
              label: '闲暇',
              /* at the cap nothing accrues; a dash there reads like a bug, so
                 say the bucket is full */
              v:
                r.leisure < 1
                  ? state.leisure >= rates.leisureCap
                    ? '已满'
                    : '—'
                  : `${Math.floor(r.leisure)}`,
              c: '#5f7245',
            },
          ].map((x) => (
            <div
              key={x.label}
              className="rounded-2xl border border-[rgba(43,36,25,0.12)] bg-[rgba(255,253,246,0.7)] px-3 py-2.5 text-center"
            >
              <span style={{ color: x.c }} className="inline-flex">
                <Icon name={x.icon} size={15} />
              </span>
              <div className="ui tnum mt-1 text-[15px] font-medium text-[#2b2419]">{x.v}</div>
              <div className="ui text-[9.5px] tracking-wider-2 text-[#6f6350] uppercase">{x.label}</div>
            </div>
          ))}
        </div>

        {/* a town changing the word it uses for you is the only "fame up"
            feedback there is: prose, once, and no arithmetic anywhere near
            it (content/fame/text.ts) */}
        {r.fameUp && (
          <p
            className="ui mt-3 rounded-2xl border border-[rgba(123,59,70,0.24)] bg-[rgba(123,59,70,0.07)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#5f5544]"
            data-fame-up
          >
            {r.fameUp}
          </p>
        )}

        {/* the craft half of the harvest: an hour at the stall buys coins
            and it buys your hands. Milestones are the part worth reading —
            they are permanent, and they spill over onto every instrument
            of the same technique. */}
        {r.practice && (r.practice.gained >= 0.05 || r.practice.mastered) && (
          <div className="mt-3 rounded-2xl border border-[rgba(138,98,32,0.28)] bg-[rgba(184,135,63,0.09)] px-3.5 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">
                {PROFICIENCY_TEXT.collect.label}
              </span>
              <span className="display tnum text-[13px] font-semibold text-[#8a6220]">
                {PROFICIENCY_TEXT.collect.line(
                  r.practice.name,
                  r.practice.to,
                  r.practice.gained,
                )}
              </span>
            </div>
            {r.practice.milestones > 0 && (
              <p className="ui mt-1 text-[11.5px] leading-relaxed text-[#6b6050]">
                {catName(r.practice.instrument)}
                {PROFICIENCY_TEXT.card.categoryLabel} +{r.practice.milestones}%
                {' · '}
                {PROFICIENCY_TEXT.card.bonusHint(
                  PROFICIENCY_VALUES.milestone,
                  PROFICIENCY_VALUES.categoryBonus,
                )}
              </p>
            )}
            {r.practice.mastered && (
              <p className="ui mt-1 text-[11.5px] leading-relaxed text-[#7b3b46]">
                {PROFICIENCY_TEXT.collect.mastered(r.practice.name)}
              </p>
            )}
          </div>
        )}

        {r.fatigued && (
          <div className="mt-3 rounded-2xl border border-[rgba(168,90,90,0.3)] bg-[rgba(168,90,90,0.08)] px-3 py-2">
            <p className="ui text-[11px] leading-relaxed text-[#7b3b46]">
              这一轮后半段你已经弹不动了，收益打了折。手劲现在归零重算 — 换个「静默练习」或者买个学徒会好很多。
            </p>
          </div>
        )}

        {items.length > 0 && (
          <>
            <Divider label="路上捡到的" />
            <div className="flex flex-wrap gap-1.5">
              {items.map((e, i) => (
                <Chip key={i} tone="brass">
                  {ITEM_MAP[e.item!]?.name ?? e.item}
                </Chip>
              ))}
            </div>
          </>
        )}

        <Divider label={r.events.length ? '这段时间发生的事' : '一切平静'} />

        {r.events.length === 0 ? (
          <p className="ui text-center text-[12px] leading-relaxed text-[#6a5f4c]">
            没有人停下，也没有人走开。<br />
            这样的日子占大多数。
          </p>
        ) : (
          <div className="stagger space-y-2.5">
            {r.events
              .slice()
              .reverse()
              .map((pe, i) => {
                const ev = EVENT_MAP[pe.eventId];
                if (!ev) return null;
                const tone = TONE[ev.tone] ?? TONE.warm;
                return (
                  <div
                    key={i}
                    className="relative rounded-2xl border border-[rgba(43,36,25,0.12)] bg-[rgba(255,253,246,0.66)] py-3 pl-4 pr-3.5"
                  >
                    <span
                      className="absolute left-0 top-3 bottom-3 w-[2.5px] rounded-full"
                      style={{ background: tone.c }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="display text-[15px] font-semibold text-[#2b2419]">{ev.title}</h4>
                      <span
                        className="ui rounded-full border px-1.5 py-[1px] text-[9px]"
                        style={{ color: tone.c, borderColor: tone.c + '55' }}
                      >
                        {tone.label}
                      </span>
                    </div>
                    <p className="ui mt-1 whitespace-pre-line text-[12px] leading-[1.75] text-[#4a4032]">
                      {ev.text}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pe.gain.coin !== 0 && (
                        <Chip tone={pe.gain.coin > 0 ? 'brass' : 'wine'}>
                          {pe.gain.coin > 0 ? '+' : ''}
                          {fmtNum(Math.abs(pe.gain.coin))} 枚
                        </Chip>
                      )}
                      {pe.gain.insp !== 0 && (
                        <Chip tone="ink">
                          {pe.gain.insp > 0 ? '+' : '-'}
                          {fmtNum(Math.abs(pe.gain.insp))} 灵感
                        </Chip>
                      )}
                      {pe.gain.renown !== 0 && <Chip tone="wine">{FAME_TEXT.label}</Chip>}
                      {pe.item && <Chip tone="moss">{ITEM_MAP[pe.item]?.name}</Chip>}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        <div className="mt-6 space-y-2">
          <button onClick={onClose} className="ui btn btn-brass h-12 w-full text-[14px] font-medium">
            继续放着，我先走
          </button>
          {/* an outlined ink button, not a greyed one — this path is the whole
              point of the leisure currency and must not look disabled */}
          <button
            onClick={onExplore}
            className="ui btn h-12 w-full border border-[rgba(43,36,25,0.45)] bg-[rgba(43,36,25,0.04)] text-[13px] font-medium text-[#3d3527]"
          >
            去附近转转
          </button>
        </div>
        <p className="ui mt-3 text-center text-[10.5px] leading-relaxed text-[#6f6350]">
          放置会一直进行，关掉页面也算。<br />
          每次回来先收摊，手劲就归零重算。
        </p>
      </div>
    </Sheet>
  );
}
