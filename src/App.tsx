import { lazy, Suspense, useEffect, useState } from 'react';
import { GameProvider, useGame } from './game/store';
import StageView from './ui/StageView';
import TownView from './ui/TownView';
import JournalView from './ui/JournalView';
import WidgetView from './ui/WidgetView';
import StrategyPanel from './ui/StrategyPanel';
import TravelMap from './ui/TravelMap';
import SatchelView from './ui/SatchelView';
import SettingsSheet from './ui/SettingsSheet';
import CollectSheet from './ui/CollectSheet';
import DecisionModal from './ui/DecisionModal';
import MinigameModal from './ui/Minigames';
import StoryView from './ui/StoryView';
import SceneCanvas from './render/SceneCanvas';
import { availableQuests, questReady } from './game/store';
import { Icon } from './ui/bits';
import { sfx } from './audio';

/* ============================================================
   Prologue
   ============================================================ */

const PROLOGUE = [
  {
    t: '一、澹人',
    b: '你的族人叫澹人。他们不打仗，不经商，只会一件事：让乐器里住着的东西听话。\n如今澹人只剩你一个。',
  },
  {
    t: '二、八十一',
    b: '澹人全部的家当是八十一份曲谱，九卷，每卷九页。\n它们能做的事不止好听——所以它们被人一页一页抢走了，散在这片大陆的每个角落。',
  },
  {
    t: '三、行囊',
    b: '一把旧鲁特琴，弦有一根是麻线；一顶塌了边的帽子；一本空的手记。\n还有断桨酒馆四十七枚铜板的欠账。',
  },
  {
    t: '四、规矩',
    b: '你摆摊，你演奏，钱自己会掉进琴盒。\n你走开也没关系——琴还在响，路过的人还在放钱。\n回来时把盒子倒空，顺便听听你不在时发生了什么。',
  },
  {
    t: '五、往哪走',
    b: '往北是麦田，往南是樱桥，再往外是灯塔、窑火、沙丘、云台、冻湖。\n每个地方都压着一卷谱。你要一页一页拿回来。\n这得走很久。',
  },
];

