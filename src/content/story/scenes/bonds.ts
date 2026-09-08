import type { Scene } from '../../../game/story/types';

/* ============================================================
   BOND SCENES

   Gated on tier, not on raw affection, so the numbers stay tunable.
   Each one either spends the relationship on something useful (a
   discount, a tool, a song) or spends it on the only thing this game
   really trades in: finding out one more true thing about somebody.

   Note the shape of 姜聿's scenes — they are all gated on
   `main_4` being unfinished. Chapter four is where she stops being
   available. A relationship you can miss is worth more than one that
   waits politely forever.
   ============================================================ */

export const BOND_SCENES: Scene[] = [
  /* ================= 苏芹 ================= */
  {
    id: 'b_su_1',
    title: '柜台后面的位置',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_su', side: 'left', as: 'calm' },
      { t: 'say', text: '店里没人。她在擦一个已经很干的杯子。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '坐柜台这头。窗边漏风，我说过。' },
      { t: 'say', text: '柜台这头只有一个位置，平常是她坐的。' },
      {
        t: 'choose',
        options: [
          {
            label: '坐过去。',
            do: [{ k: 'bond', who: 'ch_su', n: 5 }],
            goto: 'sit',
          },
          {
            label: '「那你坐哪。」',
            do: [{ k: 'bond', who: 'ch_su', n: 3 }],
            goto: 'where',
          },
        ],
      },
      { t: 'at', id: 'sit' },
      { t: 'say', text: '你坐下才发现，从这个角度能看见门口，看不见客人的脸。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '习惯了就好。先看见谁进来，比先看见谁在哭有用。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'where' },
      { t: 'say', who: 'ch_su', as: 'smile', text: '我站着。站了十九年。' },
      { t: 'at', id: 'end' },
      { t: 'say', text: '她给你倒了半杯，没记账。' },
      { t: 'do', do: [{ k: 'leisure', n: 2 }] },
      { t: 'exit' },
    ],
  },
  {
    id: 'b_su_2',
    title: '切鱼切掉的',
    line: 'bond',
    steps: [
      { t: 'say', text: '外面在下雨。店里只剩你们两个，和一盏灯。' },
      { t: 'enter', who: 'ch_su', side: 'left', as: 'calm' },
      { t: 'say', text: '她的左手小指缺了第一节。你看过很多次，从来没问。' },
      {
        t: 'choose',
        prompt: '今天呢',
        options: [
          {
            label: '还是不问。',
            hint: '不问也是一种交情',
            do: [{ k: 'bond', who: 'ch_su', n: 7 }],
            goto: 'silent',
          },
          {
            label: '「那根手指。」',
            do: [{ k: 'bond', who: 'ch_su', n: 4 }],
            goto: 'ask',
          },
        ],
      },
      { t: 'at', id: 'silent' },
      { t: 'say', text: '你什么也没说，把杯子推过去让她续。' },
      { t: 'say', who: 'ch_su', as: 'think', text: '……你今天特别不吵。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '是切鱼切掉的。' },
      { t: 'say', text: '「我没问。」' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '我知道。所以我说了。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'ask' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '切鱼切掉的。' },
      { t: 'say', text: '她说得太快了，快得像一句练过很多遍的话。' },
      { t: 'at', id: 'end' },
      {
        t: 'say',
        text: '雨大起来。她把灯芯往上拨了一点，然后说：「弹个不认识的。」',
      },
      { t: 'do', do: [{ k: 'insp', n: 1.8, hours: true }, { k: 'flag', id: 'flag_su_finger' }] },
      { t: 'exit' },
    ],
  },
  {
    id: 'b_su_3',
    title: '另开的那一页',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_su', side: 'left', as: 'smile' },
      { t: 'say', text: '她把账本翻到后面那一页推给你。上面记的不是钱。' },
      {
        t: 'say',
        text: '「晨雾码头」「风车麦野」「落樱石桥」……每一行后面有个日子，是你到的那天。',
      },
      { t: 'say', who: 'ch_su', as: 'calm', text: '有人问过你在哪。我照实说了。' },
      {
        t: 'choose',
        options: [
          {
            label: '「谁问的。」',
            do: [{ k: 'bond', who: 'ch_su', n: 4 }],
            goto: 'who',
          },
          {
            label: '「照实说就对了。」',
            do: [{ k: 'bond', who: 'ch_su', n: 6 }],
            goto: 'fine',
          },
        ],
      },
      { t: 'at', id: 'who' },
      { t: 'say', who: 'ch_su', as: 'think', text: '一个背匣子的。不说名字，只问路线。' },
      { t: 'say', text: '你想到了阿雀。也可能不是。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'fine' },
      { t: 'say', who: 'ch_su', as: 'smile', text: '我知道对。我就是想听你说一声。' },
      { t: 'at', id: 'end' },
      { t: 'do', do: [{ k: 'item', id: 'it_button' }, { k: 'flag', id: 'flag_su_page' }] },
      { t: 'say', text: '她从抽屉里拿出一颗黄铜纽扣按在你手里：「掉了就掉了，别回来找。」' },
      { t: 'exit' },
    ],
  },

  /* ================= 楮 ================= */
  {
    id: 'b_chu_1',
    title: '泡过海水的木头',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_chu', side: 'right', as: 'calm' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_chu' }] },
      { t: 'say', text: '铺子后面有个水槽，泡着七八块木头，海水，浑的。' },
      { t: 'say', who: 'ch_chu', as: 'calm', text: '别碰。泡了四个月了。' },
      { t: 'say', text: '「木头泡水不是会烂吗。」' },
      {
        t: 'say',
        who: 'ch_chu',
        as: 'think',
        text: '会。烂的那些本来就不该做琴。剩下的知道什么叫湿气，以后在海边不会走音。',
      },
      {
        t: 'choose',
        options: [
          {
            label: '把你的琴递过去。',
            hint: '麻线那根弦',
            do: [{ k: 'bond', who: 'ch_chu', n: 6 }],
            goto: 'lend',
          },
          {
            label: '「那你等四个月，靠什么吃饭。」',
            do: [{ k: 'bond', who: 'ch_chu', n: 4 }],
            goto: 'eat',
          },
        ],
      },
      { t: 'at', id: 'lend' },
      { t: 'say', text: '他看了一眼那根麻线，没说什么，换了一根真弦上去。' },
      { t: 'say', who: 'ch_chu', as: 'calm', text: '不收钱。麻线太难听，我睡不着。' },
      { t: 'do', do: [{ k: 'item', id: 'it_string' }] },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'eat' },
      { t: 'say', who: 'ch_chu', as: 'smile', text: '修琴。做琴不赚钱，修琴赚。' },
      { t: 'say', who: 'ch_chu', as: 'calm', text: '你们这种人的弦，三个月断一次，很准。' },
      { t: 'at', id: 'end' },
      { t: 'exit' },
    ],
  },
  {
    id: 'b_chu_2',
    title: '第八块',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_chu', side: 'right', as: 'calm' },
      { t: 'say', text: '水槽里只剩一块了。他把它捞出来，擦干，敲了一下，听。' },
      { t: 'say', who: 'ch_chu', as: 'calm', text: '这块活下来了。' },
      { t: 'say', text: '「做成什么。」' },
      { t: 'say', who: 'ch_chu', as: 'think', text: '看谁来拿。' },
      {
        t: 'choose',
        prompt: '你说',
        options: [
          {
            label: '「做把便宜的。让买不起的人也有。」',
            do: [
              { k: 'bond', who: 'ch_chu', n: 8 },
              { k: 'renown', n: 6 },
              { k: 'flag', id: 'flag_chu_cheap' },
            ],
            goto: 'cheap',
          },
          {
            label: '「做把最好的。给它一个配得上的人。」',
            do: [
              { k: 'bond', who: 'ch_chu', n: 6 },
              { k: 'upgrade', id: 'up_ring' },
            ],
            goto: 'best',
          },
          {
            label: '「留着。有些木头不该被做成东西。」',
            hint: '他会怎么想',
            do: [
              { k: 'bond', who: 'ch_chu', n: 3 },
              { k: 'insp', n: 3, hours: true },
            ],
            goto: 'keep',
          },
        ],
      },
      { t: 'at', id: 'cheap' },
      { t: 'say', who: 'ch_chu', as: 'smile', text: '你知道最好的木头做便宜琴，是什么感觉吗。' },
      { t: 'say', text: '「不知道。」' },
      { t: 'say', who: 'ch_chu', as: 'calm', text: '很爽。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'best' },
      { t: 'say', text: '他从墙上取下一个小盒，里面是一枚指环，铜的，内圈磨得发亮。' },
      { t: 'say', who: 'ch_chu', as: 'calm', text: '我师父的。他手比我小，你戴着试试。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'keep' },
      { t: 'say', text: '他没说话，把木头放回了水里。' },
      { t: 'say', who: 'ch_chu', as: 'think', text: '……那再泡四个月。' },
      { t: 'at', id: 'end' },
      { t: 'exit' },
    ],
  },

  /* ================= 阿雀 ================= */
  {
    id: 'b_que_1',
    title: '比你早到的人',
    line: 'bond',
    repeatable: false,
    steps: [
      { t: 'say', text: '你到的时候，最好的位置已经有人坐了——不是摆摊，只是坐着。' },
      { t: 'enter', who: 'ch_que', side: 'right', as: 'smile' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_que' }] },
      { t: 'say', who: 'ch_que', as: 'smile', text: '你比昨天早了一个时辰。你在赶什么？' },
      { t: 'say', text: '「你怎么知道我昨天什么时候到。」' },
      { t: 'say', who: 'ch_que', as: 'laugh', text: '我送信的。你走过的地方我都走过，只是比你早。' },
      { t: 'say', text: '她背上有一只匣子，木的，上了三道锁。' },
      {
        t: 'choose',
        options: [
          {
            label: '「匣子里是什么。」',
            do: [{ k: 'bond', who: 'ch_que', n: 3 }],
            goto: 'box',
          },
          {
            label: '让位置给她，自己往下挪三丈。',
            hint: '好位置一天只有一个',
            do: [
              { k: 'bond', who: 'ch_que', n: 7 },
              { k: 'coin', n: -0.3, hours: true },
            ],
            goto: 'yield',
          },
        ],
      },
      { t: 'at', id: 'box' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '没送出去的。' },
      { t: 'say', text: '「送不出去为什么还背着。」' },
      { t: 'say', who: 'ch_que', as: 'away', text: '……' },
      { t: 'say', who: 'ch_que', as: 'smile', text: '你弹一首我就告诉你。不是今天。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'yield' },
      { t: 'say', text: '她愣了一下，然后把匣子往边上挪了挪，腾出半个位置。' },
      { t: 'say', who: 'ch_que', as: 'shy', text: '……不用挪那么远。' },
      { t: 'say', text: '那天你挣得比平常少三成，但你听了一路的驿站闲话。' },
      { t: 'do', do: [{ k: 'leisure', n: 4 }] },
      { t: 'at', id: 'end' },
      { t: 'exit' },
      { t: 'say', text: '她走得比你早。以后每一站，你都会先看一眼最好的位置有没有人。' },
    ],
  },
  {
    id: 'b_que_2',
    title: '三道锁',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_que', side: 'right', as: 'calm' },
      { t: 'say', text: '她把匣子放在你们中间，开了两道锁，停在第三道上。' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '收信人死了。三年前。' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '规矩是退回寄信人。可寄信人也死了，比他早一年。' },
      { t: 'say', text: '「那按规矩该怎么办。」' },
      { t: 'say', who: 'ch_que', as: 'sad', text: '烧掉。' },
      {
        t: 'choose',
        prompt: '你说什么',
        options: [
          {
            label: '「那就烧。规矩是给活人立的。」',
            do: [
              { k: 'bond', who: 'ch_que', n: 5 },
              { k: 'var', id: 'v_que_burn', set: 1 },
              { k: 'flag', id: 'flag_que_burned' },
            ],
            goto: 'burn',
          },
          {
            label: '「念给我听。我算个听信的人。」',
            hint: '不合规矩',
            do: [
              { k: 'bond', who: 'ch_que', n: 9 },
              { k: 'insp', n: 3.5, hours: true },
              { k: 'flag', id: 'flag_que_read' },
            ],
            goto: 'read',
          },
          {
            label: '「你背了三年，不是为了问我。」',
            hint: '她自己知道该怎么办',
            do: [{ k: 'bond', who: 'ch_que', n: 7 }],
            goto: 'mirror',
          },
        ],
      },
      { t: 'at', id: 'burn' },
      { t: 'say', text: '她当着你的面烧了。火很小，烧得很久。' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '轻了。' },
      { t: 'say', text: '她把空匣子重新上了三道锁，还是背在背上。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'read' },
      { t: 'say', text: '她念了。信很短，是一个人写给另一个人的，说下个月麦子熟了就回来。' },
      { t: 'say', text: '就这一句。后面半页全是画的小人，歪歪扭扭，数了数是十七个。' },
      { t: 'say', who: 'ch_que', as: 'sad', text: '十七个月。他画了十七个月。' },
      { t: 'say', text: '那天晚上你写了一段旋律，只有十七个音。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'mirror' },
      { t: 'say', who: 'ch_que', as: 'shock', text: '……' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '你比我认识的所有人都讨厌。' },
      { t: 'say', text: '她锁上第三道锁，笑了一下。' },
      { t: 'at', id: 'end' },
      { t: 'exit' },
    ],
  },
  {
    id: 'b_que_3',
    title: '她的路线',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_que', side: 'right', as: 'smile' },
      { t: 'say', text: '她把自己的路线图摊在地上。上面的点比你那张多，而且是活的——有几处被划掉又重新画上。' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '这里，这里，这里。这三个地方没人摆摊。' },
      { t: 'say', text: '「为什么没人。」' },
      { t: 'say', who: 'ch_que', as: 'smile', text: '因为不好走。你不怕不好走。' },
      { t: 'do', do: [{ k: 'item', id: 'it_map_old' }, { k: 'renown', n: 10 }] },
      { t: 'say', text: '她撕了半张给你。撕的时候手很稳，撕完看了你一眼。' },
      { t: 'say', who: 'ch_que', as: 'shy', text: '别死在路上。我懒得替你报丧。' },
      { t: 'exit' },
    ],
  },

  /* ================= 姜聿 ================= */
  {
    id: 'b_jiang_1',
    title: '用脚听',
    line: 'bond',
    overlook: 'cliffbeacon',
    steps: [
      { t: 'enter', who: 'ch_jiang', side: 'left', as: 'calm' },
      { t: 'say', text: '她光着脚站在石地上，示意你开始。' },
      { t: 'say', text: '你弹了一段。她的脚趾跟着动，慢半拍，然后准了。' },
      { t: 'say', text: '她写：「你左手第三个音总是重。习惯，还是伤？」' },
      {
        t: 'choose',
        options: [
          {
            label: '「习惯。」',
            do: [{ k: 'bond', who: 'ch_jiang', n: 4 }],
            goto: 'habit',
          },
          {
            label: '「伤。小时候摔的。」',
            do: [
              { k: 'bond', who: 'ch_jiang', n: 7 },
              { k: 'flag', id: 'flag_jiang_hand' },
            ],
            goto: 'hurt',
          },
        ],
      },
      { t: 'at', id: 'habit' },
      { t: 'say', text: '她摇头，在纸上又写了一行：「习惯改得掉。你不想改。」' },
      { t: 'say', text: '「为什么。」' },
      { t: 'say', text: '「因为重的那个音，是你自己的。」' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'hurt' },
      { t: 'say', text: '她抓过你的左手，按了三个地方，第三下你缩了一下。' },
      { t: 'say', text: '她写：「别改。绕过去。」然后画了一个指法，你从来没见过。' },
      { t: 'do', do: [{ k: 'insp', n: 2.5, hours: true }] },
      { t: 'at', id: 'end' },
      { t: 'say', text: '灯在上面转，光一圈一圈刷过墙。她盯着光，说不出话地笑了一下。' },
      { t: 'exit' },
    ],
  },
  {
    id: 'b_jiang_2',
    title: '光会抖',
    line: 'bond',
    overlook: 'cliffbeacon',
    steps: [
      { t: 'enter', who: 'ch_jiang', side: 'left', as: 'calm' },
      { t: 'say', text: '她带你上了塔顶。灯很大，转得比你想的慢。' },
      { t: 'say', text: '她写：「高的音我听不见。但你弹高音的时候，光会抖。」' },
      { t: 'say', text: '「光怎么会抖。」' },
      { t: 'say', text: '「玻璃。」她指了指灯罩，「它替我听。」' },
      {
        t: 'choose',
        prompt: '你弹哪一段',
        options: [
          {
            label: '弹最高的那一句，一直弹到玻璃响。',
            do: [
              { k: 'bond', who: 'ch_jiang', n: 8 },
              { k: 'item', id: 'it_lens' },
            ],
            goto: 'high',
          },
          {
            label: '弹最低的那一段，让她用脚听完。',
            do: [
              { k: 'bond', who: 'ch_jiang', n: 6 },
              { k: 'insp', n: 3, hours: true },
            ],
            goto: 'low',
          },
        ],
      },
      { t: 'at', id: 'high' },
      { t: 'say', text: '第七遍的时候，灯罩上有一小块玻璃裂了。光在那道裂缝里分成两束。' },
      { t: 'say', text: '她伸手接住那两束光，很久没有动。' },
      { t: 'say', text: '临走她把那片碎镜给了你：「换一块就好。这个你带走。」' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'low' },
      { t: 'say', text: '她坐在地上，两只手掌都按着石头，一直按到曲子结束。' },
      { t: 'say', text: '然后写：「这一段我全听见了。谢谢。」' },
      { t: 'at', id: 'end' },
      { t: 'exit' },
    ],
  },

  /* ================= 白十一 ================= */
  {
    id: 'b_bai_1',
    title: '连输十一场的人',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_bai', side: 'right', as: 'smile' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_bai' }] },
      { t: 'say', text: '牌桌散了，只剩一个人在收骰子，一颗一颗擦干净。' },
      { t: 'say', who: 'ch_bai', as: 'smile', text: '白十一。别问本名，本名不吉利。' },
      { t: 'say', text: '「十一是什么。」' },
      { t: 'say', who: 'ch_bai', as: 'laugh', text: '连输十一场那年自己改的。改完输了第十二场。' },
      {
        t: 'choose',
        options: [
          {
            label: '「手气这么差还赌？」',
            do: [{ k: 'bond', who: 'ch_bai', n: 3 }],
            goto: 'why',
          },
          {
            label: '替他把桌子擦了。',
            hint: '不问',
            do: [{ k: 'bond', who: 'ch_bai', n: 6 }],
            goto: 'wipe',
          },
        ],
      },
      { t: 'at', id: 'why' },
      { t: 'say', who: 'ch_bai', as: 'calm', text: '我手气差，眼力好。' },
      { t: 'say', who: 'ch_bai', as: 'smile', text: '我看得出谁在骗，就是拦不住自己上桌。这两件事不冲突。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'wipe' },
      { t: 'say', text: '他看着你擦，没拦。' },
      { t: 'say', who: 'ch_bai', as: 'think', text: '……你不赌。' },
      { t: 'say', text: '「偶尔。」' },
      { t: 'say', who: 'ch_bai', as: 'calm', text: '偶尔的人才该赌。天天赌的都该改行。' },
      { t: 'at', id: 'end' },
      { t: 'exit' },
    ],
  },
  {
    id: 'b_bai_2',
    title: '教你看手',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_bai', side: 'right', as: 'calm' },
      { t: 'say', text: '他把三颗骰子扣在碗底，让你猜。你猜错了三次。' },
      { t: 'say', who: 'ch_bai', as: 'smile', text: '别看碗。看摇碗的人的小臂。' },
      {
        t: 'choose',
        prompt: '要不要学',
        options: [
          {
            label: '学。',
            hint: '他要收学费',
            need: { k: 'coin', min: 300 },
            lockNote: '他说学费三百枚，一枚不少',
            do: [
              { k: 'coin', n: -300 },
              { k: 'bond', who: 'ch_bai', n: 8 },
              { k: 'upgrade', id: 'up_dice' },
            ],
            goto: 'learn',
          },
          {
            label: '「你自己都赢不了，教我干什么。」',
            do: [{ k: 'bond', who: 'ch_bai', n: 2 }],
            goto: 'jab',
          },
          {
            label: '「不学。我怕学会了就想上桌。」',
            do: [
              { k: 'bond', who: 'ch_bai', n: 7 },
              { k: 'insp', n: 1.5, hours: true },
            ],
            goto: 'refuse',
          },
        ],
      },
      { t: 'at', id: 'learn' },
      { t: 'say', text: '他教了一个时辰，全是手臂、呼吸、和碗沿的响声，一句运气都没提。' },
      { t: 'say', who: 'ch_bai', as: 'calm', text: '记住：看得出来不等于赢。赢是另一门手艺，我没有。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'jab' },
      { t: 'say', who: 'ch_bai', as: 'laugh', text: '哈。会疼。' },
      { t: 'say', who: 'ch_bai', as: 'calm', text: '但你说得对。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'refuse' },
      { t: 'say', text: '他把骰子收了，很利索。' },
      { t: 'say', who: 'ch_bai', as: 'calm', text: '这话我十年前该有人对我说。' },
      { t: 'say', who: 'ch_bai', as: 'smile', text: '弹一个吧。我这两天不上桌。' },
      { t: 'at', id: 'end' },
      { t: 'exit' },
    ],
  },

  /* ================= 麦穗 ================= */
  {
    id: 'b_mai_1',
    title: '同伙',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_mai', side: 'right', as: 'smile' },
      { t: 'say', text: '她蹲在你摊子前面，蹲了半个时辰，一枚钱也没放。' },
      { t: 'say', who: 'ch_mai', as: 'smile', text: '你那天为什么不喊。' },
      { t: 'say', text: '「问过了。」' },
      { t: 'say', who: 'ch_mai', as: 'cross', text: '你没答。' },
      {
        t: 'choose',
        options: [
          {
            label: '「还回去了。第二年。」',
            do: [
              { k: 'bond', who: 'ch_mai', n: 7 },
              { k: 'flag', id: 'flag_mai_truth' },
            ],
            goto: 'yes',
          },
          {
            label: '「没有。」',
            do: [
              { k: 'bond', who: 'ch_mai', n: 5 },
              { k: 'var', id: 'v_never_returned', set: 1 },
            ],
            goto: 'no',
          },
        ],
      },
      { t: 'at', id: 'yes' },
      { t: 'say', who: 'ch_mai', as: 'think', text: '第二年。为什么等一年。' },
      { t: 'say', text: '「因为第一年我还觉得自己没错。」' },
      { t: 'say', who: 'ch_mai', as: 'away', text: '……' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'no' },
      { t: 'say', who: 'ch_mai', as: 'shock', text: '你居然说实话。' },
      { t: 'say', text: '「你想听假的？」' },
      { t: 'say', who: 'ch_mai', as: 'smile', text: '不想。大人都说假的。' },
      { t: 'at', id: 'end' },
      { t: 'say', text: '她走的时候往琴箱里放了一小束干麦穗，比钱不值钱，比钱难还。' },
      { t: 'do', do: [{ k: 'item', id: 'it_wheat' }] },
      { t: 'exit' },
    ],
  },
  {
    id: 'b_mai_2',
    title: '跑得比风车快',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_mai', side: 'right', as: 'laugh' },
      { t: 'say', text: '她要跟你比：她跑一圈风车，你弹完一首。' },
      { t: 'say', who: 'ch_mai', as: 'laugh', text: '我赢了你教我弹。你赢了我不烦你。' },
      {
        t: 'choose',
        options: [
          {
            label: '认真弹快版。',
            hint: '你大概能赢',
            chance: 0.6,
            do: [{ k: 'bond', who: 'ch_mai', n: 4 }],
            goto: 'won',
            miss: {
              goto: 'lost',
              text: '你少算了一件事：风车今天顺风。',
            },
          },
          {
            label: '故意弹慢。',
            hint: '让她赢',
            do: [
              { k: 'bond', who: 'ch_mai', n: 8 },
              { k: 'var', id: 'v_mai_taught', set: 1 },
            ],
            goto: 'lost',
          },
        ],
      },
      { t: 'at', id: 'won' },
      { t: 'say', text: '你最后一个音落下的时候，她还差二十步。' },
      { t: 'say', who: 'ch_mai', as: 'cross', text: '……再来一次。' },
      { t: 'say', text: '「明天。」' },
      { t: 'say', who: 'ch_mai', as: 'smile', text: '那明天你还在这儿。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'lost' },
      { t: 'say', text: '她冲回来的时候脸通红，手往你琴上一按，按住了三根弦。' },
      { t: 'say', text: '你教了她一个和弦。她按了四十遍，第四十一遍对了。' },
      { t: 'do', do: [{ k: 'insp', n: 2, hours: true }, { k: 'renown', n: 3 }] },
      { t: 'at', id: 'end' },
      { t: 'exit' },
    ],
  },

  /* ================= 释岫 ================= */
  {
    id: 'b_xiu_1',
    title: '一壶水',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_xiu', side: 'left', as: 'calm' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_xiu' }] },
      { t: 'say', text: '你上到云台的时候，水刚好开。他好像算准了。' },
      { t: 'say', who: 'ch_xiu', as: 'calm', text: '坐。凉了不好喝。' },
      { t: 'say', text: '「你怎么知道有人要来。」' },
      { t: 'say', who: 'ch_xiu', as: 'smile', text: '石阶第九级会响。' },
      {
        t: 'choose',
        options: [
          {
            label: '「你在这住多久了。」',
            do: [{ k: 'bond', who: 'ch_xiu', n: 3 }],
            goto: 'long',
          },
          {
            label: '什么也不问，把茶喝完。',
            do: [{ k: 'bond', who: 'ch_xiu', n: 6 }],
            goto: 'drink',
          },
        ],
      },
      { t: 'at', id: 'long' },
      { t: 'say', who: 'ch_xiu', as: 'think', text: '算不清了。云一天换四次，日子不好数。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'drink' },
      { t: 'say', text: '茶很淡，几乎只是热水，闻着像雨后的石头。' },
      { t: 'say', who: 'ch_xiu', as: 'calm', text: '很多人上来要听我讲。你是第一个只喝水的。' },
      { t: 'do', do: [{ k: 'item', id: 'it_teabrick' }] },
      { t: 'at', id: 'end' },
      { t: 'say', text: '下山的时候你数了一遍石阶。第九级真的会响。' },
      { t: 'exit' },
    ],
  },

  /* ================= 老驼 ================= */
  {
    id: 'b_dune_1',
    title: '第三遍',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_dune', side: 'left', as: 'calm' },
      { t: 'say', text: '他在沙上撒水，一小圈，很规矩。撒完坐下，说了同一句话三遍。' },
      { t: 'say', who: 'ch_dune', as: 'calm', text: '沙记得声音。沙记得声音。沙记得声音。' },
      { t: 'say', text: '第三遍的时候他看着你，像在等你接。' },
      {
        t: 'choose',
        options: [
          {
            label: '「那它记得谁的。」',
            do: [{ k: 'bond', who: 'ch_dune', n: 5 }],
            goto: 'whose',
          },
          {
            label: '把水囊接过来，替他撒完剩下的半圈。',
            hint: '不问',
            do: [{ k: 'bond', who: 'ch_dune', n: 9 }],
            goto: 'water',
          },
        ],
      },
      { t: 'at', id: 'whose' },
      { t: 'say', who: 'ch_dune', as: 'away', text: '记得走进去的那些。走出来的它就忘了。' },
      { t: 'say', text: '他没说自己属于哪一种。你也没敢算。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'water' },
      { t: 'say', text: '水一落地就没了，连痕都不留。可他盯着你撒的那半圈看了很久。' },
      { t: 'say', who: 'ch_dune', as: 'smile', text: '手稳。走沙路的手。' },
      { t: 'do', do: [{ k: 'item', id: 'it_sandglass' }] },
      { t: 'at', id: 'end' },
      { t: 'say', text: '天亮他就走了。沙上那一圈水痕在，直到中午。' },
      { t: 'exit' },
    ],
  },

  /* ================= 凿冰人 ================= */
  {
    id: 'b_fish_1',
    title: '一尺宽',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_fish', side: 'right', as: 'calm' },
      { t: 'say', text: '洞永远是一尺宽。他说宽了就有人想下去。' },
      { t: 'say', who: 'ch_fish', as: 'calm', text: '你昨天在冰上弹的那个，低的那段。别弹了。' },
      { t: 'say', text: '「为什么。」' },
      { t: 'say', who: 'ch_fish', as: 'away', text: '冰下面跟着响。' },
      {
        t: 'choose',
        options: [
          {
            label: '答应他，把那段划掉。',
            do: [{ k: 'bond', who: 'ch_fish', n: 8 }, { k: 'renown', n: 4 }],
            goto: 'agree',
          },
          {
            label: '就着洞口再弹一次，听清是什么在跟。',
            hint: '他不会拦你，但他会记住',
            chance: 0.45,
            do: [
              { k: 'bond', who: 'ch_fish', n: 3 },
              { k: 'insp', n: 3, hours: true },
              { k: 'journal', title: '冰下的和声', body: '低音那段响到第三拍，冰下面接了上来。不是回声——回声不会提前。' },
            ],
            goto: 'heard',
            miss: {
              text: '你弹了。冰下面什么也没有。凿冰人看着你，没说话，把洞盖上了。',
              do: [{ k: 'bond', who: 'ch_fish', n: -2 }],
              goto: 'end',
            },
          },
        ],
      },
      { t: 'at', id: 'agree' },
      { t: 'say', text: '他从桶里挑了一条最大的塞给你，动作很凶，像在赔什么。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'heard' },
      { t: 'say', text: '第三拍，冰下面接上来了。比你早半个音。' },
      { t: 'say', who: 'ch_fish', as: 'shock', text: '……你听见了。' },
      { t: 'say', who: 'ch_fish', as: 'sad', text: '那你现在也是两种下场里的一种了。' },
      { t: 'at', id: 'end' },
      { t: 'say', text: '你走的时候回头看了一眼。洞还是一尺宽。' },
      { t: 'exit' },
    ],
  },
];
