/**
 * 採用LP（28卒向け説明会エントリー）の受け口となる Google Apps Script。
 *
 * LPのフォーム → /api/entry → このWebアプリ → スプレッドシートへ1行追記 ＋ 通知メール
 *
 * ★ メールの差出人は「このスクリプトを実行（デプロイ）したGoogleアカウント」になります。
 *    差出人を romanlife.saiyo@gmail.com にするため、必ずそのアカウントで作成・デプロイしてください。
 *
 * ------------------------------------------------------------------
 * 設置手順（romanlife.saiyo@gmail.com でログインした状態で行う）
 * ------------------------------------------------------------------
 * 1. Googleスプレッドシートを新規作成する（例：「採用LP 説明会エントリー一覧」）
 * 2. そのスプレッドシートの「拡張機能 → Apps Script」を開き、このファイルの内容をすべて貼り付けて保存
 * 3. 下の TOKEN に、推測されにくい英数字（30文字程度）を設定して保存
 * 4. 関数「testAppend」を選んで実行 → 権限の承認画面が出たら許可する
 *    （シート「説明会エントリー」に見出しとテスト行が入ることを確認し、テスト行は削除）
 * 5. 関数「testMail」を実行 → NOTIFY_TO の2件にテストメールが届くことを確認
 * 6. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *      次のユーザーとして実行 : 自分（romanlife.saiyo@gmail.com）
 *      アクセスできるユーザー : 全員
 * 7. 発行されたウェブアプリのURLの末尾に ?token=（3で決めた文字列）を付けたものを、
 *    Vercel の環境変数 ENTRY_WEBHOOK_URL に設定し、再デプロイする
 *      例: https://script.google.com/macros/s/AKfy.../exec?token=xxxxxxxx
 * 8. LPから1件テスト送信し、シートへの追記と通知メールを確認する
 *
 * ※ スクリプトを修正したら「デプロイを管理」→ 鉛筆アイコン → バージョン「新バージョン」で
 *    再デプロイしてください（URLは変わりません）。
 * ※ 無料のGmailアカウントのメール送信上限は 1日あたり約100通（宛先数）です。
 *    通知先2件の場合、1日50件程度までのエントリーに対応できます。
 */

var SHEET_ID = '';            // 空ならこのスクリプトを作成したスプレッドシートに書き込む
var TOKEN = '';               // ★ ENTRY_WEBHOOK_URL の ?token= と同じ値
var SHEET_NAME = '説明会エントリー';

/** 通知メールの宛先（カンマ区切り） */
var NOTIFY_TO = 'romanlife.saiyo@gmail.com,shingo.masuda@any-ware.jp';

/** メールの差出人名（差出人アドレスは実行アカウント＝romanlife.saiyo@gmail.com） */
var SENDER_NAME = '株式会社ロマンライフ 採用担当';

/**
 * 応募者本人へ受付確認メール（自動返信）を送るかどうか。
 * true にすると、入力されたメールアドレスへ受付確認メールを送ります。
 */
var AUTO_REPLY = false;

var HEADERS = ['受付日時', 'お名前', '卒業予定年', '大学名', '学部名', '希望説明会日時',
  '電話番号', 'メールアドレス', '備考', '個人情報の取り扱い', '送信元URL', '送信ID'];

var EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

