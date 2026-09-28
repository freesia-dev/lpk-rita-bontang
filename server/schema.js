// Skema database (SQLite). Dipakai oleh Node (node:sqlite) dan Cloudflare D1.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone TEXT, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
    active INTEGER NOT NULL DEFAULT 1, xp INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0, last_active TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT, summary TEXT,
    cover TEXT, level TEXT, access TEXT NOT NULL DEFAULT 'open', published INTEGER NOT NULL DEFAULT 0,
    pass_score INTEGER NOT NULL DEFAULT 70, curriculum TEXT NOT NULL DEFAULT '[]',
    position INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active', progress TEXT NOT NULL DEFAULT '{}',
    completed_at TEXT, cert_code TEXT UNIQUE, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id))`,
  `CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, program TEXT,
    message TEXT, status TEXT NOT NULL DEFAULT 'baru', note TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY, url TEXT NOT NULL, name TEXT, size INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id)`,
];
