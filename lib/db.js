import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db;

function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'mature-response.db');

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Build into a local and publish only after migrations succeed, so a
    // failed init cannot leave the app running on an unmigrated schema.
    const d = new Database(dbPath);
    try {
    d.pragma('journal_mode = WAL');
    d.pragma('foreign_keys = ON');
    d.pragma('secure_delete = ON'); // overwrite freed pages, don't just unlink them

    // Create table
    d.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_text TEXT NOT NULL,
        context_type TEXT NOT NULL,
        perceived_tone TEXT NOT NULL,
        emotional_reaction INTEGER NOT NULL,
        feeling TEXT,
        optional_note TEXT,
        model_used TEXT,
        mode TEXT DEFAULT 'response',
        desired_outcome TEXT,
        intent_guess TEXT,
        engagement_level TEXT,
        recommended_response TEXT,
        reason TEXT,
        coaching_insight TEXT,
        coaching_tag TEXT,
        risk_level TEXT,
        confidence INTEGER DEFAULT 50,
        outcome TEXT,
        outcome_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        outcome_logged_at DATETIME
      )
    `);

    // Schema upgrades. Only a "duplicate column" error means "already
    // migrated" — anything else (corruption, disk full, locked file) is a
    // real problem and must surface, not be silently swallowed.
    const addColumn = (sql) => {
      try {
        d.exec(sql);
      } catch (e) {
        if (!/duplicate column/i.test(e.message)) throw e;
      }
    };
    addColumn(`ALTER TABLE entries ADD COLUMN confidence INTEGER DEFAULT 50`);
    addColumn(`ALTER TABLE entries ADD COLUMN model_used TEXT`);
    addColumn(`ALTER TABLE entries ADD COLUMN mode TEXT DEFAULT 'response'`);
    addColumn(`ALTER TABLE entries ADD COLUMN desired_outcome TEXT`);
    addColumn(`ALTER TABLE entries ADD COLUMN coaching_insight TEXT`);
    addColumn(`ALTER TABLE entries ADD COLUMN coaching_tag TEXT`);
    addColumn(`ALTER TABLE entries ADD COLUMN feeling TEXT`);
    // Rename intent_estimate to intent_guess if old column exists
    try {
      const info = d.prepare("PRAGMA table_info(entries)").all();
      const hasOldColumn = info.some(col => col.name === 'intent_estimate');
      const hasNewColumn = info.some(col => col.name === 'intent_guess');
      if (hasOldColumn && !hasNewColumn) {
        d.exec(`ALTER TABLE entries RENAME COLUMN intent_estimate TO intent_guess`);
      }
    } catch (e) {
      if (!/no such column|duplicate column/i.test(e.message)) throw e;
    }
    db = d;
    } catch (e) {
      try { d.close(); } catch { /* nothing to salvage */ }
      throw e; // surface it; db stays undefined so the next request retries
    }
  }
  return db;
}

export function insertEntry({
  message_text,
  context_type,
  perceived_tone,
  emotional_reaction,
  feeling,
  optional_note,
  model_used,
  mode,
  desired_outcome,
  intent_guess,
  engagement_level,
  recommended_response,
  reason,
  coaching_insight,
  coaching_tag,
  risk_level,
  confidence,
}) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO entries (
      message_text, context_type, perceived_tone, emotional_reaction, feeling, optional_note,
      model_used, mode, desired_outcome, intent_guess, engagement_level,
      recommended_response, reason, coaching_insight, coaching_tag, risk_level, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    message_text,
    context_type,
    perceived_tone || 'n/a', // Communication mode has no received-message tone
    emotional_reaction,
    feeling || null,
    optional_note || null,
    model_used || null,
    mode || 'response',
    desired_outcome || null,
    intent_guess,
    engagement_level,
    recommended_response,
    reason,
    coaching_insight || null,
    coaching_tag || null,
    risk_level,
    confidence || 50
  );
  return result.lastInsertRowid;
}

export function getEntries({ limit = 50, context_type, search } = {}) {
  const database = getDb();

  let query = 'SELECT * FROM entries WHERE 1=1';
  const params = [];

  if (context_type && context_type !== 'all') {
    query += ' AND context_type = ?';
    params.push(context_type);
  }

  if (search && search.trim()) {
    query += ' AND message_text LIKE ?';
    params.push(`%${search.trim()}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const stmt = database.prepare(query);
  return stmt.all(...params);
}

