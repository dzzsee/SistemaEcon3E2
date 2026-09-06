import bcrypt from 'bcryptjs'
import { getDb, initSchema, getSetting } from '../lib/db.js'
import { ensureDefaults } from '../lib/defaults.js'

initSchema()
ensureDefaults()

const d = getDb()
const password = process.env.ADMIN_PASSWORD || 'admin123'
const username = process.env.ADMIN_USERNAME || 'admin'

const existing = d.prepare('SELECT id FROM admin WHERE username = ?').get(username)
if (existing) {
  console.log(`Admin '${username}' already exists; skipping.`)
} else {
  const hash = bcrypt.hashSync(password, 10)
  d.prepare('INSERT INTO admin (username, password_hash, created_at) VALUES (?, ?, ?)').run(
    username,
    hash,
    new Date().toISOString(),
  )
  console.log(`Created admin '${username}' with password '${password}'.`)
}

console.log('Database initialized successfully.')