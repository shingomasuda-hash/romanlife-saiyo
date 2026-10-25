/** エントリーフォームの選択肢（public/index.html のフォームと同じ内容） */

/** 説明会（秋のオープンカンパニー）の日程。id は index.html の option の value と一致させる */
export const SESSIONS = [
  { id: '2026-10-31', date: '10.31', week: '土', time: '10:00–13:00' },
  { id: '2026-11-03', date: '11.03', week: '火・祝', time: '10:00–13:00' },
  { id: '2026-11-07', date: '11.07', week: '土', time: '10:00–13:00' },
  { id: '2026-11-14', date: '11.14', week: '土', time: '14:00–17:00' },
  { id: '2026-11-23', date: '11.23', week: '月・祝', time: '10:00–13:00' },
  { id: '2026-12-12', date: '12.12', week: '土', time: '14:00–17:00' },
] as const;

export function sessionLabel(s: (typeof SESSIONS)[number]): string {
  const [m, d] = s.date.split('.');
  return `${Number(m)}月${Number(d)}日（${s.week}）${s.time.replace('–', '〜')}`;
}

export const GRADUATIONS = ['2028年卒'] as const;
