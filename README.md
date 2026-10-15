# 株式会社ロマンライフ 新卒採用LP（2028・29年卒向け）

完成デザイン（`ロマンライフ_採用LPデザイン_SP版_20261014.png` / `PC版`）を HTML・CSS・JavaScript で再現した採用LPです。
文字はすべてHTMLテキストで、画像は写真・装飾のみです。

## 起動・ビルド

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 本番ビルド
npm run typecheck
```

Next.js（App Router）。Vercel ではフレームワーク「Next.js」、Root Directory はリポジトリ直下、ビルド設定は既定のままで動作します。

## 構成

| パス | 内容 |
| --- | --- |
| `src/app/page.tsx` | ページ本体（全セクション） |
| `src/app/globals.css` | スタイル。SP版デザイン（幅390px）を基準に実測した値 |
| `src/data/content.ts` | 文言・日程・FAQ などのデータ |
| `src/components/EntryForm.tsx` | エントリーフォーム（入力チェック・送信） |
| `src/components/Faq.tsx` | よくある質問（回答文は未設定。`FAQ_ANSWERS` に追加すると開閉します） |
| `src/app/api/entry/route.ts` | フォームの受け口。`ENTRY_WEBHOOK_URL` へ転送 |
| `tools/google-apps-script/` | スプレッドシートへ追記する Google Apps Script |
| `public/images/` | 写真（既存LPの元画像から、デザインと同じトリミングで書き出し）・装飾 |
| `public/images/sp/*-bg.webp` | 各セクションの背景装飾（デザイン画像から文字・写真を除去したもの） |

## エントリーフォーム

送信内容は `/api/entry` で再検証したうえで、環境変数 `ENTRY_WEBHOOK_URL`（と任意の `ENTRY_WEBHOOK_URL_BACKUP`）へ JSON で POST します。
受け口は `tools/google-apps-script/saiyo-entries-to-spreadsheet.gs` をウェブアプリとしてデプロイして用意してください（手順はファイル冒頭）。
`ENTRY_WEBHOOK_URL` が未設定の間は送信できず、デザインどおり「※本ページはデザイン確認用です。入力内容は送信されません。」が表示されます。

環境変数は `.env.example` を参照してください。
