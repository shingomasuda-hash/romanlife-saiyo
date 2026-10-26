import { NextResponse, type NextRequest } from 'next/server';
import { SESSIONS, sessionLabel } from '@/data/content';
import { entrySchema } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC_ERROR = '送信中に問題が発生しました。時間をおいて再度お試しください。';

function fail(status: number, message: string, fieldErrors?: Record<string, string>) {
  return NextResponse.json({ ok: false, message, fieldErrors }, { status });
}

/** 同一オリジンからの送信のみ受け付ける（CSRF 対策） */
function isSameOrigin(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get('x-forwarded-host') ?? req.headers.get('host'));
  } catch {
    return false;
  }
}

/** 簡易な送信回数制限（同一IPから 10 分に 5 回まで） */
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

/** 二重送信対策：同じ submissionId は 1 度だけ受け付ける */
const processed = new Map<string, number>();

function toJst(d: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * 受け口（Google Apps Script のウェブアプリ等）へ送信する。
 * GAS は失敗時も 200 を返すことがあるため、本文の {"ok":true} まで確認する。
 * 一時的な失敗に備えて 1 回だけ再試行する。
 */
async function post(url: string, label: 'primary' | 'backup', payload: unknown): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
      const text = await res.text();
      let ok = false;
      try {
        ok = res.ok && (JSON.parse(text) as { ok?: boolean }).ok === true;
      } catch {
        ok = false;
      }
      if (ok) return true;
      console.error(`[entry] ${label} 受け口が失敗 attempt=${attempt} http=${res.status} body=${text.slice(0, 200)}`);
    } catch (err) {
      console.error(`[entry] ${label} 受け口へ送信できません attempt=${attempt} ${String(err)}`);
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/**
 * エントリー内容をサーバーログ（Vercel → Logs）へ残す。成功・失敗のどちらも記録する。
 * スプレッドシートへ届かなかった場合でも、ここから内容を復元できる。
 * Vercel の Logs で「RECORD」を検索すると全件、「status=failed」で取りこぼし分だけが出る。
 * ※ 閲覧できるのは Vercel プロジェクトのメンバーのみ。保存期間はプランに依存。
 */
function logRecord(record: Record<string, unknown>, status: 'ok' | 'partial' | 'failed', detail = ''): void {
  const line = `[entry][RECORD] status=${status}${detail ? ' ' + detail : ''} ${JSON.stringify(record)}`;
  if (status === 'ok') console.log(line);
  else console.error(line);
}

/** フォームが送信可能か（送信先が設定されているか）をページ側へ返す */
export async function GET() {
  const enabled = Boolean(process.env.ENTRY_WEBHOOK_URL || process.env.ENTRY_WEBHOOK_URL_BACKUP);
  return NextResponse.json({ enabled }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const primary = process.env.ENTRY_WEBHOOK_URL;
  const backup = process.env.ENTRY_WEBHOOK_URL_BACKUP;
  if (!primary && !backup) {
    return fail(503, '現在、フォームからのエントリーを受け付けておりません。');
  }
  if (!isSameOrigin(req)) return fail(403, GENERIC_ERROR);

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, GENERIC_ERROR);
  }

  const submissionId = String(raw.submissionId ?? '').slice(0, 64);
  if (submissionId && processed.has(submissionId)) {
    return NextResponse.json({ ok: true });
  }

  // ボット判定：ハニーポット、および表示から極端に早い送信
  if (typeof raw.website === 'string' && raw.website.trim() !== '') return fail(400, GENERIC_ERROR);
  const renderedAt = typeof raw.renderedAt === 'number' ? raw.renderedAt : 0;
  if (renderedAt > 0 && Date.now() - renderedAt < 3000) return fail(400, GENERIC_ERROR);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return fail(429, '送信回数の上限に達しました。しばらく時間をおいてからお試しください。');
  }

  const parsed = entrySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail(422, '入力内容をご確認ください。', fieldErrors);
  }
  const d = parsed.data;
  const session = SESSIONS.find((s) => s.id === d.sessionId)!;
  const now = new Date();

  const payload = {
    submissionId,
    submittedAt: now.toISOString(),
    submittedAtJst: toJst(now),
    name: d.name,
    graduation: d.graduation,
    university: d.university,
    faculty: d.faculty,
    sessionId: d.sessionId,
    sessionLabel: sessionLabel(session),
    phone: d.phone,
    email: d.email,
    note: d.note,
    privacyAgreed: true,
    pageUrl: req.headers.get('referer') ?? '',
  };

  // 本番と予備（設定されていれば）へ同時に送る。どちらかに届けば受付成立
  const [primaryOk, backupOk] = await Promise.all([
    primary ? post(primary, 'primary', payload) : Promise.resolve(false),
    backup ? post(backup, 'backup', payload) : Promise.resolve(false),
  ]);
  const detail = `primary=${primary ? (primaryOk ? 'ok' : 'NG') : '-'} backup=${backup ? (backupOk ? 'ok' : 'NG') : '-'}`;
  if (!primaryOk && !backupOk) {
    logRecord(payload, 'failed', detail);
    return fail(502, GENERIC_ERROR);
  }
  logRecord(payload, (primary && !primaryOk) || (backup && !backupOk) ? 'partial' : 'ok', detail);

  processed.set(submissionId, Date.now());
  if (processed.size > 5000) processed.clear();
  return NextResponse.json({ ok: true });
}
