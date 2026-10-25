/**
 * トップページ（/）は public/index.html（デザインデータの HTML/CSS）を next.config.mjs のリライトで配信する。
 * このレイアウトは API ルート等、Next.js 側のページのためのもの。
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
