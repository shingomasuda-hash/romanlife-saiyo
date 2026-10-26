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
 * 9. （バックアップ）関数「setupBackupTrigger」を1回だけ実行する
 *    → 毎日 午前3時台にスプレッドシート全体のコピーが、マイドライブのフォルダ
 *      「採用LP_エントリー_バックアップ」に保存されます（30日分を保持）
 *
 * ログ：シート「受信ログ」に、受け付けた日時・結果・メール送信の成否を1件ずつ残します。
 *       エラーで止まった場合も、受け取った内容をここに残します。
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
var AUTO_REPLY = true;   // ★ 控え（AnyWare側など予備の受け口）では false にする（二重送信を防ぐ）

var HEADERS = ['受付日時', 'お名前', '卒業予定年', '大学名', '学部名', '希望説明会日時',
  '電話番号', 'メールアドレス', '備考', '個人情報の取り扱い', '送信元URL', '送信ID', '受付番号'];

/** 会場（受付確認メールに記載） */
var VENUE_LINES = [
  '株式会社ロマンライフ 本社',
  'マールブランシュ ロマンの森 2階',
  '京都府京都市山科区大塚北溝町30',
];

/** 受付確認メールの署名 */
var SIGNATURE = [
  '━━━━━━━━━━━━━━━━━━━━',
  '株式会社ロマンライフ 採用担当',
  '〒607-8134 京都府京都市山科区大塚北溝町30',
  'マールブランシュ ロマンの森 2階',
  '━━━━━━━━━━━━━━━━━━━━',
].join('\n');

var LOG_SHEET_NAME = '受信ログ';
var LOG_HEADERS = ['日時', '結果', '送信ID', 'お名前', '希望説明会日時', '通知メール', '自動返信', '詳細'];

/** バックアップの保存先フォルダ名と保持日数 */
var BACKUP_FOLDER_NAME = '採用LP_エントリー_バックアップ';
var BACKUP_KEEP_DAYS = 30;

var EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

function doPost(e) {
  var data = null;
  try {
    if (!TOKEN || (e.parameter && e.parameter.token) !== TOKEN) {
      writeLog('拒否', null, '', '', '合言葉（token）が一致しません');
      return json({ ok: false, error: 'token' });
    }
    data = JSON.parse(e.postData.contents);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = getSheet();
      // 再送信・再試行で同じ申込みが二重に入らないようにする
      if (data.submissionId && isDuplicate(sheet, data.submissionId)) {
        writeLog('重複（記録済み）', data, '-', '-', '');
        return json({ ok: true, duplicate: true });
      }
      sheet.appendRow([
        data.submittedAtJst || new Date(), data.name || '', data.graduation || '', data.university || '',
        data.faculty || '', data.sessionLabel || '', "'" + (data.phone || ''), data.email || '',
        data.note || '', data.privacyAgreed ? '同意済み' : '未同意', data.pageUrl || '', data.submissionId || '',
        data.receiptNumber || ''
      ]);
    } finally {
      lock.releaseLock();
    }
    // シートへの記録を優先し、メールの失敗で申込みを失敗扱いにしない
    var mail = '成功', reply = AUTO_REPLY ? '成功' : '送らない設定';
    try { sendNotification(data); } catch (err) { mail = '失敗：' + err; }
    try { sendAutoReply(data); } catch (err) { reply = '失敗：' + err; }
    writeLog('記録済み', data, mail, reply, '');
    return json({ ok: true });
  } catch (err) {
    // 失敗しても受け取った内容は受信ログに残す（ここから手で復元できる）
    var raw = data ? JSON.stringify(data) : (e && e.postData ? String(e.postData.contents).slice(0, 4000) : '');
    writeLog('エラー', data, '-', '-', String(err) + ' / 受信内容: ' + raw);
    return json({ ok: false, error: String(err) });
  }
}

/** 受信ログへ1行追記する（ログの失敗で本処理を止めない） */
function writeLog(result, data, mail, reply, detail) {
  try {
    var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    var log = ss.getSheetByName(LOG_SHEET_NAME) || ss.insertSheet(LOG_SHEET_NAME);
    if (log.getLastRow() === 0) {
      log.appendRow(LOG_HEADERS);
      log.getRange(1, 1, 1, LOG_HEADERS.length).setFontWeight('bold');
      log.setFrozenRows(1);
    }
    log.appendRow([new Date(), result, data && data.submissionId || '', data && data.name || '',
      data && data.sessionLabel || '', mail || '', reply || '', detail || '']);
  } catch (err) {
    Logger.log('受信ログの書き込みに失敗: ' + err);
  }
}

