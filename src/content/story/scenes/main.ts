import type { Scene } from '../../../game/story/types';

/* ============================================================
   MAIN LINE SCENES

   These are the beats the quest chain cannot carry on its own. A quest
   gives you an objective and a closing paragraph; a scene gives you a
   person standing in front of you while you answer for yourself.

   Convention: main scenes use chance 1 in their trigger. They are not
   a lottery. Only the flavour around them is.
   ============================================================ */

export const MAIN_SCENES: Scene[] = [
  /* ---------------------------------------------------------- */
  {
    id: 'm1_ledger',
    title: '账本最后一行',
    line: 'main',
    chapter: 1,
    steps: [
      { t: 'say', text: '断桨酒馆的门轴响了十九年，谁都知道该往哪边推。' },
      { t: 'enter', who: 'ch_su', side: 'left', as: 'calm' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_su' }] },
      {
        t: 'say',
        who: 'ch_su',
        as: 'calm',
        text: '来了。坐那儿，别坐窗边，漏风。',
      },
      {
        t: 'say',
        text: '她把账本推过来，翻到最后一页。四十七枚，记在最靠边的那一行，已经快被裁纸的刀口吃掉半个字。',
      },
      {
        t: 'say',
        who: 'ch_su',
        as: 'calm',
        text: '我不催你。潮水会催。',
      },
      {
        t: 'choose',
        prompt: '你说什么',
        options: [
          {
            label: '「我会还。给我三个月。」',
            hint: '把日子说死',
            do: [
              { k: 'bond', who: 'ch_su', n: 3 },
              { k: 'var', id: 'v_su_promise', set: 1 },
            ],
            goto: 'promise',
          },
          {
            label: '「让我在店里弹，抵账。」',
            hint: '要有人听得下去才行',
            need: { k: 'renown', min: 3 },
            lockNote: '你现在弹得还不够让人愿意抵账',
            do: [
              { k: 'bond', who: 'ch_su', n: 5 },
              { k: 'leisure', n: 2 },
              { k: 'var', id: 'v_su_play', set: 1 },
            ],
            goto: 'play',
          },
          {
            label: '什么也没说，把帽子摘下来放在桌上。',
            hint: '帽子里有今天挣的全部',
            do: [{ k: 'bond', who: 'ch_su', n: 6 }],
            goto: 'hat',
          },
        ],
      },

      { t: 'at', id: 'promise' },
      { t: 'say', who: 'ch_su', as: 'smile', text: '三个月。行，我写上。' },
      {
        t: 'say',
        text: '她真的写上了。写完把笔横在那一行上，像是给它压了块石头。',
      },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'play' },
      {
        t: 'say',
        who: 'ch_su',
        as: 'think',
        text: '弹坏一个杯子算你的。弹哭一个客人算我的。',
      },
      { t: 'say', text: '这是她说过最接近"好"的一句话。' },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'hat' },
      {
        t: 'say',
        text: '帽子里是今天全部的进账，十一枚，还有一颗别人当钱给的贝壳。',
      },
      {
        t: 'say',
        who: 'ch_su',
        as: 'calm',
        text: '……贝壳我不收。',
      },
      {
        t: 'say',
        who: 'ch_su',
        as: 'smile',
        text: '但铜板我收。剩下的三十六，慢慢来。',
      },
      { t: 'do', do: [{ k: 'item', id: 'it_shell' }] },

      { t: 'at', id: 'close' },
      {
        t: 'say',
        who: 'ch_su',
        as: 'calm',
        text: '往北走有麦田。那边给钱的人多，听不听得懂另说。',
      },
      { t: 'exit' },
      {
        t: 'say',
        text: '你出门的时候回头看了一眼。她已经在给下一个人记账了，用的还是同一支笔。',
      },
      { t: 'do', do: [{ k: 'flag', id: 'flag_met_su' }] },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'm1_paid',
    title: '划掉那一行',
    line: 'main',
    chapter: 1,
    steps: [
      { t: 'enter', who: 'ch_su', side: 'left', as: 'calm' },
      { t: 'say', text: '你把最后一枚拍在柜台上。' },
      { t: 'say', text: '她没有数。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '嗯。' },
      { t: 'say', text: '一笔，横过去。那一行就没了。' },
      {
        t: 'say',
        who: 'ch_su',
        as: 'think',
        text: '还清了以后有个毛病：你会觉得自己自由了。其实只是没人再替你记着日子。',
      },
      {
        t: 'choose',
        prompt: '你怎么回',
        options: [
          {
            label: '「那你替我记着。」',
            do: [
              { k: 'bond', who: 'ch_su', n: 8 },
              { k: 'flag', id: 'flag_su_keeps_book' },
            ],
            goto: 'keep',
          },
          {
            label: '「日子我自己数得清。」',
            do: [{ k: 'bond', who: 'ch_su', n: 2 }],
            goto: 'own',
          },
        ],
      },

      { t: 'at', id: 'keep' },
      {
        t: 'say',
        who: 'ch_su',
        as: 'smile',
        text: '那得另开一页。这页记欠的，那页记走到哪了。',
      },
      { t: 'say', text: '她真的另翻了一页，在最上面写了两个字：云游。' },
      { t: 'goto', to: 'map' },

      { t: 'at', id: 'own' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '数得清的人不会欠十九个月的账。' },
      { t: 'say', text: '你没话说。' },

      { t: 'at', id: 'map' },
      { t: 'say', text: '然后她做了一件你盯了两个月都没敢开口的事：把账本的封皮撕了下来。' },
      {
        t: 'say',
        who: 'ch_su',
        as: 'calm',
        text: '硬纸，压账本正好。你每次结账都在看它，看得我烦。拿去。',
      },
      {
        t: 'say',
        text: '纸在你手里翻过来。五条线，一串点，音高不写在线上，写在字旁边——这不是这一带的写法。',
      },
      { t: 'say', text: '你把它对折了两次，塞进怀里，没有在柜台前打开第二遍。' },
      { t: 'say', text: '手在抖。你怕她看见。' },
      {
        t: 'do',
        do: [
          { k: 'score', id: 'sc_1_1' },
          {
            k: 'journal',
            title: '账本的封皮',
            body: '一卷·潮的第一页，被人拿去压了十九年的账。剩下八十页在别人手里，全都不知道自己是什么。',
          },
        ],
      },
      {
        t: 'say',
        text: '她又从围裙口袋里摸出一张纸，摊开——画在酒渍上的路线图，十二个点，最后一个画在云的上面。',
      },
      { t: 'say', who: 'ch_su', as: 'calm', text: '别问我从哪来的。往北走，麦子熟了的地方，纸多。' },
      { t: 'do', do: [{ k: 'chapter', set: 2 }] },
      { t: 'exit' },
      { t: 'say', text: '这一天之后，你真的上了路。不是为了走，是为了找。' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'm2_kids',
    title: '麦垛后面的三个',
    line: 'main',
    chapter: 2,
    steps: [
      { t: 'say', text: '第七夜。你弹到第三段的时候，麦垛后面有东西动了一下。' },
      { t: 'enter', who: 'ch_mai', side: 'right', as: 'shock' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_mai' }] },
      { t: 'say', text: '三个孩子，各抱着一小袋。最小的那个看见你，站住了，怀里的袋子漏了一线麦子出来。' },
      { t: 'say', text: '你没有停。你把那一段弹完了。' },
      { t: 'say', who: 'ch_mai', as: 'shock', text: '……你怎么不喊。' },
      {
        t: 'choose',
        prompt: '你怎么处理',
        options: [
          {
            label: '「放回去，我不说。」',
            hint: '你十二岁那年也拿过',
            do: [
              { k: 'bond', who: 'ch_mai', n: 9 },
              { k: 'flag', id: 'flag_mai_spared' },
            ],
            goto: 'spare',
          },
          {
            label: '「一袋留下，两袋放回去。」',
            hint: '一半的公道也是公道',
            do: [
              { k: 'bond', who: 'ch_mai', n: 5 },
              { k: 'renown', n: 2 },
              { k: 'var', id: 'v_mai_half', set: 1 },
            ],
            goto: 'half',
          },
          {
            label: '「明天自己去找磨坊主。」',
            hint: '你不替他们兜着',
            do: [
              { k: 'bond', who: 'ch_mai', n: 1 },
              { k: 'renown', n: 6 },
              { k: 'flag', id: 'flag_mai_reported' },
            ],
            goto: 'report',
          },
        ],
      },

      { t: 'at', id: 'spare' },
      { t: 'say', who: 'ch_mai', as: 'calm', text: '你为什么不说。' },
      { t: 'say', text: '「因为我十二岁那年也拿过。」' },
      { t: 'say', who: 'ch_mai', as: 'think', text: '……那你还回去了吗。' },
      { t: 'say', text: '你没答。她也没再问。' },
      { t: 'goto', to: 'after' },

      { t: 'at', id: 'half' },
      { t: 'say', who: 'ch_mai', as: 'think', text: '一袋。为什么是一袋。' },
      { t: 'say', text: '「因为你们三个人，一袋分得开，两袋会打起来。」' },
      { t: 'say', who: 'ch_mai', as: 'smile', text: '……你偷过。' },
      { t: 'goto', to: 'after' },

      { t: 'at', id: 'report' },
      { t: 'say', who: 'ch_mai', as: 'cross', text: '你跟他们一样。' },
      { t: 'say', text: '她把袋子放下，走了，走到一半又回头看了你一眼。那一眼你记了很久。' },

      { t: 'at', id: 'after' },
      { t: 'exit' },
      {
        t: 'say',
        text: '磨坊主后来什么也没问，工钱给了双份，还塞了一张往南的通行条。',
      },
      { t: 'do', do: [{ k: 'chapter', set: 3 }] },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'm3_keeper',
    title: '替她听见',
    line: 'main',
    chapter: 3,
    overlook: 'cliffbeacon',
    steps: [
      { t: 'say', text: '灯塔在崖上，风把你的话吹回你自己脸上。门是开着的。' },
      { t: 'enter', who: 'ch_jiang', side: 'left', as: 'calm' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_jiang' }] },
      { t: 'say', text: '她不看你的嘴。她看你的手。' },
      {
        t: 'say',
        text: '桌上有纸和炭笔。她写：「你弹的时候，石头会震。我用脚听。」',
      },
      {
        t: 'choose',
        prompt: '你做什么',
        options: [
          {
            label: '把《没送到的信》从头弹一遍。',
            hint: '你补完的那一句在里面',
            need: { k: 'song', id: 'song_letter' },
            lockNote: '你还没有那支曲子',
            do: [
              { k: 'bond', who: 'ch_jiang', n: 10 },
              { k: 'insp', n: 2.5, hours: true },
              { k: 'flag', id: 'flag_jiang_heard' },
            ],
            goto: 'letter',
          },
          {
            label: '把手按在墙上，让她先摸到节拍。',
            hint: '先对上，再弹',
            do: [
              { k: 'bond', who: 'ch_jiang', n: 6 },
              { k: 'insp', n: 1.2, hours: true },
            ],
            goto: 'wall',
          },
          {
            label: '在纸上写：「你听得见多少？」',
            hint: '也许该先问',
            do: [{ k: 'bond', who: 'ch_jiang', n: 3 }],
            goto: 'ask',
          },
        ],
      },

      { t: 'at', id: 'letter' },
      { t: 'say', text: '你弹到补上的那一段，她的手忽然按住了石墙。' },
      { t: 'say', who: 'ch_jiang', as: 'shock', text: '（她抬起头。）' },
      { t: 'say', text: '她写：「这是我写的。谁给你补的后半句。」' },
      { t: 'say', text: '「我自己补的。」' },
      { t: 'say', text: '她看了很久，然后把那张纸折起来，放进口袋。她没让你看她的脸。' },
      { t: 'goto', to: 'after' },

      { t: 'at', id: 'wall' },
      { t: 'say', text: '你敲了四下。她跟着敲了四下，慢半拍。第二遍就准了。' },
      { t: 'say', text: '她写：「大部分人第一次都想大声弹。」' },
      { t: 'goto', to: 'after' },

      { t: 'at', id: 'ask' },
      { t: 'say', text: '她想了一下，写：「低的听得见，高的看得见。」' },
      { t: 'say', text: '「看得见？」' },
      { t: 'say', text: '「灯的光会抖。」' },

      { t: 'at', id: 'after' },
      {
        t: 'say',
        text: '临走时她递给你一张纸条：「十二夜。每晚一个时辰，塔下。」',
      },
      { t: 'do', do: [{ k: 'chapter', set: 4 }, { k: 'flag', id: 'flag_twelve_nights' }] },
      { t: 'exit' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'm4_empty_page',
    title: '第十二夜',
    line: 'main',
    chapter: 4,
    overlook: 'cliffbeacon',
    steps: [
      { t: 'say', text: '第十一夜她没有出现。第十二夜你自己上了塔。' },
      { t: 'say', text: '记录本摊在桌上。最后一页只有半句：「今天听见了——」' },
      { t: 'say', text: '后面没有了。' },
      {
        t: 'choose',
        prompt: '你写什么',
        options: [
          {
            label: '「——《没送到的信》，全曲，一个音都没错。」',
            do: [
              { k: 'renown', n: 12 },
              { k: 'flag', id: 'flag_page_finished' },
              { k: 'journal', title: '记录本的最后一行', body: '你替她把那半句写完了。字比她的丑。' },
            ],
            goto: 'wrote',
          },
          {
            label: '合上本子，什么也不写。',
            hint: '有些句子不该由别人接',
            do: [
              { k: 'insp', n: 3, hours: true },
              { k: 'flag', id: 'flag_page_closed' },
            ],
            goto: 'closed',
          },
        ],
      },

      { t: 'at', id: 'wrote' },
      { t: 'say', text: '你写完，把笔放回原处，位置摆得和她一样。' },
      { t: 'goto', to: 'dawn' },

      { t: 'at', id: 'closed' },
      { t: 'say', text: '你把本子合上，用镇纸压好，怕风。' },

      { t: 'at', id: 'dawn' },
      { t: 'say', text: '你替她转了一夜的灯。' },
      {
        t: 'say',
        text: '天亮时，海面上有九条船同时按了汽笛。你不知道那是巧合还是回答。',
      },
      { t: 'do', do: [{ k: 'chapter', set: 5 }] },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'm7_brother',
    title: '不肯下山的听众',
    line: 'main',
    chapter: 7,
    overlook: 'cloudtea',
    steps: [
      { t: 'enter', who: 'ch_xiu', side: 'left', as: 'calm' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_xiu' }] },
      { t: 'say', text: '老僧把茶续满，第二十次说了同一句话。' },
      { t: 'say', who: 'ch_xiu', as: 'calm', text: '你弹得不错。但不要弹得太好。会让人不想下山。' },
      {
        t: 'choose',
        prompt: '你弹什么',
        options: [
          {
            label: '《没送到的信》。',
            hint: '你猜他等的是这个',
            need: { k: 'song', id: 'song_letter' },
            lockNote: '你还没有那支曲子',
            do: [
              { k: 'bond', who: 'ch_xiu', n: 12 },
              { k: 'flag', id: 'flag_xiu_heard' },
            ],
            goto: 'letter',
          },
          {
            label: '什么也不弹，陪他坐到天黑。',
            hint: '有时候这样也算回答',
            do: [{ k: 'bond', who: 'ch_xiu', n: 5 }],
            goto: 'sit',
          },
        ],
      },

      { t: 'at', id: 'letter' },
      { t: 'say', text: '他听完，站了起来。四十年里第一次走到石阶边上。' },
      { t: 'say', who: 'ch_xiu', as: 'sad', text: '这是她的曲子。' },
      { t: 'say', text: '「守夜人？」' },
      { t: 'say', who: 'ch_xiu', as: 'sad', text: '我妹妹。' },
      { t: 'say', text: '他没有下山。' },
      {
        t: 'say',
        who: 'ch_xiu',
        as: 'calm',
        text: '她小时候说湖底下有城。我说她胡说。现在我想听听有没有。',
      },
      { t: 'do', do: [{ k: 'insp', n: 4, hours: true }] },
      { t: 'goto', to: 'after' },

      { t: 'at', id: 'sit' },
      { t: 'say', text: '天黑的时候云从下往上漫过来，把石阶一级一级吃掉。' },
      { t: 'say', who: 'ch_xiu', as: 'calm', text: '你比大多数人能坐。' },
      { t: 'say', who: 'ch_xiu', as: 'think', text: '但我等的不是能坐的人。' },

      { t: 'at', id: 'after' },
      { t: 'exit' },
      { t: 'do', do: [{ k: 'chapter', set: 8 }] },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'm5_kiln',
    title: '窑火里的名字',
    line: 'main',
    chapter: 5,
    overlook: 'emberkiln',
    steps: [
      { t: 'say', text: '开窑那天全镇都来了。热气冲出来的时候，人往后退了一步，你没退。' },
      { t: 'say', text: '窑工从灰里挑出一页焦纸，捏着边角递给你，像递一块还在烫的炭。' },
      { t: 'say', text: '「这不是我们放的。」' },
      {
        t: 'say',
        text: '纸上的字迹你认得。和灯塔上那本记录本，一模一样。可她已经不在了。',
      },
      { t: 'enter', who: 'ch_que', side: 'right', as: 'think' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_que' }] },
      {
        t: 'say',
        who: 'ch_que',
        as: 'think',
        text: '我送过这个字。三年前，一整箱，寄件人没留名。',
      },
      { t: 'say', text: '「送到哪了。」' },
      { t: 'say', who: 'ch_que', as: 'away', text: '……没送到。' },
      {
        t: 'choose',
        prompt: '你追问吗',
        options: [
          {
            label: '「你背上那只匣子，是不是就是它。」',
            hint: '你早就想问了',
            need: { k: 'tier', who: 'ch_que', min: 2 },
            lockNote: '你们还没熟到能问她背上的东西',
            do: [
              { k: 'bond', who: 'ch_que', n: 6 },
              { k: 'var', id: 'v_que_box_asked', set: 1 },
            ],
            goto: 'box',
          },
          {
            label: '「那就别送了。」',
            hint: '有些信送到才是残忍',
            do: [
              { k: 'bond', who: 'ch_que', n: 4 },
              { k: 'insp', n: 1.5, hours: true },
            ],
            goto: 'stop',
          },
          {
            label: '把焦纸对着窑口的光举起来。',
            hint: '先看清再问',
            do: [
              { k: 'item', id: 'it_score_burnt' },
              { k: 'insp', n: 2.2, hours: true },
            ],
            goto: 'light',
          },
        ],
      },

      { t: 'at', id: 'box' },
      { t: 'say', text: '她没有点头，也没有摇头。她把肩带往上提了提，把匣子挪到背中间。' },
      { t: 'say', who: 'ch_que', as: 'sad', text: '驿使的规矩：没送到的东西，不许打开，不许丢，不许说。' },
      { t: 'say', text: '「第四条呢。」' },
      { t: 'say', who: 'ch_que', as: 'shy', text: '……没有第四条。' },
      { t: 'goto', to: 'after' },

      { t: 'at', id: 'stop' },
      {
        t: 'say',
        who: 'ch_que',
        as: 'cross',
        text: '你不懂。送不到的东西，才是最重的。你背过就知道。',
      },
      { t: 'say', text: '她说完自己愣了一下，好像那句话本来是要对别人说的。' },
      { t: 'goto', to: 'after' },

      { t: 'at', id: 'light' },
      { t: 'say', text: '火光从纸背透过来。焦黑的地方是空的，没烧透的地方是字。' },
      { t: 'say', text: '右下角有个签名，一个字，被烧掉了一半。剩下的那一半是「聿」。' },

      { t: 'at', id: 'after' },
      { t: 'do', do: [{ k: 'item', id: 'it_score_burnt' }] },
      { t: 'exit' },
      {
        t: 'say',
        text: '镇上最老的窑工听完，说：「这不是烧进去的，是长出来的。有些声音落在土里，土记着。」',
      },
      { t: 'say', text: '焦纸背面有一行几乎看不见的划痕：一片沙丘，和一颗掉下来的星。' },
      { t: 'do', do: [{ k: 'chapter', set: 6 }] },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'm6_sand',
    title: '沙记得声音',
    line: 'main',
    chapter: 6,
    overlook: 'starfalldunes',
    steps: [
      { t: 'say', text: '风把沙吹开半尺，露出一段有弦孔的木头。你伸手，被一根拐杖挡住了。' },
      { t: 'enter', who: 'ch_dune', side: 'left', as: 'cross' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_dune' }] },
      { t: 'say', who: 'ch_dune', as: 'cross', text: '沙下面的东西，是沙的。' },
      { t: 'say', text: '可他自己整夜坐在那儿。你弹一段，他就往沙里撒一把水。' },
      { t: 'say', who: 'ch_dune', as: 'calm', text: '这样它才愿意说话。' },
      {
        t: 'choose',
        prompt: '第三夜，你怎么弹',
        options: [
          {
            label: '弹《窑火里的名字》，把烧焦那页补完。',
            hint: '缺的那半句你自己补了',
            need: { k: 'song', id: 'song_ember' },
            lockNote: '你还没有那支曲子',
            do: [
              { k: 'bond', who: 'ch_dune', n: 10 },
              { k: 'insp', n: 4, hours: true },
              { k: 'flag', id: 'flag_sand_answered' },
            ],
            goto: 'ember',
          },
          {
            label: '照着他撒水的节奏弹，一滴一个音。',
            hint: '让他领拍',
            do: [
              { k: 'bond', who: 'ch_dune', n: 7 },
              { k: 'insp', n: 2.4, hours: true },
            ],
            goto: 'water',
          },
          {
            label: '什么也不弹，陪他等风。',
            hint: '沙自己会说',
            chance: 0.45,
            do: [{ k: 'bond', who: 'ch_dune', n: 4 }],
            goto: 'wait',
            miss: { text: '风一整夜都没来。老驼睡着了，你替他把水囊盖上。', goto: 'water' },
          },
        ],
      },

      { t: 'at', id: 'ember' },
      { t: 'say', text: '弹到补上的那一段，老驼的手停在半空，水撒了一半。' },
      { t: 'say', who: 'ch_dune', as: 'shock', text: '……你从哪学的这一句。' },
      { t: 'say', text: '「窑里烧出来的。」' },
      { t: 'say', who: 'ch_dune', as: 'sad', text: '那她到过这儿。' },
      { t: 'goto', to: 'rise' },

      { t: 'at', id: 'water' },
      { t: 'say', text: '一滴一个音，弹到第四十九滴，沙面上起了一圈很细的纹。' },
      { t: 'goto', to: 'rise' },

      { t: 'at', id: 'wait' },
      { t: 'say', text: '风来了。整片沙丘同时响了一声，像一张很大的纸被翻过去。' },

      { t: 'at', id: 'rise' },
      { t: 'say', text: '木头自己浮了上来。那是一把琴，弦不知是什么做的，在夜里自己微微响。' },
      { t: 'say', who: 'ch_dune', as: 'calm', text: '这是上一个走到这里的人留下的。' },
      { t: 'say', text: '「她后来去哪了。」' },
      { t: 'say', who: 'ch_dune', as: 'away', text: '往上。' },
      { t: 'say', text: '他指了指云。' },
      { t: 'exit' },
      {
        t: 'say',
        text: '你抱着那把琴走了很久才敢弹第一个音。响的时候，整片沙丘的沙同时下沉了一寸。',
      },
      { t: 'do', do: [{ k: 'chapter', set: 7 }] },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'm8_lake',
    title: '湖底的灯',
    line: 'main',
    chapter: 8,
    overlook: 'auroralake',
    steps: [
      { t: 'say', text: '渔人凿的洞只有一尺宽。你趴下去看。' },
      { t: 'say', text: '下面有灯。很多灯，排成街道的样子。' },
      { t: 'enter', who: 'ch_fish', side: 'right', as: 'away' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_fish' }] },
      {
        t: 'say',
        who: 'ch_fish',
        as: 'away',
        text: '看见的人，要么发疯，要么开始写曲子。我凿了三十年，两样都没轮到我。',
      },
      {
        t: 'choose',
        prompt: '你在冰上做什么',
        options: [
          {
            label: '把冰裂的纹路一段段抄下来。',
            hint: '一夜，冻得手不像自己的',
            do: [
              { k: 'insp', n: 5, hours: true },
              { k: 'bond', who: 'ch_fish', n: 8 },
              { k: 'flag', id: 'flag_ice_score' },
            ],
            goto: 'score',
          },
          {
            label: '把耳朵贴在冰上，只听。',
            hint: '不抄，记住',
            do: [
              { k: 'bond', who: 'ch_fish', n: 5 },
              { k: 'renown', n: 8 },
            ],
            goto: 'listen',
          },
          {
            label: '喊一声，看下面有没有人回。',
            hint: '未必是好主意',
            chance: 0.3,
            do: [{ k: 'insp', n: 3, hours: true }, { k: 'flag', id: 'flag_lake_answered' }],
            goto: 'shout',
            miss: {
              text: '你喊了。冰面把你的声音原样还了回来，一个字都没多。渔人没有笑你，这更难受。',
              goto: 'listen',
            },
          },
        ],
      },

      { t: 'at', id: 'score' },
      { t: 'say', text: '天亮时你手里有了一支曲子。你弹了它。' },
      { t: 'say', text: '冰面从湖心开始亮，一路亮到你脚下，然后整个湖回应了你。不是回声，是和声。' },
      { t: 'say', who: 'ch_fish', as: 'sad', text: '（他跪在雪地里，没有出声。）' },
      { t: 'say', text: '你没敢问他听见了什么。' },
      { t: 'goto', to: 'after' },

      { t: 'at', id: 'listen' },
      { t: 'say', text: '你听了一夜。低的那一层不是水声，是很多人同时很轻地说话。' },
      { t: 'say', who: 'ch_fish', as: 'calm', text: '你听见街了。' },
      { t: 'goto', to: 'after' },

      { t: 'at', id: 'shout' },
      { t: 'say', text: '底下有一盏灯，慢慢地，往你这边移了一段。' },
      { t: 'say', who: 'ch_fish', as: 'shock', text: '三十年了。它从来没动过。' },

      { t: 'at', id: 'after' },
      { t: 'do', do: [{ k: 'item', id: 'it_icecore' }] },
      { t: 'exit' },
      {
        t: 'say',
        text: '你的琴箱里多了一小块不化的冰核，和一张标着十二个点的旧图的下半截。上半截，在天上。',
      },
      { t: 'do', do: [{ k: 'chapter', set: 9 }] },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'm9_whalefall',
    title: '第十二个点',
    line: 'main',
    chapter: 9,
    steps: [
      { t: 'say', text: '鲸骨集搭在一根肋骨上。摊主看了你的琴，什么也没要。' },
      { t: 'enter', who: 'ch_que', side: 'left', as: 'calm' },
      { t: 'say', text: '她在那儿等着。背上的匣子第一次放在了地上。' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '收信人是「下一个走到这里的人」。' },
      { t: 'say', text: '「三年了，你怎么知道是我。」' },
      { t: 'say', who: 'ch_que', as: 'smile', text: '我不知道。我只是一直没送出去。' },
      { t: 'say', text: '匣子里是那张旧图的上半截。十二个点，第十二个画在云的上面。' },
      {
        t: 'choose',
        prompt: '你说什么',
        options: [
          {
            label: '「一起走完最后一段。」',
            hint: '你走了很远才敢说这句',
            need: { k: 'tier', who: 'ch_que', min: 3 },
            lockNote: '这句话现在说出来，你自己都不信',
            do: [
              { k: 'bond', who: 'ch_que', n: 14 },
              { k: 'flag', id: 'flag_que_together' },
            ],
            goto: 'together',
          },
          {
            label: '「这趟我一个人去。」',
            hint: '有些崖上只站得下一个人',
            do: [
              { k: 'bond', who: 'ch_que', n: 4 },
              { k: 'insp', n: 4, hours: true },
            ],
            goto: 'alone',
          },
          {
            label: '把图撕成两半，一半给她。',
            hint: '这样谁都得回来',
            do: [
              { k: 'bond', who: 'ch_que', n: 9 },
              { k: 'flag', id: 'flag_map_halved' },
            ],
            goto: 'halved',
          },
        ],
      },

      { t: 'at', id: 'together' },
      { t: 'say', who: 'ch_que', as: 'shy', text: '……我这趟没有别的件要送。' },
      { t: 'say', text: '她把空匣子留在了摊上。这是三年里她第一次两手空着走路。' },
      { t: 'goto', to: 'cliff' },

      { t: 'at', id: 'alone' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '那我在这儿等。反正我最会等。' },
      { t: 'goto', to: 'cliff' },

      { t: 'at', id: 'halved' },
      { t: 'say', text: '纸撕开的声音很小。她捏着自己那半，捏得很紧。' },
      { t: 'say', who: 'ch_que', as: 'cross', text: '你要是不回来，我就把这半张也送不出去。' },

      { t: 'at', id: 'cliff' },
      { t: 'exit' },
      { t: 'say', text: '你在天海界的崖上弹了很久。云里的东西一只一只慢下来。' },
      {
        t: 'say',
        text: '最后一只从云中侧过身，把整个身体朝向你。它没有声音，但你听见了——一段低到听不见、却让骨头跟着震的旋律。',
      },
      { t: 'say', text: '你跟着它弹。它跟着你弹。你们弹了不知道多久。' },
      { t: 'say', text: '它走的时候，落下一枚鳞。轻得不像真的。' },
      {
        t: 'do',
        do: [
          { k: 'item', id: 'it_scale' },
          { k: 'renown', n: 60 },
          { k: 'flag', id: 'flag_whale_heard' },
          {
            k: 'journal',
            title: '第十二个点',
            body: '你把鳞嵌进了琴上。八十一份还没齐，但从今天起你知道剩下的每一页都还在响，而这世上只剩你听得见。——第二天你还是出摊了。因为那只瞎眼的猫，还坐在缆桩上等。',
          },
        ],
      },
      { t: 'say', text: '第二天你还是出摊了。' },
    ],
  },
];
