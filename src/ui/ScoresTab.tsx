import { useState } from 'react';
import { useGame } from '../game/store';
import { SCORE_TEXT, SCORE_VOLUMES, VOLUME_SIZE, leavesOf } from '../content/scores';
import { SONG_MAP } from '../content/gear';
import { TOWN_MAP } from '../content/towns';
import { hasScore, scoresFound, volumeDone, volumeFound } from '../game/systems/scores';
import { Card, Chip, Divider, Meter } from './bits';

/* ============================================================
   THE EIGHTY-ONE — the collection page

   The main line, laid out honestly: nine volumes of nine leaves, most of
   them still missing. A found leaf shows its title. A missing one shows a
   blank box — not a locked padlock, not a percentage. The volume header
   carries the rumour about where its pages went, which is the only lead
   the game ever hands out for free.
   ============================================================ */

export default function ScoresTab() {
  const { state } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const found = scoresFound(state);

  return (
    <div>
      <p className="ui whitespace-pre-line text-[11.5px] leading-relaxed text-[#6b6050]">
        {SCORE_TEXT.premise}
      </p>

      <div className="mt-3 rounded-2xl border border-[rgba(43,36,25,0.12)] bg-[rgba(255,253,246,0.66)] px-3.5 py-3">
        <div className="flex items-baseline justify-between">
          <span className="display text-[15px] font-semibold text-[#2b2419]">
            {SCORE_TEXT.title}
          </span>
          <span className="ui tnum text-[11.5px] text-[#6f6350]">
            {SCORE_TEXT.allProgress(found)}
          </span>
        </div>
        <div className="mt-2">
          <Meter value={found} max={81} tone="#b8873f" />
        </div>
      </div>

      <Divider label="九卷" />
      <div className="space-y-2.5">
        {SCORE_VOLUMES.map((v) => {
          const n = volumeFound(state, v.id);
          const whole = volumeDone(state, v.id);
          const leaves = leavesOf(v.id);
          const showing = open === v.id;
          return (
            <Card key={v.id} onClick={() => setOpen(showing ? null : v.id)} active={showing}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="display text-[15.5px] font-semibold text-[#2b2419]">
                    {v.name}
                    <span className="ui ml-1.5 text-[10px] font-normal text-[#6f6350]">
                      {TOWN_MAP[v.town]?.name ?? ''}一带
                    </span>
                  </h4>
                  <p className="ui mt-0.5 text-[11.5px] leading-relaxed text-[#6b6050]">
                    {n > 0 ? v.lore : v.rumor}
                  </p>
                </div>
                <Chip tone={whole ? 'brass' : n > 0 ? 'ink' : 'ghost'} className="flex-none">
                  {whole
                    ? SCORE_TEXT.volumeDone
                    : n > 0
                      ? SCORE_TEXT.volumeProgress(n)
                      : SCORE_TEXT.volumeNone}
                </Chip>
              </div>

              {/* nine boxes: the shape of the volume is the progress bar */}
              <div className="mt-2 grid grid-cols-9 gap-1">
                {leaves.map((l) => {
                  const got = hasScore(state, l.id);
                  return (
                    <span
                      key={l.id}
                      className="h-[18px] rounded-[5px] border"
                      style={{
                        borderColor: got ? 'rgba(184,135,63,0.55)' : 'rgba(43,36,25,0.16)',
                        background: got ? 'rgba(184,135,63,0.28)' : 'rgba(43,36,25,0.045)',
                      }}
                    />
                  );
                })}
              </div>

              {showing && (
                <div className="fade-in mt-2.5 space-y-1">
                  {leaves.map((l) => {
                    const got = hasScore(state, l.id);
                    return (
                      <div key={l.id} className="flex items-baseline gap-2">
                        <span className="ui tnum w-[14px] flex-none text-[10px] text-[#a09684]">
                          {l.no}
                        </span>
                        <span
                          className={`ui text-[12px] ${got ? 'text-[#4a4032]' : 'text-[#a09684]'}`}
                        >
                          {got ? l.name : SCORE_TEXT.unknownLeaf}
                        </span>
                      </div>
                    );
                  })}
                  {whole && (
                    <p className="ui mt-1.5 text-[11.5px] text-[#4d5a38]">
                      全卷已成 · 你会弹{SONG_MAP[v.song]?.name ?? ''}了。
                    </p>
                  )}
                  {!whole && n >= VOLUME_SIZE - 2 && (
                    <p className="ui mt-1.5 text-[11.5px] text-[#8a6220]">就差最后几页了。</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <p className="ui mt-4 text-center text-[10.5px] leading-relaxed text-[#6f6350]">
        散页多在旧谱箱、祠、废墟和市集里。<br />
        一卷九页齐了，你会想起它原本的样子。
      </p>
    </div>
  );
}