function Prologue({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const p = PROLOGUE[i];
  return (
    <div className="fixed inset-0 z-[60] bg-[#0d0c12]">
      <SceneCanvas overlookId="mistquay" playing showBard minimal className="absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(8,7,12,0.55)] via-[rgba(8,7,12,0.35)] to-[rgba(8,7,12,0.85)]" />
      <div className="relative flex h-full flex-col justify-end px-7 pb-[max(38px,env(safe-area-inset-bottom))]">
        <div className="pointer-events-none absolute inset-x-7 top-[max(34px,env(safe-area-inset-top))]">
          <p className="ui text-[10px] tracking-wider-2 text-white/45 uppercase">the wandering lyre</p>
          <h1 className="display mt-1 text-[34px] font-semibold leading-none text-white/95">云游者</h1>
        </div>

        {/* the copy used to sit straight on the busker's silhouette — a soft
            slab keeps it readable without hiding the scene */}
        <div
          key={i}
          className="fade-in rounded-[22px] border border-white/10 bg-[rgba(10,8,14,0.46)] px-5 py-4.5 backdrop-blur-[3px]"
        >
          <p className="ui legible text-[10.5px] tracking-wider-2 text-[#e8cd9a] uppercase">{p.t}</p>
          <p className="display legible-strong mt-2.5 whitespace-pre-line text-[17.5px] leading-[1.85] text-white">
            {p.b}
          </p>
        </div>

        <div className="mt-7 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5">
            {PROLOGUE.map((_, k) => (
              <span
                key={k}
                className="h-[2px] flex-1 rounded-full transition-all"
                style={{ background: k <= i ? 'rgba(230,189,118,0.9)' : 'rgba(255,255,255,0.2)' }}
              />
            ))}
          </div>
          <button
            onClick={() => (i < PROLOGUE.length - 1 ? setI(i + 1) : onDone())}
            className="ui btn btn-brass h-11 px-6 text-[13.5px]"
          >
            {i < PROLOGUE.length - 1 ? '继续' : '开始摆摊'}
          </button>
        </div>
        {i < PROLOGUE.length - 1 && (
          <button onClick={onDone} className="ui legible mt-3 text-[11.5px] text-white/75">
            跳过
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Shell
   ============================================================ */

type Tab = 'stage' | 'town' | 'journal' | 'satchel';
const TAB_IDS: Tab[] = ['stage', 'town', 'journal', 'satchel'];

const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);

/* ------------------------------------------------------------
   GM layer — the removable block

   Two gates, on purpose:

     __GM__     compile time. `false` in a production build, which lets
                Rollup delete the dynamic import below — the release
                bundle contains no GM chunk and no GM code at all.
                (`npm run build:gm` flips it on for a tester build.)
     ?gm=1      run time, inside a build that has it. Keeps the corner
                button out of the way until you ask for it, so a shared
                dev link still looks like the real game.

   To remove the feature for good: delete src/gm/, this block, the
   <GmLayer/> line at the bottom of Shell, the `__GM__` define in
   vite.config.ts, and the gmWrite/gmPlay pair in game/store.tsx.
   Nothing else refers to any of it. See docs/GM.md.
   ------------------------------------------------------------ */
const GM_BUILD = __GM__;
const GM_ON = GM_BUILD && (import.meta.env.DEV || params.get('gm') === '1');
const GmLayer = GM_BUILD ? lazy(() => import('./gm/GmLayer')) : null;

/** ?widget=1 opens straight into the scenery — this is the link you put on your home screen */
const WANT_WIDGET = params.get('widget') === '1';
const WANT_SKIP = params.get('skipIntro') === '1' || WANT_WIDGET;
const WANT_TAB = (params.get('tab') as Tab | null) ?? null;

function Shell() {
  const { state, collect, markIntroSeen, story, fireHook } = useGame();
  const [tab, setTab] = useState<Tab>(WANT_TAB && TAB_IDS.includes(WANT_TAB) ? WANT_TAB : 'stage');
  const [strategy, setStrategy] = useState(false);
  const [overlooks, setOverlooks] = useState(false);
  const [settings, setSettings] = useState(false);
  const [report, setReport] = useState(false);
  const [decision, setDecision] = useState(false);
  const [widget, setWidget] = useState(WANT_WIDGET);
  const [mini, setMini] = useState<{ kind: string; title: string } | null>(null);
  /* "just the view": the stage hides its own controls, and the tab bar has
     to go with them or the effect is pointless */
  const [bare, setBare] = useState(false);

  const questBadge = availableQuests(state).filter((q) => questReady(state, q)).length > 0;
  const anyModal = strategy || overlooks || settings || report || decision || !!mini || !!story;
  const hideNav = tab === 'stage' && bare && !anyModal;

  /* keep the tab bar out of the way when a sheet is open */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
  }, []);

  useEffect(() => {
    if (WANT_SKIP && !state.seenIntro) markIntroSeen();
  }, [state.seenIntro, markIntroSeen]);

  /* leaving the stage cancels the view-only mode — otherwise coming back to
     the stage later would drop you into a screen with no controls and no
     memory of why */
  useEffect(() => {
    if (tab !== 'stage') setBare(false);
  }, [tab]);

  const doCollect = () => {
    collect();
    /* the one reward sound in the game; volume lives in settings */
    sfx.collect();
    setReport(true);
  };

  /* ----------------------------------------------------------
     Story hooks

     Two moments carry almost all of the storytelling: opening the app
     (someone was waiting for you) and finishing a collect (something
     happened while you were away). Both go through `fireHook`, which
     asks the trigger table and rolls the dice — most of the time
     nothing happens, and that is what makes the times it does land.
     ---------------------------------------------------------- */

  /* on first paint after the prologue */
  useEffect(() => {
    if (!state.seenIntro || widget) return;
    const id = window.setTimeout(() => fireHook('open'), 900);
    return () => window.clearTimeout(id);
    // deliberately once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* and again whenever the app comes back to the foreground — this is the
     "every time you open it" beat, and it is where returning players meet
     most of the cast */
  useEffect(() => {
    let pending = 0;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (widget || !state.seenIntro) return;
      /* one pending beat at a time: flipping away and back three times
         should not queue three openings */
      window.clearTimeout(pending);
      pending = window.setTimeout(() => fireHook('open'), 700);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearTimeout(pending);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [widget, state.seenIntro, fireHook]);

  if (!state.seenIntro) return <Prologue onDone={markIntroSeen} />;
  if (widget) return <WidgetView onExit={() => setWidget(false)} />;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0d0c12]">
      {/* views */}
      <div className="absolute inset-0">
        {tab === 'stage' && (
          <StageView
            onOpenStrategy={() => setStrategy(true)}
            onOpenOverlooks={() => setOverlooks(true)}
            onCollect={doCollect}
            onOpenDecisions={() => setDecision(true)}
            onOpenSettings={() => setSettings(true)}
            paused={anyModal}
            bare={bare}
            onToggleBare={() => setBare((b) => !b)}
          />
        )}
        {/* the parchment runs to the very bottom edge — the tab bar floats on
            top of it, and each view reserves room for it with .pb-nav */}
        {tab === 'town' && (
          <div className="absolute inset-0">
            <TownView onOpenMinigame={(kind, title) => setMini({ kind, title })} />
          </div>
        )}
        {tab === 'journal' && (
          <div className="absolute inset-0">
            <JournalView />
          </div>
        )}
        {tab === 'satchel' && (
          <div className="absolute inset-0">
            <SatchelView />
          </div>
        )}
      </div>

      {/* a soft fade under the tab bar so text scrolling beneath it dissolves
          instead of looking chopped in half */}
      {tab !== 'stage' && (
        <div className="nav-scrim pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[124px]" />
      )}

      {/* tab bar */}
      <div
        className="ui-fade from-bottom absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(10px,env(safe-area-inset-bottom))]"
        data-hidden={hideNav}
      >
        <div
          className={`flex items-center gap-1 rounded-[20px] px-2 py-1 transition-all ${
            tab === 'stage'
              ? 'glass'
              : 'border border-[rgba(43,36,25,0.12)] bg-[rgba(255,253,246,0.92)] shadow-[0_-2px_24px_-12px_rgba(60,45,20,0.5)] backdrop-blur-md'
          }`}
        >
          {(
            [
              { k: 'stage' as Tab, icon: 'lyre', label: '摊子' },
              { k: 'town' as Tab, icon: 'compass', label: '探索' },
              { k: 'journal' as Tab, icon: 'book', label: '手记' },
              { k: 'satchel' as Tab, icon: 'bag', label: '行囊' },
            ]
          ).map((t) => {
            const on = tab === t.k;
            const light = tab === 'stage';
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                data-on={on}
                className="nav-tab"
                style={{ color: on ? (light ? '#f0d9a8' : '#8a6220') : light ? 'rgba(255,255,255,0.55)' : '#6f6350' }}
              >
                <Icon name={t.icon} size={19} />
                <span className="ui text-[10.5px] font-medium">{t.label}</span>
                {t.k === 'journal' && questBadge && <span className="notch" />}
                {t.k === 'town' && state.leisure >= 4 && !questBadge && (
                  <span className="notch" style={{ background: '#5c6a45' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* sheets */}
      <StrategyPanel open={strategy} onClose={() => setStrategy(false)} />
      <TravelMap open={overlooks} onClose={() => setOverlooks(false)} />
      <SettingsSheet
        open={settings}
        onClose={() => setSettings(false)}
        onWidget={() => setWidget(true)}
      />
      <CollectSheet
        open={report}
        onClose={() => {
          setReport(false);
          /* decisions are the old lightweight branch prompts; they take
             precedence, and the story roll happens after they are cleared
             so the two never fight over the screen */
          if (state.decisions.length > 0) setDecision(true);
          else window.setTimeout(() => fireHook('collect'), 340);
        }}
        onExplore={() => {
          setReport(false);
          setTab('town');
        }}
      />
      <DecisionModal
        open={decision}
        onClose={() => {
          setDecision(false);
          window.setTimeout(() => fireHook('collect'), 340);
        }}
      />
      <MinigameModal kind={mini?.kind ?? null} title={mini?.title ?? ''} onClose={() => setMini(null)} />

      {/* the AVG layer sits above everything: when someone is talking to
          you, nothing else on screen matters */}
      <StoryView />

      {/* removable: see GM_ON above */}
      {GM_ON && GmLayer && (
        <Suspense fallback={null}>
          <GmLayer />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <div className="mx-auto h-[100dvh] w-full max-w-[520px] overflow-hidden bg-[#0d0c12]">
        <Shell />
      </div>
    </GameProvider>
  );
}
