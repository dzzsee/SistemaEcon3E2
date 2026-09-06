import bcrypt from 'bcryptjs'
import { getDb, initSchema, getSetting } from '../lib/db.js'
import { ensureDefaults } from '../lib/defaults.js'

initSchema()
ensureDefaults()

const d = getDb()
const admins = [
  { username: process.env.ADMIN_USERNAME || 'TeSoReRo', password: process.env.ADMIN_PASSWORD || 'tEsOrErO' },
  { username: 'tutor', password: 'tutor123' },
  { username: 'presidente', password: 'presidente123' },
]

const insert = d.prepare(
  'INSERT OR IGNORE INTO admin (username, password_hash, created_at) VALUES (?, ?, ?)',
)

for (const { username, password } of admins) {
  const existing = d.prepare('SELECT id FROM admin WHERE username = ?').get(username)
  if (existing) {
    console.log(`Admin '${username}' already exists; skipping.`)
  } else {
    const hash = bcrypt.hashSync(password, 10)
    insert.run(username, hash, new Date().toISOString())
    console.log(`Created admin '${username}' with password '${password}'.`)
  }
}

console.log('Database initialized successfully.')