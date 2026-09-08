import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { fmtNum } from '../game/engine';
import { Chip, Sheet } from './bits';
import { tone } from '../audio';

/* The ear-training minigame used to own a private oscillator, which meant the
   volume slider in settings could not reach it. Sound now lives in one place. */

const SCALE = [261.63, 311.13, 349.23, 392.0, 466.16, 523.25];
const NOTE_NAMES = ['do', 'me', 'fa', 'so', 'te', 'dó'];
const NOTE_COLORS = ['#b8873f', '#7b3b46', '#5c6a45', '#3f6b7a', '#8f5a2a', '#5c5470'];

/* ------------------------------------------------------------
   Timers

   Every game here animates — dice tumble, a card flips, the stair
   plays a phrase back — and every one of them can be dismissed
   mid-animation. Each used to keep its own bookkeeping, or none at
   all, which left callbacks firing into an unmounted sheet. One place
   hands the timers out, one place sweeps them up.
   ------------------------------------------------------------ */

function useTimers() {
  const outs = useRef<number[]>([]);
  const ivs = useRef<number[]>([]);

  const clear = useCallback(() => {
    outs.current.forEach((id) => window.clearTimeout(id));
    ivs.current.forEach((id) => window.clearInterval(id));
    outs.current = [];
    ivs.current = [];
  }, []);

  useEffect(() => clear, [clear]);

  return useMemo(
    () => ({
      /** run once, later */
      after(ms: number, fn: () => void) {
        outs.current.push(window.setTimeout(fn, ms));
      },
      /** run until `stop()`, or until the sheet closes */
      every(ms: number, fn: (stop: () => void) => void) {
        const id = window.setInterval(() => fn(() => window.clearInterval(id)), ms);
        ivs.current.push(id);
      },
      clear,
    }),
    [clear],
  );
}

/* ============================================================
   Dice — 三骰对赌
   ============================================================ */

