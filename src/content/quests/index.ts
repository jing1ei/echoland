import type { Quest } from '../../game/types';

/* ============================================================
   QUESTS — the main line is one long errand: eighty-one pages home

   Main chapters open regions (widget scenery) and each one is a region
   admitting what it did with your family's volume. Side stories unlock
   special overlooks, instruments, gear — and a few stray leaves that were
   carried a long way from where they were taken.

   Every chapter hands back one page outright (`reward.score`), so the
   chain keeps moving even when the exploration rolls are cold. The rest
   of a volume comes out of the map: scribes' chests, shrines, ruins,
   market stalls. See content/scores/ and game/systems/scores.ts.
   ============================================================ */

export const QUESTS: Quest[] = [
  /* ================= MAIN LINE ================= */
  {
    id: 'main_1',
    chapter: 1,
    line: 'main',
    title: '第一章 · 账本压着的那页',
    teaser: '你欠断桨酒馆四十七枚。老板娘的账本封皮，是你祖母的字。',
    opening:
      '你在盐汐港住了两个冬天，欠了四十七枚铜板，会弹三首曲子，其中两首是别人的。\n\n老板娘把账本推到你面前。你没看数字——你在看封皮：一张压平的旧纸，边上有一行小字，写法你只在祖母的手上见过。\n\n"这纸哪来的？"\n"祖上传的。硬，压账本正好。"',
    closing:
      '你把最后一枚拍在柜台上。老板娘看了一眼，没数，直接划掉了那一行，然后把封皮撕下来给了你。\n\n"你盯它两个月了。拿去。"\n\n纸摊开在膝上，你按上面的音随手弹了一段——琴自己接了下去，你没按的弦也响了。\n\n祖母说过：澹人不是会弹琴，是乐器肯听。你八岁那年只当是哄小孩的话。\n\n"往北走吧，"老板娘说，"麦子熟了的地方，纸多。"',
    objectives: [
      { kind: 'coinTotal', target: 1200, label: '累计挣到 1,200 枚铜板' },
      { kind: 'collect', target: 3, label: '收摊结账 3 次' },
      { kind: 'score', target: 1, ref: 'vol_tide', label: '找回一卷·潮的一页' },
    ],
    reward: { coin: 400, renown: 8, overlook: 'windmeadow', song: 'song_ferry', score: 'sc_1_1' },
  },
  {
    id: 'main_2',
    chapter: 2,
    line: 'main',
    title: '第二章 · 糊在窗上的谱',
    teaser: '磨坊村的窗纸厚得反常。逆光看，纸上有线，有点。',
    opening:
      '磨坊主给你搬了张凳子，让你坐在谷仓门口弹一整夜。谷仓每个月少三袋麦子，锁却从没被撬过。\n\n你答应了，但你整夜盯着的是他家的窗——天亮前那一阵光穿过来，窗纸上浮出五条线和一串点。\n\n二卷·麦。婚丧嫁娶、开镰收仓，你族里最热闹的九页，被人拿去糊了窗，挡风。',
    closing:
      '第七夜，三个孩子从麦垛后面钻出来，怀里各抱着一小袋。他们看见你，站住了。\n\n你继续弹，弹完那一段，才说："放回去，我不说。"\n最小的那个问："你为什么不说？"\n"因为我十二岁那年也拿过。"\n\n磨坊主给了双份工钱，还有那两张窗纸——他没问你要它做什么，只说："换了新的，一样挡风。"\n\n你在灯下把纸熨平。弹到第三行，风车在无风的夜里自己转了半圈。',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'mil_barn', label: '在磨坊村调查失窃的谷仓' },
      { kind: 'score', target: 2, ref: 'vol_wheat', label: '找回二卷·麦的两页' },
      { kind: 'coinTotal', target: 6000, label: '累计挣到 6,000 枚铜板' },
    ],
    reward: { coin: 1400, renown: 12, overlook: 'petalbridge', song: 'song_wheat', score: 'sc_2_1' },
    requires: ['main_1'],
  },
  {
    id: 'main_3',
    chapter: 3,
    line: 'main',
    title: '第三章 · 抄谱人的记性',
    teaser: '樱水町的抄谱人抄过太多东西，连自己抄过什么都忘了。',
    opening:
      '驿站有一格信匣积了三年灰，收信人写的是"在桥上弹琴的那个"。三年了，只有你符合。\n\n信里没有字，只有一页谱，末行断在半句上。落款不是名字，是一个记号——澹人抄谱时留的记号，意思是"下一页在别人手里"。',
    closing:
      '抄谱人翻了整晚的旧箱子，最后抱出一叠：\n\n"这些年我抄过的，都在这儿。哪些是我写的，哪些是我抄的，我早分不清了。"\n"这几页不是你写的。"\n"我知道，"他说，"写这个的人，落笔比我狠。"\n\n你把那半句补完，在桥上弹了一遍。一个老人从人群里走出来，说这是他女儿写的——她想找个能把它弹完的人，如今在潮鸣岬的灯塔守夜，耳朵早聋了。\n\n"她说，会有人替她听见。"',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'sak_post', label: '在驿站取出那封信' },
      { kind: 'score', target: 3, ref: 'vol_petal', label: '找回三卷·樱的三页' },
      { kind: 'inspTotal', target: 900, label: '累计获得 900 点灵感' },
    ],
    reward: { coin: 4200, renown: 18, overlook: 'cliffbeacon', song: 'song_letter', score: 'sc_3_1' },
    requires: ['main_2'],
  },
  {
    id: 'main_4',
    chapter: 4,
    line: 'main',
    title: '第四章 · 守夜人的册子',
    teaser: '灯塔的记录本一年一册。纸不够的时候，塔里的人用手边最厚的那种。',
    opening:
      '守夜人是个聋了的女人。她不看你的嘴，看你的手。\n\n"你弹的时候，石头会震，"她在纸上写，"我用脚听。"\n\n她让你每晚在塔下弹一个时辰，一共十二夜。第三夜你才看清她那些册子的封页——四卷·灯，守夜用的九页，被裁成了十二本记录本的硬壳。\n\n你的族人相信，只要有人整夜在弹，就没有船会走错。裁它的人，多半也这么想。',
    closing:
      '第十一夜她没有出现。第十二夜你自己上了塔，记录本摊在桌上，最后一页只有半句："今天听见了——"\n\n后面没有了。\n\n你在那一页下面补了一行："——四卷·灯，第二页，全曲，一个音都没错。"\n\n然后你替她转了一夜的灯，把十二本册子的封页一张张拆下来。天亮时海面上有九条船同时按了汽笛。\n\n你不知道那是巧合，还是回答。',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'tid_tower', label: '登上守夜人的塔' },
      { kind: 'score', target: 4, ref: 'vol_lamp', label: '找回四卷·灯的四页' },
      { kind: 'fame', target: 2, ref: '*any', label: '在某地混到「小有名气」' },
    ],
    reward: { coin: 12000, renown: 25, overlook: 'emberkiln', item: 'it_lens', score: 'sc_4_1' },
    requires: ['main_3'],
  },
  {
    id: 'main_5',
    chapter: 5,
    line: 'main',
    title: '第五章 · 窑灰里的黑边',
    teaser: '一炉陶器里烧出了不是陶器的东西：一页没烧完的谱，边上一圈黑。',
    opening:
      '窑工把那页焦纸从灰里挑出来给你："这不是我们放的。"\n\n五卷·火。照着它烧，器物不裂——你族里的说法，窑上的人后来只当是迷信，就把谱本身丢进了火里试。\n\n纸上的字迹你认得，和守夜人册子上的一模一样。可她已经不在了。',
    closing:
      '你把焦纸拿去问镇上最老的窑工。他看了很久：\n\n"这不是烧进去的，是长出来的。有些声音落在土里，土记着。你把土烧了，它就出来了。"\n"那这个记号——"\n"记号不重要。重要的是它想让你往哪走。"\n\n你按残页上剩下的四行弹了一遍。开窑那一炉，一百二十件，一件没裂。窑工们不说话，一个个把帽子摘了。\n\n焦纸背面有一行几乎看不见的划痕：一片沙丘，和一颗掉下来的星。',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'emb_kiln', label: '在开窑现场找到那页焦纸' },
      { kind: 'ownItem', target: 1, ref: 'it_score_burnt', label: '持有「烧焦的谱页」' },
      { kind: 'score', target: 4, ref: 'vol_ember', label: '找回五卷·火的四页' },
    ],
    reward: { coin: 30000, renown: 35, overlook: 'starfalldunes', song: 'song_ember', score: 'sc_5_1' },
    requires: ['main_4'],
  },
  {
    id: 'main_6',
    chapter: 6,
    line: 'main',
    title: '第六章 · 沙下的门',
    teaser: '风把沙吹开半尺，露出一段有弦孔的木头。',
    opening:
      '商队的老人不让你挖："沙下面的东西，是沙的。"\n\n可他自己整夜坐在那儿等你弹。你弹一段，他就往沙里撒一把水。\n\n"这样它才愿意说话。"\n\n他腰上挂着的皮囊里，卷着六卷·沙的三页。他不识字，只知道念着上面的节奏，骆驼就不闹。',
    closing:
      '第三夜，木头自己浮了上来。那是一把琴，弦不知是什么做的，夜里自己微微响。\n\n你伸手的时候，它先响了一声——不是被碰响，是应你。\n\n\n老人把皮囊解下来放在琴上："那这个也是你的。我念了三十年，一个字不懂。"\n"你念对了。"\n"我知道。骆驼不会撒谎。"\n\n你抱着琴走了很久才敢弹第一个音。响的时候，整片沙丘的沙同时下沉了一寸。',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'moo_dig', label: '挖开沙下的东西' },
      { kind: 'performAt', target: 3, ref: 'starfalldunes', label: '在星穹沙丘收摊 3 次' },
      { kind: 'score', target: 5, ref: 'vol_sand', label: '找回六卷·沙的五页' },
    ],
    reward: { coin: 80000, renown: 45, overlook: 'cloudtea', instrument: 'lyre_star', score: 'sc_6_1' },
    requires: ['main_5'],
  },
  {
    id: 'main_7',
    chapter: 7,
    line: 'main',
    title: '第七章 · 三百年的抄本',
    teaser: '云顶寺说：抄本可以看，原本不在人间。',
    opening:
      '"你弹得不错，"老僧说，"但不要弹得太好。会让人不想下山。"\n\n七卷·云在寺里，抄了三百年，抄本比原本多出上百份。你翻了三天抄本，发现十一处错——错得很有规律，像是有人故意让原本没法被复原。\n\n你问原本在哪。老僧把茶续满，没答。',
    closing:
      '第二十天，你弹了《没送到的信》。\n\n老僧听完，站起来，第一次走到石阶边上。\n\n"这是她的曲子。"\n"守夜人？"\n"我妹妹。"\n\n他从袖里取出九页原本，纸比抄本薄得多："错的十一处是我抄的。我怕它被拿走，就让每一份都缺一点。"\n"三百年前拿走它的人——"\n"是我们。"他说，"你们那一族被清干净的那年，我们把能藏的都藏了。藏得太好，连你都找了这么久。"\n\n他没有下山，只给了你一张画着极光和冻湖的图。"她小时候说湖底下有城。我说她胡说。现在我想听听有没有。"',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'clo_hall', label: '在老僧的堂中坐一次' },
      { kind: 'score', target: 5, ref: 'vol_cloud', label: '找回七卷·云的五页' },
      { kind: 'minigame', target: 5, ref: 'tune', label: '累计通过 5 次「听力」解谜' },
    ],
    reward: { coin: 200000, renown: 60, overlook: 'auroralake', song: 'song_cloud', score: 'sc_7_1' },
    requires: ['main_6'],
  },
  {
    id: 'main_8',
    chapter: 8,
    line: 'main',
    title: '第八章 · 冰替它保管',
    teaser: '冰凿开了。往下看，有不该在湖底的东西。',
    opening:
      '渔人凿的洞只有一尺宽。你趴下去看，看见了灯——很多灯，排成街道的样子。\n\n八卷·冰是全套里最难的一卷。你族里只在冬至弹它，弹完就把它冻起来。他们说：让它睡。\n\n渔人说他从不告诉外人："看见的人，要么发疯，要么开始写曲子。"',
    closing:
      '你在冰上坐了一整夜，把冰裂的纹路一段段抄下来——抄到第三段才反应过来，这不是纹路，这是谱。八卷睡在这儿，用整片湖当纸。\n\n天亮时你弹了它。冰面从湖心开始亮，一路亮到你脚下，然后整个湖回应了你。不是回声，是和声。\n\n渔人跪在雪地里哭。你没敢问他听见了什么。\n\n那天之后，你的琴箱里多了一小块不化的冰核，和一张标着十二个点的旧图的下半截。上半截在天上。',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'fro_hole', label: '在冰洞往下看一次' },
      { kind: 'score', target: 6, ref: 'vol_ice', label: '找回八卷·冰的六页' },
      { kind: 'ownItem', target: 1, ref: 'it_icecore', label: '持有「湖心冰核」' },
    ],
    reward: {
      coin: 600000,
      renown: 90,
      song: 'song_ice',
      map: 'whalebone',
      item: 'it_map_old',
      score: 'sc_8_1',
    },
    requires: ['main_7'],
  },
  {
    id: 'main_9',
    chapter: 9,
    line: 'main',
    title: '终章 · 第九卷自己来找你',
    teaser: '鲸骨集的摊主说：这一卷不用找。前八卷齐了，它会来找你。',
    opening:
      '鲸骨集搭在一根肋骨上。摊主看了你的琴，什么也没要，把旧图的上半截递过来。\n\n"九卷·骨不是写下来的，是听下来的。听云里的东西唱，一句一句记。"\n"记的人呢？"\n"就是你们那一族。所以他们才非死不可——有人不想让谁听懂天上的东西。"',
    closing:
      '你在天海界的崖上弹了很久，一卷一卷弹过去。云里的东西一只一只慢下来。\n\n最后一只从云中侧过身，把整个身体朝向你。它没有声音，但你听见了——一段低到听不见、却让骨头跟着震的旋律。\n\n你跟着它弹。它跟着你弹。你们弹了不知道多久。\n\n它走的时候落下一枚鳞，轻得不像真的。你把它嵌进琴上。\n\n八十一份还没齐。但从今天起，你知道剩下的每一页都还在，因为它们还在响，而你是这世上唯一还听得见的人。\n\n——你还是每天出摊。因为那只瞎眼的猫，还坐在缆桩上等。',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'wha_map', label: '在鲸骨集拿到旧图上半截' },
      { kind: 'score', target: 4, ref: '*vol', label: '凑齐整整四卷' },
      { kind: 'flag', target: 1, ref: 'flag_umbrella_met', label: '至少遇见过卖伞的姑娘一次' },
    ],
    reward: {
      coin: 2000000,
      renown: 300,
      overlook: 'whalefall',
      instrument: 'lyre_whale',
      song: 'song_whale',
      item: 'it_scale',
      score: 'sc_9_9',
    },
    requires: ['main_8'],
  },

  /* ================= SIDE LINE ================= */
  {
    id: 'side_umbrella',
    line: 'side',
    chapter: 0,
    title: '支线 · 卖伞的人',
    teaser: '雨天总有个姑娘站在你对面，一把伞也不卖。',
    opening:
      '她不吆喝，也不看人，只是站着。伞架上永远是同一排素面伞。\n\n有人说她不是在卖伞，是在等人。也有人说她就是雨。',
    closing:
      '你终于问出口："你每天站在这儿，到底在等什么？"\n\n"等有人在雨里不肯走。"她说，"你已经站了三十七天了。"\n\n她把伞铺的钥匙给了你，说旧灯街区最里面那条巷子的屋檐是干的，适合弹琴。\n\n你到现在也没弄清她是谁。但每次下雨，屋檐都是干的。',
    objectives: [
      { kind: 'flag', target: 1, ref: 'flag_umbrella_met', label: '在雨中遇见卖伞的姑娘' },
      { kind: 'ownItem', target: 1, ref: 'it_umbrella_paper', label: '持有「素面纸伞」' },
      { kind: 'collect', target: 12, label: '累计收摊 12 次' },
    ],
    /* a page of 三卷·樱 that walked south with her — 《伞骨谣》 */
    reward: { coin: 8000, renown: 20, overlook: 'rainlane', upgrade: 'up_umbrella', score: 'sc_3_3' },
  },
  {
    id: 'side_orchestra',
    line: 'side',
    chapter: 0,
    title: '支线 · 无人的乐团',
    teaser: '钟塔旧墟有十七个谱架，每个架上都还夹着谱子。',
    opening:
      '塔里没有人，但谱架排得整整齐齐，像刚散场。\n\n谱子上有翻页的折痕，很多层。藤蔓翻得比人勤。',
    closing:
      '你把十七个声部一句一句合起来，用了很久。合完的那天你在塔里弹了一遍。\n\n一个人，十七个声部，你只能挑着弹。可弹到中段，塔顶那口坏钟响了。\n\n第二遍时，藤蔓上的露水开始按拍子往下掉。\n\n你不觉得那是幻觉。你觉得那是他们在等这一天。',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'bel_score', label: '收集散落的十七个声部' },
      { kind: 'minigame', target: 3, ref: 'tune', label: '通过 3 次「听力」解谜' },
      { kind: 'inspTotal', target: 4000, label: '累计获得 4,000 点灵感' },
    ],
    /* 《无声颂》— a page of 七卷·云 that was bound into a lectern copy here */
    reward: {
      coin: 25000,
      renown: 35,
      overlook: 'belltower',
      song: 'song_orchestra',
      map: 'bellruin',
      score: 'sc_7_9',
    },
    requires: ['main_4'],
  },
  {
    id: 'side_lantern',
    line: 'side',
    chapter: 0,
    title: '支线 · 挂得最高的那个',
    teaser: '祭夜林最高的一枝上，挂着一个没写字的灯笼。',
    opening:
      '每年祭夜，全林的灯笼都会写满心愿。只有最高那一个是空的。\n\n"那是给唱歌的人留的，"卖灯笼的人说，"一百年了，还没人爬上去。"',
    closing:
      '你放下琴，爬上去了。\n\n上面很静，静得能听见整片林子的心愿在下面浮着。\n\n你在灯笼上写了四个字，然后发现笔迹正好压在原有的划痕上——一百年前，有人写过一样的四个字，被雨洗掉了。\n\n下来的时候所有人都在等你。你什么也没说，只是弹了一首新的。',
    objectives: [
      { kind: 'visitNode', target: 1, ref: 'lan_tree', label: '爬上最高的一枝' },
      { kind: 'flag', target: 1, ref: 'flag_wish_written', label: '在灯笼上写下心愿' },
      { kind: 'fame', target: 2, ref: '*towns:2', label: '有两个地方说得上「小有名气」' },
    ],
    reward: { coin: 90000, renown: 50, overlook: 'lanternwood', song: 'song_wish', map: 'lanternfair' },
    requires: ['main_5'],
  },
  {
    id: 'side_cat',
    line: 'side',
    chapter: 0,
    title: '支线 · 瞎眼猫',
    teaser: '它是你的第一个听众，也是唯一一个从不给钱的。',
    opening:
      '它每天来，坐同一个缆桩，听完就走。两个冬天，一次没缺。\n\n你没给它起名字。你觉得它已经有一个了。',
    closing:
      '你在仓库夹层里找到了它和它的项圈。铜牌上刻着一个不是你起的名字。\n\n你只带回了一样东西。\n\n那天晚上你写了《瞎眼猫的进行曲》——轻快、荒唐、莫名其妙地受欢迎。所有人都以为那是首开心的曲子。\n\n只有你知道，第三首之后停的那半拍是什么。',
    objectives: [
      { kind: 'flag', target: 1, ref: 'flag_cat_found', label: '找到瞎眼猫' },
      { kind: 'ownItem', target: 1, ref: 'it_catcollar', label: '持有「猫的旧项圈」' },
    ],
    reward: { coin: 6000, renown: 25, song: 'song_cat', upgrade: 'up_coffer' },
  },
  {
    id: 'side_dice',
    line: 'side',
    chapter: 0,
    title: '支线 · 磨光的骰子',
    teaser: '一个总输的赌客说，他有办法让你不输。',
    opening: '"我不作弊，"他说，"我只是把骰子磨了三年。"',
    closing:
      '他把那对骰子留给你，然后自己什么也没带就走了。\n\n"我赢够了。"他说。你后来算过，他这辈子净输。\n\n可他说得像真的。',
    objectives: [{ kind: 'minigame', target: 4, ref: 'dice', label: '在赌局中获胜 4 次' }],
    reward: { coin: 12000, renown: 10, upgrade: 'up_dice' },
    requires: ['main_2'],
  },
  {
    id: 'side_luthier',
    line: 'side',
    chapter: 0,
    title: '支线 · 老陈的考验',
    teaser: '"修琴不收钱，只收故事。你的故事够不够，我说了算。"',
    opening: '老陈把你的旧琴拆了，摊在桌上，说："先给我讲三件你不好意思讲的事。"',
    closing:
      '你讲了三件。他一句话没评价，把琴装回去，音准得离谱。\n\n然后他从墙上取下一支银笛："拿去。你的故事值这个。"\n\n"多少钱？"\n"你已经付了。"',
    objectives: [
      { kind: 'visitNode', target: 3, ref: 'sal_luthier', label: '拜访老陈的修琴铺 3 次' },
      { kind: 'collect', target: 6, label: '累计收摊 6 次' },
    ],
    reward: { coin: 1500, renown: 12, instrument: 'flute_silver' },
  },
  {
    id: 'side_scribe',
    line: 'side',
    chapter: 0,
    title: '支线 · 只用左手的抄谱人',
    teaser: '他右手全废了。他说这样刚好，弹不了，就只能抄。',
    opening: '"我抄过八百二十四首，"他说，"一首也不是我的。"',
    closing:
      '你把《没送到的信》口述给他，让他抄。抄完他看了很久。\n\n"这一首有个地方不对。"\n"哪里？"\n"不对得很好。别改。"\n\n他分文未取，反而给了你一叠他自己写的、从没给人看过的谱。',
    objectives: [
      { kind: 'visitNode', target: 2, ref: 'sak_scribe', label: '拜访抄谱人 2 次' },
      { kind: 'inspTotal', target: 2500, label: '累计获得 2,500 点灵感' },
    ],
    reward: { coin: 9000, renown: 18, song: 'song_beacon' },
    requires: ['main_3'],
  },
  {
    id: 'side_shrine',
    line: 'side',
    chapter: 0,
    title: '支线 · 一路的小祠',
    teaser: '每个镇子都有一个没人管的小祠。你养成了都去一趟的习惯。',
    opening: '不是信，是礼貌。走过别人的地方，总得打个招呼。',
    closing:
      '你在第七个小祠前放下最后一枚铜板的时候，忽然发现自己已经走了很远。\n\n远得可以回头看了。',
    objectives: [{ kind: 'visitNode', target: 7, ref: '*shrine', label: '在各地小祠参拜 7 次' }],
    reward: { coin: 20000, renown: 40, upgrade: 'up_journal' },
    requires: ['main_3'],
  },
  {
    id: 'side_collector',
    line: 'side',
    chapter: 0,
    title: '支线 · 收藏家',
    teaser: '有人愿意为"路上捡的破烂"付真钱。',
    opening: '"我不收贵的，"他说，"我收有人在意过的。"',
    closing:
      '他把你带来的东西一件件摆开，看了很久，然后全买了，价钱比你开的高。\n\n"你知道它们值钱在哪吗？"\n"不知道。"\n"值钱在你还记得每一件是谁给的。"',
    objectives: [{ kind: 'ownItem', target: 6, ref: '*trinket', label: '同时持有 6 件不同的纪念物' }],
    reward: { coin: 45000, renown: 25, upgrade: 'up_whistle' },
    requires: ['main_4'],
  },
  {
    id: 'side_wanderer',
    line: 'side',
    chapter: 0,
    title: '支线 · 云游者的规矩',
    teaser: '"在同一个地方待久了，就不叫云游者了。"',
    opening: '规矩只有一条：每个观景台都要留下至少一整场。',
    closing:
      '你数了数自己去过的地方，发现每一个都还记得你。\n\n这比钱难得，也比钱难保。',
    objectives: [{ kind: 'performAt', target: 6, ref: '*any', label: '在 6 个不同的观景台各完成一次收摊' }],
    reward: { coin: 150000, renown: 80, upgrade: 'up_cart' },
    requires: ['main_5'],
  },
  {
    id: 'side_wine',
    line: 'side',
    chapter: 0,
    title: '支线 · 酒馆的规矩',
    teaser: '每家酒馆的门板上都钉着委托。你渐渐认得所有人的字。',
    opening: '"接委托前先喝一杯，"老板娘说，"清醒的人接不了这里的活。"',
    closing:
      '你接完第十个委托的时候，老板娘把账本翻到最前面给你看。\n\n第一行还是那句"欠四十七枚"，被划掉了，旁边有人后来添了一句："此人后来还了很多次，每次都是别人的账。"',
    objectives: [
      { kind: 'visitNode', target: 10, ref: '*tavern', label: '在各地酒馆接洽 10 次' },
      { kind: 'fame', target: 2, ref: '*any', label: '在某地混到「小有名气」' },
    ],
    reward: { coin: 60000, renown: 45, upgrade: 'up_pass' },
    requires: ['main_4'],
  },
];

export const QUEST_MAP: Record<string, Quest> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
