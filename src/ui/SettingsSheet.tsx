import { useState } from 'react';
import { townsKnownAt } from '../game/systems/fame';
import { useGame } from '../game/store';
import { OVERLOOKS } from '../content/overlooks';
import { fmtNum } from '../game/engine';
import { Card, Divider, Sheet } from './bits';
import { sfx } from '../audio';

/* ============================================================
   SETTINGS — everything that is not the game

   These controls used to be a tab inside the journal, which put "reset
   my save" one tap away from "read my story". Anything that changes how
   the app behaves rather than what happens in it lives here now:
   widget mode, volume, who you are, and the pointers a new player needs.
   ============================================================ */

const TIPS: { id: string; t: string; b: string }[] = [
  {
    id: 'tip_idle',
    t: '放着不管',
    b: '关掉页面，主角照样在演奏。铜板、灵感、闲暇按小时累积，存满上限就该回来收了。',
  },
  {
    id: 'tip_collect',
    t: '回来收摊',
    b: '点开就是收菜：一次收下全部积累，同时读到你不在时发生的事。有些事要你当场答复。',
  },
  {
    id: 'tip_strategy',
    t: '改个策略',
    b: '换地方、换乐器、换三首曲子、换姿态。曲子和地方的气质对上，收益差得很明显。',
  },
  {
    id: 'tip_leisure',
    t: '花掉闲暇',
    b: '闲暇只在放置时长出来，只能花在探索上：逛市集、接委托、解谜、赌两把。',
  },
  {
    id: 'tip_scores',
    t: '八十一份',
    b: '你是澹人最后一个，族里的八十一份曲谱被抢散在各地。手记里的「古谱」记着九卷的缺口；旧谱箱、祠、废墟、市集最容易翻出散页。凑齐一整卷，你会弹出它原本的样子。',
  },
  {
    id: 'tip_fame',
    t: '名气分地方',
    b: '名气跟着地方走，只显示当前这一带对你的说法，从「无人识得」到「名动一方」五档。换个镇子要重新弹给人听；老地方会慢慢淡，但不会忘光。',
  },
  {
    id: 'tip_compose',
    t: '自己谱曲',
    b: '灵感不只用来应付奇遇。「制定策略」里可以谱曲：挑一两个听过的东西，说清这首为什么写，花灵感落笔。写出来的曲子只有你有，题名也随你改。',
  },
  {
    id: 'tip_story',
    t: '往下走',
    b: '主线解锁常规观景台，支线给你特殊景、乐器和谱子。探索地图跟着当前观景台变。',
  },
  {
    id: 'tip_crowd',
    t: '看看听众',
    b: '摊子边的人影会换。偶尔站着一个不太一样的——不一定会发生什么，多摆一会儿也许会说上话。',
  },
  {
    id: 'tip_widget',
    t: '当作桌面挂件',
    b: '观景模式是一整屏会动的风景，没有任何按钮。把它加到手机桌面，就是你自己的观景台。',
  },
];

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="ui text-[13px] text-[#3d3527]">{label}</p>
        {hint && <p className="ui mt-0.5 text-[10.5px] leading-snug text-[#6f6350]">{hint}</p>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

export default function SettingsSheet({
  open,
  onClose,
  onWidget,
}: {
  open: boolean;
  onClose: () => void;
  onWidget: () => void;
}) {
  const { state, toggleMotion, hardReset, setVolume, setProfile, replayIntro } = useGame();
  const [confirm, setConfirm] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const seen = OVERLOOKS.filter((o) => state.overlooks.includes(o.id)).length;

  return (
    <Sheet open={open} onClose={onClose} title="设置" sub="挂件、声音、你自己" tall>
      {/* ---------------- widget ---------------- */}
      <Divider label="桌面挂件" />
      <p className="ui text-[12px] leading-relaxed text-[#6b6050]">
        观景模式是一整屏会动的风景，没有任何按钮。加到手机桌面之后，它就是你自己的观景台。
      </p>
      <button
        onClick={() => {
          onClose();
          onWidget();
        }}
        className="ui btn btn-brass mt-2.5 h-11 w-full text-[13.5px]"
      >
        进入观景模式
      </button>

      {/* ---------------- sound ---------------- */}
      <Divider label="声音" />
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(state.volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          /* a tone fires on release rather than on every pixel of the drag —
             otherwise dragging the slider sounds like an alarm */
          onPointerUp={() => sfx.note(523.25)}
          onKeyUp={() => sfx.note(523.25)}
          className="flex-1"
          aria-label="音量"
        />
        <span className="ui tnum w-10 flex-none text-right text-[12px] text-[#6a5f4c]">
          {Math.round(state.volume * 100)}
        </span>
      </div>
      <p className="ui mt-1.5 text-[10.5px] leading-relaxed text-[#6f6350]">
        游戏里的声音都是现场合成的几个音，没有音频文件。拖完会试听一声。
      </p>

      {/* ---------------- profile ---------------- */}
      <Divider label="个人资料" />
      <div className="space-y-2.5">
        <label className="block">
          <span className="ui text-[10.5px] tracking-wider-2 text-[#6f6350] uppercase">昵称</span>
          <input
            value={state.profile.name}
            onChange={(e) => setProfile({ name: e.target.value.slice(0, 24) })}
            placeholder="走唱的"
            maxLength={24}
            className="field mt-1 w-full"
          />
        </label>
        <label className="block">
          <span className="ui text-[10.5px] tracking-wider-2 text-[#6f6350] uppercase">生日</span>
          <input
            type="date"
            value={state.profile.birthday}
            onChange={(e) => setProfile({ birthday: e.target.value })}
            className="field mt-1 w-full"
          />
        </label>
        <p className="ui text-[10.5px] leading-relaxed text-[#6f6350]">
          只存在这台设备上，路上的人偶尔会用得着。
        </p>
      </div>

      {/* ---------------- tips ---------------- */}
      <Divider label="新手指引" />
      <div className="space-y-1.5">
        {TIPS.map((x) => {
          const on = tip === x.id;
          return (
            <div
              key={x.id}
              className="overflow-hidden rounded-[14px] border border-[rgba(43,36,25,0.12)] bg-[rgba(255,253,246,0.6)]"
            >
              <button
                onClick={() => setTip(on ? null : x.id)}
                className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
              >
                <span className="display text-[14px] font-semibold text-[#2b2419]">{x.t}</span>
                <span className="ui text-[11px] text-[#8a6220]">{on ? '收起' : '看看'}</span>
              </button>
              {on && (
                <p className="ui px-3.5 pb-3 text-[12px] leading-relaxed text-[#6b6050]">{x.b}</p>
              )}
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          onClose();
          replayIntro();
        }}
        className="ui btn btn-quiet mt-2.5 h-10 w-full text-[12.5px]"
      >
        重看开场
      </button>

      {/* ---------------- display ---------------- */}
      <Divider label="显示" />
      <Row label="减少动效" hint="风景仍在，只是安静一些">
        <button
          onClick={toggleMotion}
          className={`ui btn h-8 px-3.5 text-[12px] ${state.reduceMotion ? 'btn-ink' : 'btn-quiet'}`}
        >
          {state.reduceMotion ? '已开' : '关'}
        </button>
      </Row>

      {/* ---------------- record ---------------- */}
      <Divider label="走过的路" />
      <div className="grid grid-cols-2 gap-2">
        {[
          { k: '收摊次数', v: fmtNum(state.collects) },
          { k: '总进账', v: fmtNum(state.totalCoin) },
          { k: '观景台', v: `${seen} / ${OVERLOOKS.length}` },
          /* how many places actually know you, rather than a fame number:
             the count is the interesting fact now that fame is regional */
          { k: '认得你的地方', v: `${townsKnownAt(state, 1)} / ${state.maps.length}` },
        ].map((x) => (
          <Card key={x.k}>
            <p className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">{x.k}</p>
            <p className="display tnum mt-1 text-[19px] font-semibold text-[#2b2419]">{x.v}</p>
          </Card>
        ))}
      </div>

      {/* ---------------- danger ---------------- */}
      <Divider label="存档" />
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="ui btn btn-quiet h-11 w-full px-4 text-[13px] text-[#7b3b46]"
        >
          重新开始
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={hardReset}
            className="ui btn h-11 flex-1 border border-[rgba(123,59,70,0.4)] bg-[rgba(123,59,70,0.12)] px-4 text-[13px] text-[#7b3b46]"
          >
            确定，全部忘掉
          </button>
          <button onClick={() => setConfirm(false)} className="ui btn btn-quiet h-11 px-4 text-[13px]">
            算了
          </button>
        </div>
      )}

      <p className="ui mt-5 mb-1 text-center text-[10.5px] leading-relaxed text-[#6f6350]">
        存档保存在这台设备的浏览器里 · 云游者 · The Wandering Lyre
      </p>
    </Sheet>
  );
}
