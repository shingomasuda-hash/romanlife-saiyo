import { z } from 'zod';
import { GRADUATIONS, SESSIONS } from '@/data/content';

const sessionIds = SESSIONS.map((s) => s.id) as [string, ...string[]];

/** フォームの入力チェック（ブラウザとサーバーで同じものを使う） */
export const entrySchema = z.object({
  name: z.string().trim().min(1, 'お名前を入力してください。').max(60, '60文字以内で入力してください。'),
  graduation: z.enum(GRADUATIONS as unknown as [string, ...string[]], {
    errorMap: () => ({ message: '卒業予定年を選択してください。' }),
  }),
  university: z.string().trim().min(1, '大学名を入力してください。').max(80, '80文字以内で入力してください。'),
  faculty: z.string().trim().min(1, '学部名を入力してください。').max(80, '80文字以内で入力してください。'),
  sessionId: z.enum(sessionIds, { errorMap: () => ({ message: '希望説明会日時を選択してください。' }) }),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[ー－‐−]/g, '-'))
    .pipe(z.string().regex(/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/, '電話番号を正しく入力してください（例：090-0000-0000）。')),
  email: z
    .string()
    .trim()
    .min(1, 'メールアドレスを入力してください。')
    .max(254, 'メールアドレスが長すぎます。')
    .email('メールアドレスを正しく入力してください。'),
  note: z.string().max(1000, '1000文字以内で入力してください。').optional().default(''),
  privacy: z.literal(true, { errorMap: () => ({ message: '個人情報の取り扱いへの同意が必要です。' }) }),
});

export type EntryInput = z.input<typeof entrySchema>;
export type Entry = z.output<typeof entrySchema>;