function getSheet() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < HEADERS.length) {
    // 列を追加したバージョンへ更新したとき、既存シートの見出しを補う
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
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
    '受付番号：' + (data.receiptNumber || ''),
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
  var subject = '【採用LP】説明会エントリー ' + (data.receiptNumber || '') + '　' + (data.name || '') + ' 様（' + (data.sessionLabel || '') + '）';

  // 宛先ごとに送り、1件失敗しても他の宛先には届くようにする。失敗があれば呼び出し元へ伝える
  var failed = [];
  NOTIFY_TO.split(',').forEach(function (to) {
    to = to.trim();
    if (!to) return;
    try {
      MailApp.sendEmail(to, subject, body, options);
      Logger.log('送信しました → ' + to);
    } catch (err) {
      Logger.log('送信に失敗 → ' + to + ' : ' + err);
      failed.push(to + '（' + err + '）');
    }
  });
  if (failed.length) throw new Error(failed.join(' / '));
}

/** 応募者への受付確認メール（AUTO_REPLY = true のときだけ） */
function sendAutoReply(data) {
  if (!AUTO_REPLY || !data.email || !EMAIL_RE.test(data.email)) return;
  var body = [
    (data.name || '') + ' 様',
    '',
    'この度は、株式会社ロマンライフのオープン・カンパニーへ',
    'お申し込みいただき、ありがとうございます。',
    '下記の内容で受け付けいたしました。',
    '',
    '── お申し込み内容 ──',
    '受付番号：' + (data.receiptNumber || ''),
    '参加希望日：' + (data.sessionDate || data.sessionLabel || ''),
    '参加希望時間：' + (data.sessionTime || ''),
    '会場：' + VENUE_LINES[0],
  ].concat(VENUE_LINES.slice(1).map(function (l) { return '　　　' + l; })).concat([
    '',
    '── ご入力内容 ──',
    'お名前：' + (data.name || ''),
    '学校名：' + (data.university || ''),
    '学部・学科：' + (data.faculty || ''),
    '卒業予定年：' + (data.graduation || ''),
    'メールアドレス：' + (data.email || ''),
    '電話番号：' + (data.phone || ''),
    '',
    '当日の持ち物は筆記用具です。服装の指定はございませんので、',
    '過ごしやすい自由な服装でお越しください。',
    '受付場所など当日の詳細は、あらためてご案内いたします。',
    '',
    'ご不明な点がございましたら、このメールへご返信ください。',
    'お会いできることを楽しみにしております。',
    '',
    SIGNATURE,
  ]).join('\n');
  MailApp.sendEmail(data.email, '【株式会社ロマンライフ】オープン・カンパニーのお申し込みを受け付けました', body, { name: SENDER_NAME });
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
    note: 'テスト送信です', privacyAgreed: true, receiptNumber: 'OC-000000-TEST00'
  });
  Logger.log('残りの送信可能数（本日）：' + MailApp.getRemainingDailyQuota());
}

/**
 * スプレッドシート全体のコピーを、マイドライブのバックアップ用フォルダに保存する。
 * BACKUP_KEEP_DAYS より古いコピーはゴミ箱へ移す。setupBackupTrigger で毎日自動実行される。
 */
function backupSpreadsheet() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER_NAME);
  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmm');
  DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + '_backup_' + stamp, folder);

  var limit = new Date(Date.now() - BACKUP_KEEP_DAYS * 24 * 60 * 60 * 1000);
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.getDateCreated() < limit) f.setTrashed(true);
  }
  Logger.log('バックアップを作成しました → ' + BACKUP_FOLDER_NAME + ' / ' + stamp);
}

/** バックアップの毎日自動実行を設定する（1回だけ実行すればよい。重複して登録しない） */
function setupBackupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'backupSpreadsheet') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('backupSpreadsheet').timeBased().everyDays(1).atHour(3).inTimezone('Asia/Tokyo').create();
  backupSpreadsheet();
  Logger.log('毎日 午前3時台のバックアップを設定し、1回目のバックアップを作成しました。');
}

/** 動作確認：受付確認メールを TEST_TO に送る（AUTO_REPLY の設定に関係なく送る） */
function testAutoReply() {
  var TEST_TO = 'romanlife.saiyo@gmail.com';   // 確認したいアドレスに変えてもよい
  var saved = AUTO_REPLY;
  AUTO_REPLY = true;
  try {
    sendAutoReply({
      name: 'テスト 太郎', university: 'テスト大学', faculty: 'テスト学部', graduation: '2028年卒',
      email: TEST_TO, phone: '090-0000-0000', receiptNumber: 'OC-000000-TEST00',
      sessionDate: '2026年11月7日（土）', sessionTime: '10:00〜13:00', sessionLabel: '11月7日（土）10:00〜13:00'
    });
  } finally {
    AUTO_REPLY = saved;
  }
  Logger.log('受付確認メールを送りました → ' + TEST_TO);
}
