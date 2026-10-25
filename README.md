# 株式会社ロマンライフ 新卒採用LP（2028年卒向け）

トップページ（`/`）は、デザイン担当から受け取った HTML/CSS（`romanlife-deploy-20261025`）を
`public/` にそのまま置き、`next.config.mjs` のリライトで配信しています。
Next.js はエントリーフォームの受け口（`/api/entry`）のために使っています。

## 起動・ビルド

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

Vercel ではフレームワーク「Next.js」、Root Directory はリポジトリ直下、ビルド設定は既定のままで動作します。

## 構成

| パス | 内容 |
| --- | --- |
| `public/index.html` | ページ本体（デザインデータ）。フォーム部分のみ送信用に変更（下記） |
| `public/recruit-v2.css` / `recruit-v2.js` | デザインデータのまま（無変更） |
| `public/assets/` | 画像・フォント・アイコン（デザインデータのまま。`fonts/fallback/` の分割フォントは同名の @fontsource 5.3.1 から補完） |
| `public/entry-form.js` / `entry-form.css` | フォームの入力チェック・送信・完了表示（追加ファイル） |
| `src/app/api/entry/route.ts` | フォームの受け口。`ENTRY_WEBHOOK_URL` へ転送 |
| `src/data/content.ts` / `src/lib/schema.ts` | 説明会日程・卒業予定年の選択肢と入力チェック（サーバー側） |
| `tools/google-apps-script/` | スプレッドシートへ追記する Google Apps Script |

### デザインデータからの変更点（`public/index.html`）

- フォームの各項目に `name`、選択肢に `value` を追加
- `onsubmit="return false"` を外し、送信ボタンを `type="submit"` に変更
- フォームの `aria-label` から「（デザインサンプル）」を削除
- `entry-form.css` / `entry-form.js` の読み込みを追加

説明会日程を変更するときは、`public/index.html`（表示とフォームの選択肢）と `src/data/content.ts` の両方を更新してください。

## エントリーフォーム

送信内容は `/api/entry` で再検証したうえで、環境変数 `ENTRY_WEBHOOK_URL`（と任意の `ENTRY_WEBHOOK_URL_BACKUP`）へ JSON で POST します。
受け口は `tools/google-apps-script/saiyo-entries-to-spreadsheet.gs` をウェブアプリとしてデプロイして用意してください（手順はファイル冒頭）。
`ENTRY_WEBHOOK_URL` が未設定の間は送信せず、デザインどおり「※本ページはデザイン確認用です。入力内容は送信されません。」が表示されます。
設定すると、この注記は自動で非表示になります。

環境変数は `.env.example` を参照してください。
