import { useMemo, useState } from 'react';
import { useGame, availableQuests, objectiveValue, questReady } from '../game/store';
import { OVERLOOK_MAP } from '../content/overlooks';
import { TOWN_MAP } from '../content/towns';
import { INSTRUMENT_MAP, SONG_MAP, UPGRADE_MAP } from '../content/gear';
import { QUESTS } from '../content/quests';
import { fmtNum } from '../game/engine';
import type { Quest } from '../game/types';
import { Card, Chip, Divider, Empty, Meter, Sheet } from './bits';
import CastTab from './CastTab';
import ScoresTab from './ScoresTab';
import { SCENES } from '../game/story';
import { FAME_TEXT } from '../content/fame';
import { fameTierLabel } from '../game/systems/fame';
import { questBadge, wordly } from './objective';

const TABS = ['手记', '故事', '古谱', '人物'] as const;
type Tab = (typeof TABS)[number];

function timeAgo(t: number) {
  const d = Date.now() - t;
  const m = Math.floor(d / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

const KIND_LABEL: Record<string, { t: string; tone: 'ink' | 'brass' | 'wine' | 'moss' | 'ghost' }> = {
  collect: { t: '收摊', tone: 'brass' },
  event: { t: '遇见', tone: 'wine' },
  quest: { t: '故事', tone: 'wine' },
  explore: { t: '走访', tone: 'moss' },
  buy: { t: '买卖', tone: 'ink' },
  travel: { t: '启程', tone: 'ghost' },
  minigame: { t: '手气', tone: 'ink' },
  decision: { t: '抉择', tone: 'wine' },
  story: { t: '剧情', tone: 'wine' },
  bond: { t: '同行', tone: 'moss' },
  craft: { t: '手艺', tone: 'brass' },
};

/* ---------------- journal ---------------- */

function JournalTab() {
  const { state } = useGame();
  if (state.journal.length === 0)
    return <Empty>手记还是空的。去演奏一会儿，总会有事发生。</Empty>;
  return (
    <div className="space-y-3">
      {state.journal.slice(0, 60).map((e, i) => {
        const k = KIND_LABEL[e.kind] ?? { t: e.kind, tone: 'ghost' as const };
        return (
          <div key={i} className="relative pl-4">
            <span className="absolute left-0 top-[7px] h-1.5 w-1.5 rounded-full bg-[rgba(184,135,63,0.8)]" />
            <div className="flex items-center gap-2">
              <Chip tone={k.tone}>{k.t}</Chip>
              <span className="ui text-[10.5px] text-[#6f6350]">{timeAgo(e.at)}</span>
            </div>
            <h4 className="display mt-1 text-[15px] font-semibold leading-tight text-[#2b2419]">{e.title}</h4>
            {e.body && (
              <p className="ui mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-[#6b6050]">{e.body}</p>
            )}
          </div>
        );
      })}
      <p className="ui pt-3 text-center text-[11px] text-[#6f6350]">
        {state.journal.length > 60
          ? '更早的纸页已经散了。'
          : '—— 手记到此为止 ——'}
      </p>
    </div>
  );
}

/* ---------------- story lines ---------------- */

function QuestRow({ q, locked }: { q: Quest; locked: boolean }) {
  const { state, claimQuest } = useGame();
  const [done, setDone] = useState<Quest | null>(null);
  const doneAlready = state.questsDone.includes(q.id);
  const ready = !doneAlready && questReady(state, q);

  return (
    <>
      <Card active={ready} className={locked ? 'opacity-55' : ''}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip tone={q.line === 'main' ? 'wine' : 'moss'}>
                {questBadge(q)}
              </Chip>
              {doneAlready && <Chip tone="ghost">已完成</Chip>}
              {ready && <Chip tone="brass">可交付</Chip>}
              {locked && <Chip tone="ghost">未开启</Chip>}
            </div>
            <h4 className="display mt-1.5 text-[15.5px] font-semibold leading-tight text-[#2b2419]">{q.title}</h4>
            <p className="ui mt-1 text-[12px] leading-relaxed text-[#6b6050]">
              {locked ? '还没到这一页。' : q.teaser}
            </p>
          </div>
        </div>

        {!locked && !doneAlready && (
          <div className="mt-2.5 space-y-1.5">
            {q.objectives.map((o, i) => {
              const v = objectiveValue(state, o);
              const p = Math.min(1, v / o.target);
              return (
                <div key={i}>
                  <div className="ui flex items-baseline justify-between gap-2 text-[11.5px]">
                    <span className={p >= 1 ? 'text-[#4d5a38]' : 'text-[#6b6050]'}>
                      {p >= 1 ? '✓ ' : ''}
                      {o.label}
                    </span>
                    <span
                      className={`flex-none text-[10.5px] text-[#6f6350] ${wordly(o) ? 'ui' : 'tnum'}`}
                    >
                      {wordly(o)
                        ? fameTierLabel(v)
                        : `${fmtNum(Math.min(v, o.target))}/${fmtNum(o.target)}`}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Meter value={v} max={o.target} tone={p >= 1 ? '#5c6a45' : '#b8873f'} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!locked && !doneAlready && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {q.reward.coin ? <Chip tone="brass">{fmtNum(q.reward.coin)} 枚</Chip> : null}
            {q.reward.renown ? <Chip tone="ink">{FAME_TEXT.label}</Chip> : null}
            {q.reward.overlook && <Chip tone="wine">观景台 · {OVERLOOK_MAP[q.reward.overlook]?.name}</Chip>}
            {q.reward.map && <Chip tone="wine">地图 · {TOWN_MAP[q.reward.map]?.name}</Chip>}
            {q.reward.instrument && <Chip tone="brass">{INSTRUMENT_MAP[q.reward.instrument]?.name}</Chip>}
            {q.reward.song && <Chip tone="brass">{SONG_MAP[q.reward.song]?.name}</Chip>}
            {q.reward.upgrade && <Chip tone="moss">{UPGRADE_MAP[q.reward.upgrade]?.name}</Chip>}
          </div>
        )}

        {ready && (
          <button
            onClick={() => {
              const r = claimQuest(q.id);
              if (r) setDone(r);
            }}
            className="ui btn btn-brass mt-3 h-10 w-full text-[13px]"
          >
            交付
          </button>
        )}
      </Card>

      <Sheet open={!!done} onClose={() => setDone(null)} title={done?.title} sub="完成" tall>
        {done && (
          <div>
            <p className="display whitespace-pre-line text-[15.5px] leading-[1.9] text-[#2b2419]">{done.closing}</p>
            <button onClick={() => setDone(null)} className="ui btn btn-ink mt-5 h-11 w-full text-[13.5px]">
              合上手记
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}

function StoryTab() {
  const { state } = useGame();
  const avail = new Set(availableQuests(state).map((q) => q.id));
  const main = QUESTS.filter((q) => q.line === 'main');
  const side = QUESTS.filter((q) => q.line === 'side');
  const doneMain = main.filter((q) => state.questsDone.includes(q.id)).length;
  const doneSide = side.filter((q) => state.questsDone.includes(q.id)).length;

  const visibleMain = main.filter(
    (q) => state.questsDone.includes(q.id) || avail.has(q.id) || q.chapter <= doneMain + 2,
  );

  return (
    <div>
      <div className="flex gap-2">
        <Card className="flex-1">
          <p className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">main line</p>
          <p className="display tnum mt-1 text-[20px] font-semibold text-[#2b2419]">
            {doneMain}
            <span className="text-[13px] text-[#6f6350]"> / {main.length}</span>
          </p>
        </Card>
        <Card className="flex-1">
          <p className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">side stories</p>
          <p className="display tnum mt-1 text-[20px] font-semibold text-[#2b2419]">
            {doneSide}
            <span className="text-[13px] text-[#6f6350]"> / {side.length}</span>
          </p>
        </Card>
      </div>

      <Divider label="主线 · 八十一份" />
      <div className="space-y-2.5">
        {visibleMain.map((q) => (
          <QuestRow key={q.id} q={q} locked={!avail.has(q.id) && !state.questsDone.includes(q.id)} />
        ))}
      </div>

      <Divider label="支线 · 路上的人" />
      <div className="space-y-2.5">
        {side
          .filter((q) => avail.has(q.id) || state.questsDone.includes(q.id))
          .map((q) => (
            <QuestRow key={q.id} q={q} locked={false} />
          ))}
      </div>
      {side.filter((q) => avail.has(q.id) || state.questsDone.includes(q.id)).length < side.length && (
        <p className="ui mt-3 text-center text-[11px] text-[#6f6350]">
          还有 {side.length - side.filter((q) => avail.has(q.id) || state.questsDone.includes(q.id)).length}{' '}
          段支线没遇上。往后走走。
        </p>
      )}

      <SceneLog />
    </div>
  );
}

/* ---------------- what actually happened ----------------
   Quests are the errands; scenes are the story. Because most scenes are
   rolled rather than granted, a player needs a record of which ones they
   have actually witnessed — otherwise "did I miss something?" has no
   answer. The count of authored scenes is shown on purpose: knowing the
   world is bigger than your log is the whole engine of an idle game. */

const LINE_CHIP: Record<string, { t: string; tone: 'brass' | 'wine' | 'moss' | 'ghost' }> = {
  main: { t: '主线', tone: 'brass' },
  side: { t: '支线', tone: 'wine' },
  bond: { t: '同行', tone: 'moss' },
  ambient: { t: '路上', tone: 'ghost' },
};

function SceneLog() {
  const { state } = useGame();
  const seen = state.story.seen;
  const rows = useMemo(
    () =>
      SCENES.filter((sc) => (seen[sc.id] ?? 0) > 0)
        .map((sc) => ({ sc, at: state.story.seenAt[sc.id] ?? 0, n: seen[sc.id] ?? 0 }))
        .sort((a, b) => b.at - a.at),
    [seen, state.story.seenAt],
  );

  return (
    <>
      <Divider label={`演过的场 · ${rows.length} / ${SCENES.length}`} />
      {rows.length === 0 ? (
        <Empty>还没有谁跟你说上一整段话。摆摊、收摊、四处走走，人自己会来。</Empty>
      ) : (
        <div className="space-y-2">
          {rows.map(({ sc, at, n }) => {
            const c = LINE_CHIP[sc.line] ?? LINE_CHIP.ambient;
            return (
              <div
                key={sc.id}
                className="flex items-center gap-2.5 rounded-[14px] border border-[rgba(43,36,25,0.1)] bg-[rgba(255,253,246,0.5)] px-3 py-2"
              >
                <Chip tone={c.tone}>{c.t}</Chip>
                <span className="display min-w-0 flex-1 truncate text-[13.5px] text-[#2b2419]">
                  {sc.title}
                  {n > 1 && <span className="ui ml-1 text-[10.5px] text-[#8a7f6c]">×{n}</span>}
                </span>
                <span className="ui flex-none text-[10.5px] text-[#8a7f6c]">{at ? timeAgo(at) : ''}</span>
              </div>
            );
          })}
        </div>
      )}
      <p className="ui mt-2.5 text-center text-[11px] leading-relaxed text-[#6f6350]">
        有些场只在特定的天气、时辰、去处才碰得上，碰上了也未必发生。
      </p>
    </>
  );
}

/* ---------------- host ---------------- */

export default function JournalView() {
  const [tab, setTab] = useState<Tab>('手记');
  const { state } = useGame();
  const readyCount = availableQuests(state).filter((q) => questReady(state, q)).length;

  return (
    <div className="relative h-full overflow-y-auto no-scrollbar bg-[#f4ecdc]">
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply grain" />
      <div className="relative px-5 pt-[max(16px,env(safe-area-inset-top))] pb-nav">
        <p className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">the notebook</p>
        <h1 className="display text-[26px] font-semibold leading-tight text-[#2b2419]">手记</h1>

        <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`ui btn relative h-8 flex-none px-3.5 text-[12px] ${t === tab ? 'btn-ink' : 'btn-quiet'}`}
            >
              {t}
              {t === '故事' && readyCount > 0 && (
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#a03a3a] align-middle" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === '手记' && <JournalTab />}
          {tab === '故事' && <StoryTab />}
          {tab === '古谱' && <ScoresTab />}
          {tab === '人物' && <CastTab />}
        </div>
      </div>
    </div>
  );
}
