'use client';

import { useRef, useState } from 'react';
import { GRADUATIONS, SESSIONS, sessionLabel } from '@/data/content';
import { entrySchema } from '@/lib/schema';

type Errors = Partial<Record<string, string>>;
type Status = 'idle' | 'sending' | 'done' | 'error';

const FIELD_ORDER = ['name', 'graduation', 'university', 'faculty', 'sessionId', 'phone', 'email', 'note', 'privacy'];

function Req() {
  return <span className="req">必須</span>;
}

export default function EntryForm({ webhookConfigured }: { webhookConfigured: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [renderedAt] = useState(() => Date.now());
  const [submissionId] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
  );

  function collect() {
    const fd = new FormData(formRef.current!);
    return {
      name: String(fd.get('name') ?? ''),
      graduation: String(fd.get('graduation') ?? ''),
      university: String(fd.get('university') ?? ''),
      faculty: String(fd.get('faculty') ?? ''),
      sessionId: String(fd.get('sessionId') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      email: String(fd.get('email') ?? ''),
      note: String(fd.get('note') ?? ''),
      privacy: fd.get('privacy') === 'on',
      website: String(fd.get('website') ?? ''),
    };
  }

  function focusFirst(errs: Errors) {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    const data = collect();
    const parsed = entrySchema.safeParse(data);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      focusFirst(errs);
      return;
    }
    setErrors({});
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, submissionId, renderedAt }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; fieldErrors?: Errors };
      if (res.ok && json.ok) {
        setStatus('done');
        return;
      }
      if (json.fieldErrors) {
        setErrors(json.fieldErrors);
        focusFirst(json.fieldErrors);
      }
      setStatus('error');
      setMessage(json.message || '送信できませんでした。時間をおいて再度お試しください。');
    } catch {
      setStatus('error');
      setMessage('通信に失敗しました。電波の良い場所で再度お試しください。');
    }
  }

  if (status === 'done') {
    return (
      <div className="form form--done" role="status" tabIndex={-1}>
        <p className="form__done-title">エントリーを受け付けました。</p>
        <p className="form__done-text">ご入力いただいたメールアドレス宛に、担当者よりご連絡いたします。</p>
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <p className="field__error" id={`err-${k}`} role="alert">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: string) => ({
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `err-${k}` : undefined,
  });

  return (
    <form className="form" ref={formRef} onSubmit={onSubmit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor="f-name">お名前<Req /></label>
        <input className="field__input" id="f-name" name="name" type="text" autoComplete="name" placeholder="例）山田 花子" required {...a11y('name')} />
        {err('name')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="f-graduation">卒業予定年<Req /></label>
        <select className="field__input field__select" id="f-graduation" name="graduation" defaultValue="" required {...a11y('graduation')}>
          <option value="" disabled>選択してください</option>
          {GRADUATIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        {err('graduation')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="f-university">大学名<Req /></label>
        <input className="field__input" id="f-university" name="university" type="text" autoComplete="organization" placeholder="例）〇〇大学" required {...a11y('university')} />
        {err('university')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="f-faculty">学部名<Req /></label>
        <input className="field__input" id="f-faculty" name="faculty" type="text" placeholder="例）〇〇学部" required {...a11y('faculty')} />
        {err('faculty')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="f-session">希望説明会日時<Req /></label>
        <select className="field__input field__select" id="f-session" name="sessionId" defaultValue="" required {...a11y('sessionId')}>
          <option value="" disabled>選択してください</option>
          {SESSIONS.map((s) => (
            <option key={s.id} value={s.id}>{sessionLabel(s)}</option>
          ))}
        </select>
        {err('sessionId')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="f-phone">電話番号<Req /></label>
        <input className="field__input" id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="090-0000-0000" required {...a11y('phone')} />
        {err('phone')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="f-email">メールアドレス<Req /></label>
        <input className="field__input" id="f-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="example@email.com" required {...a11y('email')} />
        {err('email')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="f-note">備考</label>
        <textarea className="field__input field__textarea" id="f-note" name="note" placeholder="ご質問などがあればご入力ください" maxLength={1000} {...a11y('note')} />
        {err('note')}
      </div>

      <div className={`privacy${privacyOpen ? ' is-open' : ''}`}>
        <button type="button" className="privacy__toggle" aria-expanded={privacyOpen} aria-controls="privacy-body" onClick={() => setPrivacyOpen((v) => !v)}>
          個人情報の取り扱いについて
          <span className="privacy__icon" aria-hidden="true" />
        </button>
        <div className="privacy__body" id="privacy-body" hidden={!privacyOpen}>
          <ul>
            <li>本フォームにご入力いただいた個人情報は、①当社の採用活動、②エントリーされた方の登録・管理、オープンカンパニー・セミナー・会社説明会等のご案内、③採用選考中の方へのご連絡、お問い合わせへの回答・情報提供、並びに④採用後の人事・労務業務での使用のために利用いたします。また、⑤当社内での統計資料の作成・分析等（但し、個人名等を特定することができない形で）に使用する場合もございます。</li>
            <li>本フォームにご入力いただいた個人情報は、利用目的の終了後に適切に消去または廃棄します。</li>
            <li>当社は「プライバシーポリシー」を定め、それに従い細心の注意を払って個人情報を取り扱います。</li>
          </ul>
        </div>
      </div>

      <div className="consent">
        <label className="consent__label">
          <input className="consent__check" type="checkbox" name="privacy" required {...a11y('privacy')} />
          <span>個人情報の取り扱いに同意する</span>
          <Req />
        </label>
        {err('privacy')}
      </div>

      {/* ボット対策（人には表示しない項目） */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="f-website">ウェブサイト（入力しないでください）</label>
        <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button className="arrow-btn form__submit" type="submit" disabled={status === 'sending'}>
        <span className="arrow-btn__label">{status === 'sending' ? '送信しています…' : '入力内容を送信する'}</span>
      </button>
      {status === 'error' && (
        <p className="form__error" role="alert">
          {message}
        </p>
      )}
      {!webhookConfigured && <p className="form__note">※本ページはデザイン確認用です。入力内容は送信されません。</p>}
    </form>
  );
}