function DiceGame({ onDone }: { onDone: () => void }) {
  const { state, rates, winMinigame } = useGame();
  const lucky = state.upgrades.includes('up_dice');
  /* round every rung — 159 / 318 / 795 / 1,908 looked like leaked arithmetic */
  const nice = (n: number) => {
    const step = n >= 1000 ? 100 : n >= 200 ? 50 : 10;
    return Math.max(10, Math.round(n / step) * step);
  };
  const unit = Math.max(20, nice(rates.coin * 0.6));
  const rungs = [1, 2, 5, 12].map((k) => nice(unit * k));
  const [bet, setBet] = useState(unit);
  const [mine, setMine] = useState<number[]>([1, 1, 1]);
  const [house, setHouse] = useState<number[]>([1, 1, 1]);
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'done'>('idle');
  const [msg, setMsg] = useState('三颗骰子，比总点。平手退钱。');
  const [streak, setStreak] = useState(0);
  const timers = useTimers();

  const roll = () => {
    if (state.coin < bet) {
      setMsg('钱不够。');
      return;
    }
    setPhase('rolling');
    let n = 0;
    timers.every(55, (stop) => {
      setMine([d(), d(), d()]);
      setHouse([d(), d(), d()]);
      n++;
      if (n > 12) {
        stop();
        let m = [d(), d(), d()];
        if (lucky) {
          const lo = m.indexOf(Math.min(...m));
          m[lo] = Math.max(m[lo], d());
        }
        const h = [d(), d(), d()];
        setMine(m);
        setHouse(h);
        const ms = m.reduce((a, b) => a + b, 0);
        const hs = h.reduce((a, b) => a + b, 0);
        setPhase('done');
        if (ms > hs) {
          const payout = Math.round(bet * (ms - hs >= 8 ? 2.6 : 1.9));
          const net = payout - bet;
          winMinigame('dice', net, `押 ${fmtNum(bet)}，${ms} 比 ${hs}，净赚 ${fmtNum(net)}。`);
          setStreak((x) => x + 1);
          setMsg(
            `${ms} 比 ${hs} — 赢。押 ${fmtNum(bet)}，赔 ${fmtNum(payout)}，净赚 ${fmtNum(net)} 枚。`,
          );
        } else if (ms === hs) {
          setMsg(`${ms} 比 ${hs} — 平手。押的 ${fmtNum(bet)} 枚退回，净 0。`);
        } else {
          winMinigame('dice', -bet, `押 ${fmtNum(bet)}，${ms} 比 ${hs}，输了。`);
          setStreak(0);
          setMsg(`${ms} 比 ${hs} — 输。押 ${fmtNum(bet)}，赔 0，净 −${fmtNum(bet)} 枚。`);
        }
      }
    });
  };
  const d = () => 1 + Math.floor(Math.random() * 6);

  return (
    <div>
      <p className="ui text-[12.5px] leading-relaxed text-[#6b6050]">
        {lucky ? '你带着那对磨光的骰子。它更懂你。' : '油灯下的桌子，赌客不抬头。'}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: '你', arr: mine, tone: '#a97528' },
          { label: '庄家', arr: house, tone: '#5a4f3d' },
        ].map((side) => (
          <div key={side.label} className="rounded-2xl border border-[rgba(43,36,25,0.13)] bg-[rgba(255,253,246,0.72)] p-3">
            <div className="ui mb-2 text-[10px] tracking-wider-2 text-[#6f6350] uppercase">{side.label}</div>
            <div className="flex gap-1.5">
              {side.arr.map((v, i) => (
                <div
                  key={i}
                  className="display grid h-10 w-10 place-items-center rounded-lg border text-[17px] font-semibold"
                  style={{ borderColor: side.tone + '55', color: side.tone, background: side.tone + '12' }}
                >
                  {v}
                </div>
              ))}
            </div>
            <div className="ui tnum mt-2 text-[12px] text-[#4a4032]">
              共 {side.arr.reduce((a, b) => a + b, 0)} 点
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="ui mb-1.5 flex items-center justify-between text-[11px] text-[#6b6050]">
          <span>这一把押多少</span>
          <span className="tnum">押 {fmtNum(bet)} 枚 · 手上 {fmtNum(state.coin)}</span>
        </div>
        <div className="flex gap-1.5">
          {rungs.map((v) => (
            <button
              key={v}
              onClick={() => setBet(Math.min(Math.max(1, Math.floor(state.coin)), v))}
              className={`ui btn h-8 flex-1 text-[11px] ${bet === v ? 'btn-brass' : 'btn-quiet'}`}
            >
              {fmtNum(v)}
            </button>
          ))}
        </div>
      </div>

      <p className="ui mt-3 min-h-[36px] rounded-xl bg-[rgba(43,36,25,0.05)] px-3 py-2 text-[12px] leading-relaxed text-[#4a4032]">
        {msg}
        {streak > 1 && <span className="ml-1 text-[#8a6220]">连赢 {streak} 把。</span>}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          disabled={phase === 'rolling' || state.coin < bet}
          onClick={roll}
          className="ui btn btn-brass h-11 flex-1 text-[13.5px]"
        >
          {phase === 'rolling' ? '骰子还在滚…' : '掷'}
        </button>
        <button onClick={onDone} className="ui btn btn-quiet h-11 px-5 text-[13px]">
          收手
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Cards — 高低牌
   ============================================================ */

const SUITS = ['♠', '♥', '♣', '♦'];
const FACE = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function CardsGame({ onDone }: { onDone: () => void }) {
  const { state, rates, winMinigame } = useGame();
  const unit = Math.max(20, Math.round(rates.coin * 0.8));
  const [cur, setCur] = useState(() => 1 + Math.floor(Math.random() * 13));
  const [suit, setSuit] = useState(() => Math.floor(Math.random() * 4));
  const [pot, setPot] = useState(0);
  const [staked, setStaked] = useState(false);
  const [msg, setMsg] = useState('先押一注，然后猜下一张比它大还是小。猜中翻倍，可以一直翻。');
  const [flipping, setFlipping] = useState(false);
  const timers = useTimers();

  const stake = () => {
    if (state.coin < unit) {
      setMsg('钱不够。');
      return;
    }
    winMinigame('cards', -unit, `牌局押上 ${fmtNum(unit)} 枚。`);
    setPot(unit);
    setStaked(true);
    setMsg('押好了。比它大，还是小？');
  };

  const guess = (higher: boolean) => {
    setFlipping(true);
    timers.after(420, () => {
      const next = 1 + Math.floor(Math.random() * 13);
      const ns = Math.floor(Math.random() * 4);
      setFlipping(false);
      setCur(next);
      setSuit(ns);
      if (next === cur) {
        setMsg(`又是 ${FACE[next - 1]} — 同点，本注退回。`);
        winMinigame('cards', pot, '同点，退回。');
        setPot(0);
        setStaked(false);
        return;
      }
      const win = higher ? next > cur : next < cur;
      if (win) {
        const np = Math.round(pot * 1.95);
        setPot(np);
        setMsg(`翻出 ${FACE[next - 1]} — 猜中了。台上 ${fmtNum(np)} 枚，继续还是收？`);
      } else {
        setMsg(`翻出 ${FACE[next - 1]} — 全没了。`);
        setPot(0);
        setStaked(false);
      }
    });
  };

  const cashOut = () => {
    if (pot <= 0) return;
    winMinigame('cards', pot, `牌局收手，拿走 ${fmtNum(pot)} 枚。`);
    setMsg(`拿走 ${fmtNum(pot)} 枚。老板笑着洗牌。`);
    setPot(0);
    setStaked(false);
  };

  const red = suit === 1 || suit === 3;

  return (
    <div>
      <p className="ui text-[12.5px] leading-relaxed text-[#6b6050]">
        牌是手绘的，一半的花色都掉了色。
      </p>
      <div className="mt-4 grid place-items-center">
        <div
          className={`relative grid h-40 w-28 place-items-center rounded-2xl border-2 bg-[#fffdf6] transition-transform duration-300 ${
            flipping ? '[transform:rotateY(90deg)]' : ''
          }`}
          style={{ borderColor: 'rgba(43,36,25,0.2)', boxShadow: '0 10px 26px -14px rgba(0,0,0,0.5)' }}
        >
          <div className="display text-[44px] font-semibold" style={{ color: red ? '#a03a3a' : '#2b2419' }}>
            {FACE[cur - 1]}
          </div>
          <div className="absolute bottom-3 text-[20px]" style={{ color: red ? '#a03a3a' : '#2b2419' }}>
            {SUITS[suit]}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <Chip tone="brass">台上 {fmtNum(pot)} 枚</Chip>
        <Chip tone="ghost">底注 {fmtNum(unit)}</Chip>
      </div>

      <p className="ui mt-3 min-h-[40px] rounded-xl bg-[rgba(43,36,25,0.05)] px-3 py-2 text-[12px] leading-relaxed text-[#4a4032]">
        {msg}
      </p>

      {!staked ? (
        <div className="mt-4 flex gap-2">
          <button onClick={stake} className="ui btn btn-brass h-11 flex-1 text-[13.5px]">
            押 {fmtNum(unit)} 枚
          </button>
          <button onClick={onDone} className="ui btn btn-quiet h-11 px-5 text-[13px]">
            走
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <button onClick={() => guess(true)} className="ui btn btn-ink h-11 flex-1 text-[13.5px]">
              更大
            </button>
            <button onClick={() => guess(false)} className="ui btn btn-ink h-11 flex-1 text-[13.5px]">
              更小
            </button>
          </div>
          <button onClick={cashOut} className="ui btn btn-brass mt-2 h-11 w-full text-[13px]">
            收手，拿走 {fmtNum(pot)} 枚
          </button>
        </>
      )}
    </div>
  );
}

/* ============================================================
   Tune — 听力试炼（Simon says，但是音阶）
   ============================================================ */

function TuneGame({ onDone }: { onDone: () => void }) {
  const { rates, winMinigame } = useGame();
  const [seq, setSeq] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(-1);
  const [msg, setMsg] = useState('听一段，然后照着按回去。四关全过就算通过。');
  const [state2, setState2] = useState<'idle' | 'listen' | 'answer' | 'won' | 'lost'>('idle');
  const timers = useTimers();

  const playSeq = useCallback(
    (s: number[]) => {
      setPlaying(true);
      setState2('listen');
      timers.clear();
      s.forEach((n, i) => {
        timers.after(i * 460, () => {
          setActive(n);
          tone(SCALE[n], 0.32);
          timers.after(240, () => setActive(-1));
        });
      });
      timers.after(s.length * 460 + 120, () => {
        setPlaying(false);
        setState2('answer');
        setMsg('轮到你了。');
      });
    },
    [timers],
  );

  const begin = () => {
    const len = 3;
    const s = Array.from({ length: len }, () => Math.floor(Math.random() * 6));
    setSeq(s);
    setInput([]);
    setRound(1);
    playSeq(s);
  };

  const press = (n: number) => {
    if (state2 !== 'answer') return;
    tone(SCALE[n], 0.26);
    const next = [...input, n];
    if (seq[next.length - 1] !== n) {
      setState2('lost');
      setMsg('错了一个音。石阶不响了。');
      const loss = Math.round(rates.coin * 0.2);
      winMinigame('tune', -loss, '听力试炼失手。');
      return;
    }
    if (next.length === seq.length) {
      if (round >= 4) {
        setState2('won');
        const reward = Math.round(rates.coin * 2.4 + 200);
        winMinigame('tune', reward, `听力试炼四关全过，得 ${fmtNum(reward)} 枚。`);
        setMsg(`四关全过。有人在暗处轻轻拍了两下手。得 ${fmtNum(reward)} 枚。`);
        return;
      }
      const s2 = [...seq, Math.floor(Math.random() * 6)];
      setSeq(s2);
      setInput([]);
      setRound(round + 1);
      setMsg(`第 ${round} 关过了。再长一个音。`);
      timers.after(700, () => playSeq(s2));
      return;
    }
    setInput(next);
  };

  return (
    <div>
      <p className="ui text-[12.5px] leading-relaxed text-[#6b6050]">
        这一带的人用音高说话：风车的转速、灯塔的长短光、石阶的回声、冰裂的走向。都是同一件事。
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {SCALE.map((_, i) => (
          <button
            key={i}
            onClick={() => press(i)}
            disabled={state2 !== 'answer'}
            className="display relative h-16 rounded-2xl border-2 text-[15px] font-semibold transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              borderColor: NOTE_COLORS[i] + (active === i ? 'ff' : '44'),
              background: active === i ? NOTE_COLORS[i] + '38' : NOTE_COLORS[i] + '10',
              color: NOTE_COLORS[i],
              transform: active === i ? 'translateY(-2px)' : undefined,
              boxShadow: active === i ? `0 8px 20px -10px ${NOTE_COLORS[i]}` : undefined,
            }}
          >
            {NOTE_NAMES[i]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Chip tone="brass">第 {Math.max(1, round)} / 4 关</Chip>
        <Chip tone="ghost">
          {input.length} / {seq.length || 3} 个音
        </Chip>
      </div>

      <p className="ui mt-3 min-h-[40px] rounded-xl bg-[rgba(43,36,25,0.05)] px-3 py-2 text-[12px] leading-relaxed text-[#4a4032]">
        {msg}
      </p>

      <div className="mt-4 flex gap-2">
        {state2 === 'idle' || state2 === 'lost' || state2 === 'won' ? (
          <button onClick={begin} className="ui btn btn-brass h-11 flex-1 text-[13.5px]">
            {state2 === 'idle' ? '开始' : '再来一次'}
          </button>
        ) : (
          <button
            disabled={playing}
            onClick={() => playSeq(seq)}
            className="ui btn btn-ink h-11 flex-1 text-[13.5px]"
          >
            {playing ? '正在响…' : '再听一遍'}
          </button>
        )}
        <button onClick={onDone} className="ui btn btn-quiet h-11 px-5 text-[13px]">
          离开
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   host
   ============================================================ */

export default function MinigameModal({
  kind,
  title,
  onClose,
}: {
  kind: string | null;
  title: string;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!kind} onClose={onClose} title={title} sub={kind === 'tune' ? '听力试炼' : '赌一把'} tall>
      {kind === 'dice' && <DiceGame onDone={onClose} />}
      {kind === 'cards' && <CardsGame onDone={onClose} />}
      {kind === 'tune' && <TuneGame onDone={onClose} />}
    </Sheet>
  );
}
