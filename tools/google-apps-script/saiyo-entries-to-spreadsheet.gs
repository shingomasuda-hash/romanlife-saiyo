/**
 * 採用LPのエントリーフォーム → /api/entry → このWebアプリ → スプレッドシート
 * 送信のたびに1行ずつ追記し、通知メールを送ります。
 *
 * 設置手順
 * 1. 受け皿のスプレッドシートで「拡張機能 → Apps Script」を開き、このファイルを貼り付ける
 * 2. TOKEN に推測されにくい文字列（英数字30文字程度）を設定する
 * 3. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *      次のユーザーとして実行 : 自分 ／ アクセスできるユーザー : 全員
 * 4. 発行されたURLの末尾に ?token=（2の文字列）を付け、Vercel の環境変数
 *    ENTRY_WEBHOOK_URL に設定して再デプロイする
 * 5. LPから1件テスト送信し、シートに追記されることを確認する
 */

var SHEET_ID = '';            // 空ならこのスクリプトを作成したスプレッドシート
var TOKEN = '';               // ★ ENTRY_WEBHOOK_URL の ?token= と同じ値
var SHEET_NAME = '説明会エントリー';
var NOTIFY_TO = '';           // ★ 通知先（カンマ区切り）。空なら通知しない

var HEADERS = ['受付日時', 'お名前', '卒業予定年', '大学名', '学部名', '希望説明会日時',
  '電話番号', 'メールアドレス', '備考', '個人情報の取り扱い', '送信元URL', '送信ID'];

function doPost(e) {
  try {
    if (!TOKEN || (e.parameter && e.parameter.token) !== TOKEN) return json({ ok: false, error: 'token' });
    var data = JSON.parse(e.postData.contents);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = getSheet();
      if (data.submissionId && isDuplicate(sheet, data.submissionId)) return json({ ok: true, duplicate: true });
      sheet.appendRow([
        data.submittedAtJst || new Date(), data.name || '', data.graduation || '', data.university || '',
        data.faculty || '', data.sessionLabel || '', "'" + (data.phone || ''), data.email || '',
        data.note || '', data.privacyAgreed ? '同意済み' : '未同意', data.pageUrl || '', data.submissionId || ''
      ]);
    } finally {
      lock.releaseLock();
    }
    notify(data);
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

function notify(data) {
  if (!NOTIFY_TO) return;
  var body = [
    '採用LPから説明会エントリーがありました。', '',
    '受付日時：' + (data.submittedAtJst || ''),
    'お名前：' + (data.name || ''),
    '卒業予定年：' + (data.graduation || ''),
    '大学名：' + (data.university || ''),
    '学部名：' + (data.faculty || ''),
    '希望説明会日時：' + (data.sessionLabel || ''),
    '電話番号：' + (data.phone || ''),
    'メールアドレス：' + (data.email || ''),
    '備考：', data.note || '（記載なし）'
  ].join('\n');
  NOTIFY_TO.split(',').forEach(function (to) {
    to = to.trim();
    if (to) MailApp.sendEmail(to, '【採用LP】説明会エントリー ' + (data.name || '') + ' 様', body);
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
