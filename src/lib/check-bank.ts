/*
  この夜のソースだけを題材にした四択。推論で埋めない。
  一つの仕事は一つのファイルに置く。問いの形は四つ。
  担当、そのファイルが持つもの、持たないもの、同じファイルの隣の仕事。
*/

export type CheckQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  answer: string;
  file: string;
};

type Claim = { id: string; file: string; text: string };

const CLAIMS: Claim[] = [
  { id: "clock", file: "film-player.tsx", text: "時計は audio の currentTime" },
  { id: "scene-raw", file: "film-player.tsx", text: "場面は生の時刻で選ぶ" },
  { id: "lyric-off", file: "film-player.tsx", text: "歌詞の時刻は行のずれを引いたもの" },
  { id: "raf", file: "film-player.tsx", text: "rAF を回す" },
  { id: "write-time", file: "film-player.tsx", text: "音の currentTime を書く" },
  { id: "open-share", file: "film-player.tsx", text: "共有リンクを開く" },
  { id: "call-play", file: "film-player.tsx", text: "音を鳴らす play を呼ぶ" },
  { id: "no-offset-link", file: "film-player.tsx", text: "行のずれは共有リンクに載せない" },
  { id: "no-vocal", file: "film-player.tsx", text: "vocal.ts は戻さない" },
  { id: "class-names", file: "film-player.tsx", text: "歌詞と輸送のクラス名は変えない" },
  { id: "react-sparse", file: "film-player.tsx", text: "場面か行が変わったときだけ React を描き直す" },
  { id: "scrub-hold", file: "film-player.tsx", text: "指を離すまで currentTime は書かない" },
  { id: "seek-pause", file: "film-player.tsx", text: "再生中に位置を移すときは一度止めてから書く" },
  { id: "seek-ignore-pause", file: "film-player.tsx", text: "その一時停止では再生中の表示を消さない" },
  { id: "empty-section", file: "film-player.tsx", text: "行が無いときの節名は序" },
  { id: "empty-line", file: "film-player.tsx", text: "行が無いときの現在行は朱のうなじ" },

  { id: "paint-no-raf", file: "film-paint.ts", text: "毎フレーム塗るが rAF は開始しない" },
  { id: "paint-no-resume", file: "film-paint.ts", text: "続きの位置は保存しない" },
  { id: "wipe-span", file: "film-paint.ts", text: "白塗りの窓は lyricWipeSpan" },
  { id: "wipe-at", file: "film-paint.ts", text: "範囲が無い進みは lyricWipeAt" },
  { id: "wipe-char", file: "film-paint.ts", text: "範囲がある白塗りは文字ごと" },
  { id: "rewind-owns", file: "film-paint.ts", text: "くり返しの巻き戻し時刻を決める" },
  { id: "rewind-edge", file: "film-paint.ts", text: "くり返しの端の 0.08 秒前で巻き戻す" },
  { id: "loop-late", file: "film-paint.ts", text: "端を 0.25 秒超えたらくり返しを外す" },
  { id: "loop-early", file: "film-paint.ts", text: "武装中に頭より 0.35 秒前ならくり返しを外す" },
  { id: "remain", file: "film-paint.ts", text: "残り時間は負の時計で出す" },
  { id: "scrub-range", file: "film-paint.ts", text: "スクラブ中は range の value を書かない" },
  { id: "pin-drop", file: "film-paint.ts", text: "ピンより 0.05 秒あとへ進んだらピンを外す" },
  { id: "no-heard-wipe", file: "film-paint.ts", text: "行が無いときの塗り幅は 100%" },
  { id: "loop-floor", file: "film-paint.ts", text: "くり返しの終わりは頭から少なくとも 0.4 秒" },

  { id: "seek-no-media", file: "film-seek.ts", text: "音の要素も動画の要素も持たない" },
  { id: "seek-no-rewind", file: "film-seek.ts", text: "巻き戻しの時刻は計算しない" },
  { id: "clamp", file: "film-seek.ts", text: "シークは曲の長さの中に収める" },
  { id: "nan", file: "film-seek.ts", text: "シークの NaN は 0 にする" },
  { id: "into", file: "film-seek.ts", text: "動画の頭は場面の頭からの余り" },
  { id: "into-empty", file: "film-seek.ts", text: "長さが無い動画は動かさない" },
  { id: "step-next", file: "film-seek.ts", text: "行が無いとき先だけ最初の行へ行く" },
  { id: "step-prev", file: "film-seek.ts", text: "行が無いとき前はどこへも行かない" },
  { id: "seek-wait", file: "film-seek.ts", text: "移動中は次の currentTime を書かない" },
  { id: "seek-done", file: "film-seek.ts", text: "目的地まで 0.08 秒以内なら書き終える" },
  { id: "line-loop-exit", file: "film-seek.ts", text: "行のくり返しは行を出たら外す" },
  { id: "section-loop-exit", file: "film-seek.ts", text: "節のくり返しは節を出たら外す" },
  { id: "line-loop-arm", file: "film-seek.ts", text: "行のくり返しは最初から武装する" },

  { id: "play-no-el", file: "film-play.ts", text: "再生の切り替えは音の要素を持たない" },
  { id: "from-end", file: "film-play.ts", text: "終わりから押したら頭に戻してから鳴らす" },
  { id: "fail-gate", file: "film-play.ts", text: "再生の失敗はゲートへ戻す" },
  { id: "seek-fail", file: "film-play.ts", text: "シークから鳴らす失敗はゲートに戻さない" },
  { id: "on-play", file: "film-play.ts", text: "鳴り始めたら再生中にする" },
  { id: "pause-save", file: "film-play.ts", text: "止めたとき、終わりでなければ続きを残す" },
  { id: "end-clear", file: "film-play.ts", text: "曲が終わったら続きを消す" },
  { id: "play-nosave", file: "film-play.ts", text: "再生開始のイベントでは続きを保存しない" },

  { id: "graph-once", file: "film-audio.ts", text: "MediaElementSource は要素につき一度" },
  { id: "rebuild-el", file: "film-audio.ts", text: "グラフを付け直すときは要素を作り直す" },
  { id: "no-vocal-mod", file: "film-audio.ts", text: "歌なしに vocal.ts は使わない" },
  { id: "audio-no-resume", file: "film-audio.ts", text: "続きの位置もメディアセッションも持たない" },
  { id: "graph-karaoke", file: "film-audio.ts", text: "グラフは歌なしのときだけ作る" },
  { id: "hide-replace", file: "film-audio.ts", text: "タブが隠れたらグラフ付きの要素を捨てる" },
  { id: "rate-keep", file: "film-audio.ts", text: "要素を作り直しても再生速度は残す" },
  { id: "src", file: "film-audio.ts", text: "音源は /audio/shu.m4a" },
  { id: "audiosession", file: "film-audio.ts", text: "audioSession の型は playback" },
  { id: "double-dead", file: "film-audio.ts", text: "同じ要素にグラフを二度作らない" },

  { id: "video-mute", file: "film-video.ts", text: "場面の動画は音を消す" },
  { id: "video-play", file: "film-video.ts", text: "再生中なら場面の動画も再生する" },
  { id: "video-into", file: "film-video.ts", text: "動画の位置は場面の頭からの余り" },
  { id: "inline", file: "film-video.ts", text: "場面の動画は playsInline" },
  { id: "metadata", file: "film-video.ts", text: "長さが分かる前は loadedmetadata で置く" },
  { id: "resume-mute", file: "film-video.ts", text: "動画を再開するときも音は消したまま" },

  { id: "keys-input", file: "film-keys.ts", text: "入力欄ではキーを無視する" },
  { id: "keys-no-act", file: "film-keys.ts", text: "キーは意味だけ返し、再生もシークもしない" },
  { id: "key-step", file: "film-keys.ts", text: "左右のキーは 5 秒" },
  { id: "key-space", file: "film-keys.ts", text: "空白キーは再生の意味" },
  { id: "key-arrows", file: "film-keys.ts", text: "左右は矢印キーだけ" },

  { id: "share-pos", file: "film-share.ts", text: "共有に載せるのは再生位置" },
  { id: "share-no-off", file: "film-share.ts", text: "共有に行のずれは載せない" },
  { id: "share-tenth", file: "film-share.ts", text: "共有の時刻は 0.1 秒" },
  { id: "share-neg", file: "film-share.ts", text: "共有の負の時刻は 0" },
  { id: "share-replace", file: "film-share.ts", text: "今の URL の t を置き換える" },
  { id: "share-title", file: "film-share.ts", text: "共有の題は朱のうなじ" },
  { id: "share-flash", file: "film-share.ts", text: "共有の点滅は 1200 ミリ秒" },

  { id: "wake-play", file: "film-wake.ts", text: "再生中だけ画面を消さない" },
  { id: "wake-stop", file: "film-wake.ts", text: "再生を止めたら画面の保持を離す" },
  { id: "wake-back", file: "film-wake.ts", text: "タブに戻って再生中なら保持を取り直す" },
  { id: "wake-miss", file: "film-wake.ts", text: "画面の保持に非対応なら何もしない" },

  { id: "session-meta", file: "film-session.ts", text: "ロック画面へ出すメタデータを組む" },
  { id: "session-no-play", file: "film-session.ts", text: "ロック画面は再生そのものを持たない" },
  { id: "session-step", file: "film-session.ts", text: "ロック画面のステップは 10 秒" },
  { id: "session-title", file: "film-session.ts", text: "ロック画面の題も歌手も朱のうなじ" },
  { id: "session-seekto", file: "film-session.ts", text: "seekto は seekTime があるときだけ使う" },

  { id: "stage-title", file: "film-stage.tsx", text: "曲名の縦書きを出す" },
  { id: "stage-frames", file: "film-stage.tsx", text: "場面の絵と動画を重ねる" },
  { id: "night-lyrics", file: "film-night.tsx", text: "歌詞の三行と輸送を出す" },
  { id: "night-gate", file: "film-night.tsx", text: "ゲートの題は朱のうなじ" },
  { id: "night-dawn", file: "film-night.tsx", text: "終わったあとのゲートは朝の手前" },
  { id: "night-seek", file: "film-night.tsx", text: "シークの range は夜の輸送が持つ" },

  { id: "tools-lazy", file: "film-tools.tsx", text: "開いてから timing-panel を読む" },
  { id: "tools-timeline", file: "film-tools.tsx", text: "開いてから timeline-editor を読む" },
  { id: "tools-suspense", file: "film-tools.tsx", text: "タイミングの読みは Suspense に置く" },
  { id: "tools-closed", file: "film-tools.tsx", text: "夜を開いた直後には中身を読まない" },

  { id: "speeds", file: "film-speed.tsx", text: "タイミング用の速度は 10% 25% 50% 80% と等速" },
  { id: "speed-not-night", file: "film-speed.tsx", text: "遅い再生は夜の再生そのものではない" },
  { id: "digits", file: "film-speed.tsx", text: "0.01 秒は 0.1 秒の文字に潰さない" },
  { id: "ago-live", file: "film-speed.tsx", text: "開いているあいだ、調整の表示は秒で進む" },

  { id: "off-sign", file: "score.ts", text: "正のずれは行が早い" },
  { id: "off-sub", file: "score.ts", text: "正のずれは cue.t から引く" },
  { id: "off-scene", file: "score.ts", text: "場面の時刻にはずれを足さない" },
  { id: "off-range", file: "score.ts", text: "行のずれは -8 秒から 8 秒" },
  { id: "off-ms", file: "score.ts", text: "行のずれはミリ秒に丸める" },
  { id: "heard-clamp", file: "score.ts", text: "聞こえる時刻は 0 と曲の長さの間" },
  { id: "index-latest", file: "score.ts", text: "今以前で最も遅い行を現在行にする" },
  { id: "index-eps", file: "score.ts", text: "行の比較には 0.0001 秒の余裕がある" },
  { id: "span-min", file: "score.ts", text: "仮の白塗りは最短 0.4 秒" },
  { id: "span-last", file: "score.ts", text: "次が近いか最後の行の仮の長さは 3.2 秒" },
  { id: "span-nospeed", file: "score.ts", text: "仮の白塗りに範囲の速度は足さない" },
  { id: "section", file: "score.ts", text: "節は同じ section が続く範囲" },
  { id: "scene-min", file: "score.ts", text: "場面の長さの下限は 4 秒" },
  { id: "duration", file: "score.ts", text: "曲の長さは 227.33 秒" },
  { id: "sheet", file: "score.ts", text: "譜に出すのはずれた行だけで、見出しは # shu-cues" },
  { id: "sheet-eps", file: "score.ts", text: "0.0005 未満のずれは譜に出さない" },
  { id: "missing-cue", file: "score.ts", text: "行が無い cueHeardAt は 0" },
  { id: "scene-zero", file: "score.ts", text: "最初の場面の時刻は 0" },

  { id: "wipe-sep", file: "wipe-span.ts", text: "行の中の白塗りは行の頭のずれとは別" },
  { id: "wipe-plain", file: "wipe-span.ts", text: "範囲が無ければ行全体が速度 1" },
  { id: "wipe-speed", file: "wipe-span.ts", text: "白塗りの速度は 0.25 から 4" },
  { id: "wipe-off", file: "wipe-span.ts", text: "白塗りの始まりは -12 秒から 12 秒" },
  { id: "wipe-step", file: "wipe-span.ts", text: "白塗りの速度の段は 1.25 倍" },
  { id: "wipe-ostep", file: "wipe-span.ts", text: "白塗りの始まりの段は 0.05 秒" },
  { id: "wipe-ms", file: "wipe-span.ts", text: "保存する白塗りの始まりはミリ秒" },
  { id: "wipe-fill", file: "wipe-span.ts", text: "空いた文字は速度 1、ずれ 0 で埋める" },
  { id: "wipe-merge", file: "wipe-span.ts", text: "隣り合う同じ速度とずれは一つにつなぐ" },
  { id: "wipe-select", file: "wipe-span.ts", text: "文字を選んでから速さと始まりを付ける" },

  { id: "mem-700", file: "line-memory.ts", text: "行の送信は 700ms でまとめる" },
  { id: "mem-truth", file: "line-memory.ts", text: "行の正は lyric_lines" },
  { id: "mem-local", file: "line-memory.ts", text: "届かなかった行の控えは localStorage" },
  { id: "mem-lie", file: "line-memory.ts", text: "届いていない行を届いたことにしない" },
  { id: "mem-auth", file: "line-memory.ts", text: "行の控えは認証を持たない" },
  { id: "mem-formula", file: "line-memory.ts", text: "行の控えは塗りの式を持たない" },
  { id: "mem-lock", file: "line-memory.ts", text: "ロックだけ触っても調整時刻は進めない" },
  { id: "mem-pending", file: "line-memory.ts", text: "未送信のずれがあれば、その調整時刻を残す" },
  { id: "mem-when", file: "line-memory.ts", text: "調整時刻は行ごと" },
  { id: "mem-wipe", file: "line-memory.ts", text: "塗りの範囲は行の頭と一緒に送る" },

  { id: "resume-local", file: "resume-at.ts", text: "続きは今の画面だけに残す" },
  { id: "resume-server", file: "resume-at.ts", text: "続きはサーバに書かない" },
  { id: "resume-head", file: "resume-at.ts", text: "頭の 1 秒は続きに残さない" },
  { id: "resume-tail", file: "resume-at.ts", text: "終わりの 2 秒は続きに残さない" },
  { id: "resume-tenth", file: "resume-at.ts", text: "続きの保存は 0.1 秒" },
  { id: "resume-tick", file: "resume-at.ts", text: "再生中の続きは 2 秒に一度" },
  { id: "resume-pause", file: "resume-at.ts", text: "止めたときはその時刻を続きに書く" },
  { id: "resume-end", file: "resume-at.ts", text: "曲が終わったら続きを消す" },
  { id: "resume-url", file: "resume-at.ts", text: "リンクの t は丸めず、保存より先に置く" },
  { id: "resume-key", file: "resume-at.ts", text: "続きのキーは shu-resume" },

  { id: "ago-sec", file: "adjusted-ago.ts", text: "60 秒未満の調整は秒で言う" },
  { id: "ago-min", file: "adjusted-ago.ts", text: "60 分未満の調整は分で言う" },
  { id: "ago-hour", file: "adjusted-ago.ts", text: "24 時間未満の調整は時間で言う" },
  { id: "ago-day", file: "adjusted-ago.ts", text: "7 日未満の調整は日で言う" },
  { id: "ago-week", file: "adjusted-ago.ts", text: "30 日未満の調整は週で言う" },
  { id: "ago-month", file: "adjusted-ago.ts", text: "365 日未満の調整は月で言う" },
  { id: "ago-year", file: "adjusted-ago.ts", text: "それより古い調整は年で言う" },
  { id: "ago-nobody", file: "adjusted-ago.ts", text: "調整の文に人は紐づけない" },

  { id: "log-nocalc", file: "sync-log.ts", text: "同期ログは再生の計算をしない" },
  { id: "log-cap", file: "sync-log.ts", text: "同期ログは 80 行を超えたら古いものを捨てる" },
  { id: "log-stamp", file: "sync-log.ts", text: "同期ログの時刻は ISO の時刻部分" },
  { id: "log-hash", file: "sync-log.ts", text: "譜の印は文字列を畳んだハッシュ" },
  { id: "log-twelve", file: "sync-log.ts", text: "同期ログに出すずれは 12 行まで" },
  { id: "log-eps", file: "sync-log.ts", text: "0.0005 未満のずれは nonzero に数えない" },
  { id: "log-console", file: "sync-log.ts", text: "同期ログは console に [shu-sync] と出す" },

  { id: "ly-owner", file: "lyric-sync.ts", text: "lyric_lines に所有者はいない" },
  { id: "ly-noauth", file: "lyric-sync.ts", text: "行を認証で人に紐づけない" },
  { id: "ly-table", file: "lyric-sync.ts", text: "行の表は lyric_lines" },
  { id: "ly-get", file: "lyric-sync.ts", text: "行の読みは GET" },
  { id: "ly-post", file: "lyric-sync.ts", text: "行の書きは POST" },
  { id: "ly-batch", file: "lyric-sync.ts", text: "行の書きは一度に 80 行まで" },
  { id: "ly-ms", file: "lyric-sync.ts", text: "保存する行のずれは -8000 から 8000 ミリ秒" },
  { id: "ly-wipes", file: "lyric-sync.ts", text: "一つの行の塗りは 40 範囲まで" },
  { id: "ly-chars", file: "lyric-sync.ts", text: "塗りの文字位置は 0 から 80" },
  { id: "ly-upsert", file: "lyric-sync.ts", text: "行は line_index で upsert する" },

  { id: "kara-mid", file: "karaoke.ts", text: "歌は中央をキャンセルする" },
  { id: "kara-band", file: "karaoke.ts", text: "歌なしでも低域と高域は残す" },
  { id: "kara-low", file: "karaoke.ts", text: "歌なしの低域の境は 150Hz" },
  { id: "kara-high", file: "karaoke.ts", text: "歌なしの高域の境は 6500Hz" },
  { id: "kara-stages", file: "karaoke.ts", text: "歌なしのフィルタは 3 段" },
  { id: "kara-gain", file: "karaoke.ts", text: "歌なしのメイクアップは 1.6" },
  { id: "kara-dead", file: "karaoke.ts", text: "同じ audio に二度グラフを作ると音が死ぬ" },

  { id: "db-empty", file: "db.ts", text: "DATABASE_URL が空なら未設定" },
  { id: "db-blank", file: "db.ts", text: "空白だけの DATABASE_URL も未設定" },
  { id: "db-neon", file: "db.ts", text: "DATABASE_URL があれば neon" },
  { id: "db-pglite", file: "db.ts", text: "DATABASE_URL が無ければ pglite" },
  { id: "db-sql", file: "db.ts", text: "neon も pglite もタグ付き SQL と query を出す" },

  { id: "router-name", file: "router.tsx", text: "ルータは名前付きの getRouter" },
  { id: "router-rewrite", file: "router.tsx", text: "経路の書き換えは previewPathRewrite" },
  { id: "router-error", file: "router.tsx", text: "落ちた画面は AppErrorComponent" },
  { id: "router-routes", file: "router.tsx", text: "ページは src/routes に置く" },

  { id: "terms-title", file: "terms.tsx", text: "配信の条件はタイトルに朱のうなじと付けること" },
  { id: "terms-src", file: "terms.tsx", text: "配信規約の文言の正は TERMS.md" },
  { id: "terms-platform", file: "terms.tsx", text: "配信のプラットフォームは問わない" },
  { id: "terms-ask", file: "terms.tsx", text: "配信に事前連絡はいらない" },
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffled(id: string, answer: string, wrong: string[]): string[] {
  return [answer, ...wrong]
    .map((text, index) => ({ text, index, k: hash(`${id}\0${text}`) }))
    .sort((a, b) => a.k - b.k || a.index - b.index)
    .map((item) => item.text);
}

function others(claim: Claim): Claim[] {
  return CLAIMS.filter((item) => item.file !== claim.file);
}

function mates(claim: Claim): Claim[] {
  return CLAIMS.filter((item) => item.file === claim.file && item.id !== claim.id);
}

function take(pool: Claim[], id: string, count: number): Claim[] {
  const out: Claim[] = [];
  if (pool.length === 0) return out;
  const start = hash(id) % pool.length;
  for (let i = 0; out.length < count && i < pool.length * 2; i++) {
    const item = pool[(start + i) % pool.length];
    if (out.some((have) => have.text === item.text)) continue;
    out.push(item);
  }
  return out;
}

function files(): string[] {
  return [...new Set(CLAIMS.map((claim) => claim.file))];
}

export function buildCheckQuestions(claims: readonly Claim[] = CLAIMS): CheckQuestion[] {
  const questions: CheckQuestion[] = [];
  const seen = new Set<string>();
  const push = (question: CheckQuestion) => {
    const key = `${question.prompt}\n${question.choices.join("\n")}`;
    if (seen.has(key)) return;
    if (new Set(question.choices).size !== 4) return;
    if (!question.choices.includes(question.answer)) return;
    seen.add(key);
    questions.push(question);
  };

  for (const claim of claims) {
    const foreign = others(claim);
    const kin = mates(claim);
    const fileWrongs = take(
      files()
        .filter((file) => file !== claim.file)
        .map((file) => ({ id: file, file, text: file })),
      `${claim.id}:who`,
      3,
    ).map((item) => item.text);
    if (fileWrongs.length === 3) {
      push({
        id: `${claim.id}:who`,
        prompt: `「${claim.text}」を担当するファイルはどれか。`,
        choices: shuffled(`${claim.id}:who`, claim.file, fileWrongs),
        answer: claim.file,
        file: claim.file,
      });
    }

    const holdWrongs = take(foreign, `${claim.id}:hold`, 3).map((item) => item.text);
    if (holdWrongs.length === 3) {
      push({
        id: `${claim.id}:hold`,
        prompt: `次のうち、${claim.file} の仕事はどれか。`,
        choices: shuffled(`${claim.id}:hold`, claim.text, holdWrongs),
        answer: claim.text,
        file: claim.file,
      });
    }

    const lackAnswer = take(foreign, `${claim.id}:lack`, 1)[0];
    const lackWrongs = take(kin, `${claim.id}:lack`, 3).map((item) => item.text);
    if (lackAnswer && lackWrongs.length === 3) {
      push({
        id: `${claim.id}:lack`,
        prompt: `次のうち、${claim.file} が持たないものはどれか。`,
        choices: shuffled(`${claim.id}:lack`, lackAnswer.text, lackWrongs),
        answer: lackAnswer.text,
        file: claim.file,
      });
    }

    const beside = take(kin, `${claim.id}:beside`, 1)[0];
    const besideWrongs = take(foreign, `${claim.id}:beside`, 3).map((item) => item.text);
    if (beside && besideWrongs.length === 3) {
      push({
        id: `${claim.id}:beside`,
        prompt: `「${claim.text}」と同じファイルが、ほかに持つ仕事はどれか。`,
        choices: shuffled(`${claim.id}:beside`, beside.text, besideWrongs),
        answer: beside.text,
        file: claim.file,
      });
    }
  }
  return questions;
}

export const CHECK_QUESTIONS = buildCheckQuestions();
