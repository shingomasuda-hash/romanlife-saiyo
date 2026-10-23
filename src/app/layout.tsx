import type { Metadata, Viewport } from 'next';
import '@fontsource/shippori-mincho/500.css';
import '@fontsource/shippori-mincho/600.css';
import '@fontsource/shippori-mincho/700.css';
import '@fontsource/shippori-mincho/800.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || undefined;
const TITLE = '新卒採用 2028年卒向け｜株式会社ロマンライフ';
const DESCRIPTION =
  'お菓子の先にある、幸せを届ける仕事。株式会社ロマンライフ（マールブランシュ）の2028年卒向け新卒採用サイトです。仕事内容、求める人物像、数字で見るロマンライフ、社員の声、説明会の日時とエントリーフォームをご案内します。';

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: TITLE,
  description: DESCRIPTION,
  alternates: SITE_URL ? { canonical: '/' } : undefined,
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: '株式会社ロマンライフ 新卒採用',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#9b0000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
