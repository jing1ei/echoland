/* ============================================================
   MEMORIES — flags and vars written on purpose, read by nothing yet

   Every branch in this game leaves a mark: a flag when the player took
   a side, a var when they picked one of three answers. Most of those
   marks are placed long before the scene that pays them off is written.
   That is fine — it is how a long story gets authored — but it looks
   exactly like a typo (`flag_su_page` set, `flag_su_pages` read) and a
   typo silently locks content forever.

   So the deal is: a write-only flag is legal, but it has to be listed
   here with a line saying what it remembers. content/audit.ts then
   advises on anything written and neither read nor listed, and on
   anything listed that has since found a reader (delete the line).

   Read this file as the callback backlog. Every entry is a scene
   somebody could write tomorrow with no new plumbing.
   ============================================================ */

export const MEMORIES: Record<string, string> = {
  /* --- 苏木：断桨酒馆的老板娘，第一章欠的那四十七枚 --- */
  v_su_promise: '你把还钱的日子说死了（三个月）',
  v_su_play: '你要求在店里弹琴抵账',
  flag_su_keeps_book: '你请她替你记着账本封皮的事',
  flag_su_finger: '你注意到她那根手指的伤，她的解释太顺了',
  flag_su_page: '她给了你那颗黄铜纽扣，让你别回来找',
  v_su_lied: '账目不对时你替自己圆了一句',

  /* --- 麦：磨坊村偷谷子的三个孩子 --- */
  flag_mai_spared: '你放走了偷谷子的孩子',
  flag_mai_reported: '你让他们自己去认',
  v_mai_half: '你判了一半的公道：一袋留下，两袋放回',
  flag_mai_truth: '她后来承认第二年把东西还回去了',
  v_mai_taught: '你故意弹慢，让她赢一次',
  v_never_returned: '你说过你没回去过',

  /* --- 阿雀：背匣子的抄谱人 --- */
  v_que_box_asked: '你问出了她背上那只匣子的来历',
  v_que_burn: '你主张烧掉不该留的东西',
  flag_que_burned: '真的烧了',
  flag_que_read: '你让她把信念出来，坏了规矩',
  flag_que_together: '你说了一起走完最后一段',
  flag_map_halved: '图撕成两半，一半在她手里——谁都得回来',

  /* --- 楚：做琴的 --- */
  flag_chu_cheap: '你劝他做便宜的琴，让买不起的人也有',
  flag_chu_soaked: '风雨里你先抱的是钱匣，不是他的活儿',

  /* --- 江、修、白：路上遇见的人 --- */
  flag_jiang_hand: '他说手上的伤是小时候摔的',
  flag_jiang_heard: '他听完了整首《没送到的信》',
  flag_xiu_heard: '你猜对了他等的那一首',
  v_bai_covered: '你把骰子换回他口袋，只让他知道你知道',
  flag_dice_called: '你当着满桌人说那颗骰子磨过',

  /* --- 摊边的常客（content/visitors） --- */
  flag_hood_asked: '压着帽檐的那位问过你路线',
  flag_hood_paid: '他留下一枚不该出现在这个港口的银币',
  flag_case_heard: '你听过匣子里那把琴响的八个小节',
  flag_glow_waiting: '发光的那位在等你弹出某一首',
  flag_storm_known: '有孩子记得去年那场雨里你弹的是哪首',

  /* --- 澹人与八十一页（content/story/scenes/lineage.ts） --- */
  v_leaf_played: '拿到第一页就直接弹了',
  flag_lineage_careful: '你守了老规矩：先抄一份，再弹原件',
  flag_lineage_known: '你听懂了祖母那句「澹人只是让琴愿意」',
  v_volume_twice: '你把整卷从头弹了第二遍，确认不是幻觉',
  flag_volume_done: '第一卷九页齐了',
  flag_page_finished: '你替她把那半句写完了',
  flag_page_closed: '你合上了本子，一个字没写',
  flag_ice_score: '你抄下了冰裂的纹路，冻了一夜',
  flag_sand_answered: '烧焦那页缺的半句是你自己补的',
  flag_lake_answered: '你朝湖下喊了一声，有人回了',
  flag_whale_heard: '那东西跟着你弹过，走时落下一枚鳞',
  flag_twelve_nights: '塔下十二夜，每晚一个时辰',

  /* --- 零散 --- */
  flag_apprentice: '你收下了那个想学琴的',
  flag_saw_fall: '你看着它落下来，跟着弹了一段',
  v_wet: '你护住了琴，自己站在雨的外沿',
};