export function getEntryById(id) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM entries WHERE id = ?');
  return stmt.get(id);
}

export function deleteEntry(id) {
  const database = getDb();
  return database.prepare('DELETE FROM entries WHERE id = ?').run(id);
}

export function updateOutcome(id, outcome, outcome_notes) {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE entries
    SET outcome = ?, outcome_notes = ?, outcome_logged_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(outcome, outcome_notes || null, id);
}

export function getInsights() {
  const database = getDb();

  const totalWithOutcomes = database.prepare(
    `SELECT COUNT(*) as total FROM entries WHERE outcome IS NOT NULL`
  ).get();
  const totalEntries = database.prepare(`SELECT COUNT(*) as total FROM entries`).get();

  // Outcome distribution
  const overallStats = database.prepare(`
    SELECT outcome, COUNT(*) as count
    FROM entries WHERE outcome IS NOT NULL
    GROUP BY outcome
  `).all();

  // What has worked, by the action taken — the honest core of Insights.
  const engagementStats = database.prepare(`
    SELECT engagement_level,
      COUNT(*) as total,
      SUM(CASE WHEN outcome = 'successful' THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN outcome = 'escalated' THEN 1 ELSE 0 END) as escalated
    FROM entries WHERE outcome IS NOT NULL
    GROUP BY engagement_level
    ORDER BY total DESC
  `).all();

  // Recurring lessons (the learning loop) — from all analyses, not just logged ones.
  const recurringLessons = database.prepare(`
    SELECT coaching_tag AS tag, COUNT(*) as count
    FROM entries
    WHERE coaching_tag IS NOT NULL AND coaching_tag <> ''
    GROUP BY coaching_tag
    ORDER BY count DESC, MAX(created_at) DESC
  `).all();

  return {
    overallStats,
    engagementStats,
    recurringLessons,
    totalWithOutcomes: totalWithOutcomes.total,
    totalEntries: totalEntries.total,
  };
}

/**
 * How many times this lesson has been recorded before — drives the
 * "you've met this lesson before" surfacing on a fresh analysis.
 */
export function getTagCount(tag) {
  if (!tag) return 0;
  const database = getDb();
  const row = database.prepare(`SELECT COUNT(*) as c FROM entries WHERE coaching_tag = ?`).get(tag);
  return row.c;
}

/**
 * A compact summary of what has actually worked for this user, injected into
 * future analyses so logged outcomes genuinely shape recommendations — the
 * real feedback loop behind "the more you log, the sharper this gets."
 * Only includes actions with enough data (n >= 3) to avoid reading noise.
 */
export function getOutcomePriors() {
  const database = getDb();
  const rows = database.prepare(`
    SELECT engagement_level,
      COUNT(*) as total,
      SUM(CASE WHEN outcome = 'successful' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN outcome = 'escalated' THEN 1 ELSE 0 END) as escalated
    FROM entries
    WHERE outcome IS NOT NULL
    GROUP BY engagement_level
    HAVING total >= 3
    ORDER BY total DESC
  `).all();
  if (!rows.length) return '';
  return rows.map((r) => {
    const label = r.engagement_level.replace(/_/g, ' ');
    const parts = [`${r.success}/${r.total} went well`];
    if (r.escalated) parts.push(`${r.escalated} escalated`);
    return `- ${label}: ${parts.join(', ')}`;
  }).join('\n');
}

/**
 * Every entry, oldest first — the user's data, theirs to take with them.
 */
export function getAllEntriesForExport() {
  const database = getDb();
  return database.prepare('SELECT * FROM entries ORDER BY created_at ASC').all();
}

/**
 * Permanently delete everything. Order matters: in WAL mode the VACUUM's
 * rebuild is written THROUGH the write-ahead log, so the checkpoint has to
 * come after it — otherwise the main database file keeps the old pages,
 * with every deleted message still readable in plaintext, until some later
 * checkpoint that may never come.
 *
 * Erase-all wipes the bytes immediately. Single-entry deletes are zeroed by
 * secure_delete and land in the main file on the next checkpoint.
 */
export function deleteAllEntries() {
  const database = getDb();
  const result = database.prepare('DELETE FROM entries').run();
  database.exec('VACUUM');
  database.pragma('wal_checkpoint(TRUNCATE)');
  return result.changes;
}
