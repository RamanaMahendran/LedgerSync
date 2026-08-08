/**
 * LEDGER SYNC — Google Apps Script backend
 * ────────────────────────────────────────────────────────────────
 * Stores your Ledger data in a Google Sheet and merges edits coming
 * from any device. Newest edit per record wins. Deleted records stay
 * deleted (they travel as a "deleted" flag, not by disappearing).
 *
 * SETUP — about five minutes, once.
 *
 *  1. Go to sheets.new  → this creates a blank Google Sheet.
 *     Name it something like "Ledger Data".
 *
 *  2. In that sheet: Extensions → Apps Script.
 *     Delete whatever code is there, paste ALL of this file, and save.
 *
 *  3. Click Deploy → New deployment.
 *       · Click the gear next to "Select type" and choose  Web app
 *       · Description:      Ledger sync
 *       · Execute as:       Me
 *       · Who has access:   Anyone
 *     Click Deploy. Google will ask you to authorise it — approve.
 *     (On the "Google hasn't verified this app" screen, choose
 *      Advanced → Go to Ledger Data (unsafe). It is your own script.)
 *
 *  4. Copy the Web app URL. It ends in  /exec
 *
 *  5. In Ledger: Settings → Cloud sync → paste the link → Save link.
 *     Do the same on your wife's phone and any other device.
 *
 * If you ever change this code, you must Deploy → Manage deployments
 * → edit → New version, or the old code keeps running.
 *
 * The link is a password. Anyone who has it can read your finances.
 */

var TABS = {
  accounts: ['id','updated','deleted','name','kind','opening'],
  txns:     ['id','updated','deleted','date','kind','amount','cat','acct','to','party','note','by','grp'],
  assets:   ['id','updated','deleted','name','cat','value','invested','note','checked'],
  debts:    ['id','updated','deleted','name','cat','outstanding','note']
};
var NUMERIC = ['updated','opening','amount','value','invested','outstanding','checked'];

/* ── entry points ─────────────────────────────────────────────── */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);                    // stops two phones writing at once
    var incoming = JSON.parse(e.postData.contents || '{}');
    var out = {};

    Object.keys(TABS).forEach(function (name) {
      out[name] = mergeCollection(name, incoming[name] || []);
    });
    out.prefs = mergePrefs(incoming.prefs);

    return reply({ ok: true, data: out, serverTime: new Date().toISOString() });
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/** Opening the /exec link in a browser shows a quick health check. */
function doGet() {
  var out = {};
  Object.keys(TABS).forEach(function (name) { out[name] = readTab(name); });
  out.prefs = mergePrefs(null);
  return reply({ ok: true, data: out, serverTime: new Date().toISOString() });
}

/* ── merging ──────────────────────────────────────────────────── */

function mergeCollection(name, incoming) {
  var existing = readTab(name);
  var byId = {};

  existing.forEach(function (row) { byId[row.id] = row; });

  incoming.forEach(function (row) {
    if (!row || !row.id) return;
    var here = byId[row.id];
    if (!here || Number(row.updated || 0) >= Number(here.updated || 0)) {
      byId[row.id] = row;                    // newest edit wins, deletions included
    }
  });

  var merged = Object.keys(byId).map(function (k) { return byId[k]; });

  // Drop tombstones nobody needs any more.
  var cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
  merged = merged.filter(function (r) {
    return !(r.deleted && Number(r.updated || 0) < cutoff);
  });

  merged.sort(function (a, b) { return Number(b.updated || 0) - Number(a.updated || 0); });
  writeTab(name, merged);
  return merged;
}

function mergePrefs(incoming) {
  var props = PropertiesService.getDocumentProperties();
  var stored = null;
  try { stored = JSON.parse(props.getProperty('prefs') || 'null'); } catch (e) {}

  if (incoming && (!stored || Number(incoming.updated || 0) >= Number(stored.updated || 0))) {
    props.setProperty('prefs', JSON.stringify(incoming));
    return incoming;
  }
  return stored;
}

/* ── sheet read / write ───────────────────────────────────────── */

function sheetFor(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(TABS[name]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readTab(name) {
  var sh = sheetFor(name);
  var cols = TABS[name];
  var last = sh.getLastRow();
  if (last < 2) return [];

  var values = sh.getRange(2, 1, last - 1, cols.length).getValues();
  return values.filter(function (r) { return r[0] !== '' && r[0] !== null; })
    .map(function (r) {
      var obj = {};
      cols.forEach(function (col, i) {
        var v = r[i];
        if (v instanceof Date) {
          // Sheets likes turning 2026-08-01 into a Date. Put it back.
          v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        if (col === 'deleted') { obj[col] = (v === true || v === 'TRUE' || v === 'true'); return; }
        if (NUMERIC.indexOf(col) >= 0) { obj[col] = v === '' ? 0 : Number(v); return; }
        obj[col] = v === null ? '' : String(v);
      });
      if (!obj.deleted) delete obj.deleted;
      return obj;
    });
}

function writeTab(name, rows) {
  var sh = sheetFor(name);
  var cols = TABS[name];

  sh.clear();
  sh.appendRow(cols);
  sh.setFrozenRows(1);
  if (!rows.length) return;

  var out = rows.map(function (r) {
    return cols.map(function (c) {
      var v = r[c];
      if (c === 'deleted') return r.deleted ? true : '';
      return (v === undefined || v === null) ? '' : v;
    });
  });

  var target = sh.getRange(2, 1, out.length, cols.length);
  target.setNumberFormat('@');               // keep dates as plain text, not Sheets dates
  target.setValues(out);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
