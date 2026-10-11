# 朱のうなじ

夜の映像に歌詞が重なる、一曲のためのミュージックフィルム。

## 動かし方

```
npm install
npm run dev
```

`0.0.0.0:8080` でプレビューする想定。

## コード

画面は [`src/components/film-player.tsx`](src/components/film-player.tsx)。譜面（場面・歌詞・長さ）は [`src/data/score.ts`](src/data/score.ts)。

次の人が触る前に **[SESSION.md](SESSION.md)** を読む。コーディング方針、コメント方針、やってはいけないことが、このリポジトリの中だけに書いてある。

配信・切り抜きの許可は **[TERMS.md](TERMS.md)**（アプリ内 `/terms`）。条件はタイトルを付けることだけ。
