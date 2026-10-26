/*
 * 説明会エントリーフォームの送信処理（デザインデータの HTML/CSS には手を加えず、この追加スクリプトで動作させる）
 * - 入力チェック → /api/entry へ送信 → 完了表示
 * - 送信先（ENTRY_WEBHOOK_URL）が未設定の間は送信せず、デザインどおりの注記を表示したままにする
 */
(() => {
  const form = document.querySelector('.entry-form');
  if (!form) return;

  const note = form.querySelector('.form-note');
  const submit = form.querySelector('button[type="submit"]');
  const renderedAt = Date.now();
  const submissionId =
    window.crypto && 'randomUUID' in window.crypto ? window.crypto.randomUUID() : String(renderedAt) + Math.random().toString(16).slice(2);
  let enabled = false;
  let sending = false;

  // ボット対策（人には見えない項目）
  const hp = document.createElement('div');
  hp.className = 'entry-hp';
  hp.setAttribute('aria-hidden', 'true');
  hp.innerHTML = '<label>ウェブサイト（入力しないでください）<input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
  form.appendChild(hp);

  fetch('/api/entry', { method: 'GET', headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .then((d) => {
      enabled = Boolean(d && d.enabled);
      if (enabled && note) note.hidden = true;
    })
    .catch(() => {});

  const MESSAGES = {
    name: 'お名前を入力してください。',
    graduation: '卒業予定年を選択してください。',
    university: '大学名を入力してください。',
    faculty: '学部名を入力してください。',
    sessionId: '希望説明会日時を選択してください。',
    phone: '電話番号を正しく入力してください（例：090-0000-0000）。',
    email: 'メールアドレスを正しく入力してください。',
    privacy: '個人情報の取り扱いへの同意が必要です。',
  };
  const ORDER = Object.keys(MESSAGES);

  const field = (name) => form.elements.namedItem(name);

  // 計測（GTM）。既存LPと同じイベント名で dataLayer へ送る
  const track = (event, payload) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event }, payload || {}));
  };
  document.querySelectorAll('a[href="#entry"], a[href="#sessions"]').forEach((a) => {
    a.addEventListener('click', () => track('cta_click', { location: a.className || 'link', target: a.getAttribute('href') }));
  });
  const toHalf = (v) => v.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[ー－‐−]/g, '-');

  function collect() {
    const v = (n) => (field(n) && field(n).value ? field(n).value.trim() : '');
    return {
      name: v('name'),
      graduation: v('graduation'),
      university: v('university'),
      faculty: v('faculty'),
      sessionId: v('sessionId'),
      phone: toHalf(v('phone')),
      email: v('email'),
      note: v('note'),
      privacy: Boolean(field('privacy') && field('privacy').checked),
      website: v('website'),
    };
  }

  function validate(d) {
    const e = {};
    ['name', 'graduation', 'university', 'faculty', 'sessionId'].forEach((k) => {
      if (!d[k]) e[k] = MESSAGES[k];
    });
    if (!/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/.test(d.phone)) e.phone = MESSAGES.phone;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = MESSAGES.email;
    if (!d.privacy) e.privacy = MESSAGES.privacy;
    return e;
  }

  function clearErrors() {
    form.querySelectorAll('.entry-error').forEach((el) => el.remove());
    form.querySelectorAll('[aria-invalid]').forEach((el) => {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    });
  }

  function showErrors(errors) {
    clearErrors();
    let first = null;
    ORDER.forEach((k) => {
      if (!errors[k]) return;
      const el = field(k);
      if (!el) return;
      const id = 'entry-error-' + k;
      const p = document.createElement('p');
      p.className = 'entry-error';
      p.id = id;
      p.setAttribute('role', 'alert');
      p.textContent = errors[k];
      const label = el.closest('label');
      if (k === 'privacy') label.insertAdjacentElement('afterend', p);
      else label.appendChild(p);
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', id);
      if (!first) first = el;
    });
    if (first) first.focus();
  }

  function showStatus(text) {
    let p = form.querySelector('.entry-status');
    if (!p) {
      p = document.createElement('p');
      p.className = 'entry-status full';
      p.setAttribute('role', 'alert');
      submit.insertAdjacentElement('afterend', p);
    }
    p.textContent = text;
  }

  function done(receiptNumber) {
    form.innerHTML =
      '<div class="entry-done full" role="status" tabindex="-1"><p class="entry-done-title">エントリーを受け付けました。</p><p>ご入力いただいたメールアドレス宛に、受付確認メールをお送りしました。</p></div>';
    if (receiptNumber) {
      const p = document.createElement('p');
      p.className = 'entry-done-number';
      p.textContent = '受付番号：' + receiptNumber;
      form.querySelector('.entry-done-title').insertAdjacentElement('afterend', p);
    }
    const box = form.querySelector('.entry-done');
    box.focus();
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (sending) return;
    const data = collect();
    const errors = validate(data);
    if (Object.keys(errors).length) {
      track('entry_validation_error', { fields: Object.keys(errors).join(',') });
      showErrors(errors);
      return;
    }
    clearErrors();
    if (!enabled) {
      showStatus('現在、フォームからのエントリーは受け付けておりません。');
      return;
    }
    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.assign({}, data, { submissionId, renderedAt })),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        track('entry_complete', { sessionId: data.sessionId });
        track('virtual_pageview', { pagePath: '/entry/complete', pageTitle: 'エントリー完了', pageLocation: location.origin + '/entry/complete' });
        done(json.receiptNumber);
        return;
      }
      track('entry_error', { status: res.status });
      if (json.fieldErrors) showErrors(json.fieldErrors);
      showStatus(json.message || '送信できませんでした。時間をおいて再度お試しください。');
    } catch (e) {
      track('entry_error', { status: 0 });
      showStatus('通信に失敗しました。電波の良い場所で再度お試しください。');
    } finally {
      sending = false;
      if (submit.isConnected) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
      }
    }
  });
})();