function doPost(e) {
  try {
    if (!TOKEN || (e.parameter && e.parameter.token) !== TOKEN) return json({ ok: false, error: 'token' });
    var data = JSON.parse(e.postData.contents);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = getSheet();
      // 再送信・再試行で同じ申込みが二重に入らないようにする
      if (data.submissionId && isDuplicate(sheet, data.submissionId)) return json({ ok: true, duplicate: true });
      sheet.appendRow([
        data.submittedAtJst || new Date(), data.name || '', data.graduation || '', data.university || '',
        data.faculty || '', data.sessionLabel || '', "'" + (data.phone || ''), data.email || '',
        data.note || '', data.privacyAgreed ? '同意済み' : '未同意', data.pageUrl || '', data.submissionId || ''
      ]);
    } finally {
      lock.releaseLock();
    }
    // シートへの記録を優先し、メールの失敗で申込みを失敗扱いにしない
    try { sendNotification(data); } catch (err) { Logger.log('通知メールの送信に失敗: ' + err); }
    try { sendAutoReply(data); } catch (err) { Logger.log('自動返信の送信に失敗: ' + err); }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function getSheet() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function isDuplicate(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var col = HEADERS.indexOf('送信ID') + 1;
  return sheet.getRange(2, col, last - 1, 1).getValues().some(function (r) { return r[0] === id; });
}

/** 担当者への通知メール */
function sendNotification(data) {
  if (!NOTIFY_TO) return;
  var body = [
    '採用LPから説明会エントリーがありました。',
    '',
    '受付日時：' + (data.submittedAtJst || '') + '（日本時間）',
    '',
    '── 希望説明会 ──',
    '希望説明会日時：' + (data.sessionLabel || ''),
    '',
    '── エントリー内容 ──',
    'お名前：' + (data.name || ''),
    '卒業予定年：' + (data.graduation || ''),
    '大学名：' + (data.university || ''),
    '学部名：' + (data.faculty || ''),
    '電話番号：' + (data.phone || ''),
    'メールアドレス：' + (data.email || ''),
    '',
    '── 備考 ──',
    data.note || '（記載なし）',
    '',
    '── 個人情報の取り扱い ──',
    data.privacyAgreed ? '同意済み' : '未同意',
    '',
    '※このメールはエントリーフォームから自動送信されています。',
    '　一覧はスプレッドシートをご確認ください。',
  ].join('\n');
  var options = { name: SENDER_NAME };
  if (data.email && EMAIL_RE.test(data.email)) options.replyTo = data.email;
  var subject = '【採用LP】説明会エントリー ' + (data.name || '') + ' 様（' + (data.sessionLabel || '') + '）';

  // 宛先ごとに送り、1件失敗しても他の宛先には届くようにする
  NOTIFY_TO.split(',').forEach(function (to) {
    to = to.trim();
    if (!to) return;
    try {
      MailApp.sendEmail(to, subject, body, options);
      Logger.log('送信しました → ' + to);
    } catch (err) {
      Logger.log('送信に失敗 → ' + to + ' : ' + err);
    }
  });
}

/** 応募者への受付確認メール（AUTO_REPLY = true のときだけ） */
function sendAutoReply(data) {
  if (!AUTO_REPLY || !data.email || !EMAIL_RE.test(data.email)) return;
  var body = [
    (data.name || '') + ' 様',
    '',
    'このたびは株式会社ロマンライフの説明会にエントリーいただき、ありがとうございます。',
    '以下の内容で受け付けました。詳細は担当者より追ってご連絡いたします。',
    '',
    '希望説明会日時：' + (data.sessionLabel || ''),
    'お名前：' + (data.name || ''),
    '大学名：' + (data.university || ''),
    '学部名：' + (data.faculty || ''),
    '電話番号：' + (data.phone || ''),
    'メールアドレス：' + (data.email || ''),
    '',
    '※このメールは送信専用ではありません。ご不明点はこのメールにご返信ください。',
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    SENDER_NAME,
    '━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
  MailApp.sendEmail(data.email, '【株式会社ロマンライフ】説明会エントリーを受け付けました', body, { name: SENDER_NAME });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 受け口の確認用。ウェブアプリのURL（?token= 付き）をブラウザで開くと、
 * {"ok":true,...} が表示されれば、URL・合言葉・アクセス権・シート権限がすべて正しい状態です。
 */
function doGet(e) {
  var token = e && e.parameter ? e.parameter.token : '';
  if (!TOKEN || token !== TOKEN) {
    return ContentService.createTextOutput('OK: エントリーの受け口は動作しています。').setMimeType(ContentService.MimeType.TEXT);
  }
  try {
    var sheet = getSheet();
    return json({
      ok: true,
      sheet: SHEET_NAME,
      rows: Math.max(0, sheet.getLastRow() - 1),
      notifyTo: NOTIFY_TO.split(',').filter(function (s) { return s.trim(); }).length,
      autoReply: AUTO_REPLY,
      remainingDailyQuota: MailApp.getRemainingDailyQuota()
    });
  } catch (err) {
    return json({ ok: false, message: String(err) });
  }
}

/** 動作確認：テスト行を1行追記する（確認後、行は削除してください） */
function testAppend() {
  var sheet = getSheet();
  sheet.appendRow([new Date(), 'テスト 太郎', '2028年卒', 'テスト大学', 'テスト学部', '11月7日（土）10:00〜13:00',
    "'090-0000-0000", 'test@example.com', 'テスト送信です', '同意済み', '', 'test-' + Date.now()]);
  Logger.log('テスト行を追記しました → ' + SHEET_NAME);
}

/** 動作確認：NOTIFY_TO へテスト通知メールを送る */
function testMail() {
  sendNotification({
    submittedAtJst: Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
    name: 'テスト 太郎', graduation: '2028年卒', university: 'テスト大学', faculty: 'テスト学部',
    sessionLabel: '11月7日（土）10:00〜13:00', phone: '090-0000-0000', email: 'test@example.com',
    note: 'テスト送信です', privacyAgreed: true
  });
  Logger.log('残りの送信可能数（本日）：' + MailApp.getRemainingDailyQuota());
}
