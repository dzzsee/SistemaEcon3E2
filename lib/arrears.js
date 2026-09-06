const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function startOfWeek(date, weekStartDay) {
  const d = new Date(date)
  const dayOffset = (d.getDay() - weekStartDay + 7) % 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - dayOffset)
  return d
}

function addWeeks(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n * 7)
  return d
}

export function weekKey(date, weekStartDay = 1) {
  const s = startOfWeek(date, weekStartDay)
  return s.toISOString().slice(0, 10)
}

export function weeksBetween(startKey, endKey) {
  const start = new Date(startKey + 'T00:00:00Z')
  const end = new Date(endKey + 'T00:00:00Z')
  return Math.round((end.getTime() - start.getTime()) / WEEK_MS)
}

export function listWeekKeys(startKey, count) {
  const keys = []
  for (let i = 0; i < count; i++) {
    keys.push(weekKey(addWeeks(new Date(startKey + 'T00:00:00Z'), i)))
  }
  return keys
}

export function currentWeekKey(weekStartDay) {
  return weekKey(new Date(), weekStartDay)
}

export function isBeforeOrEqualWeek(a, b) {
  return new Date(a + 'T00:00:00Z') <= new Date(b + 'T00:00:00Z')
}

export function computeStatus({ globalStart, weekStartDay, paidWeeks }) {
  const today = weekKey(new Date(), weekStartDay)
  const start = globalStart

  if (new Date(start + 'T00:00:00Z') > new Date(today + 'T00:00:00Z')) {
    return { key: 'aldia', weeks: 0, atrasado: false, dueWeeks: 0 }
  }

  const totalWeeks = weeksBetween(start, today) + 1
  const paid = new Set(paidWeeks)
  let missed = 0
  for (let i = 0; i < totalWeeks; i++) {
    const key = weekKey(addWeeks(new Date(start + 'T00:00:00Z'), i), weekStartDay)
    if (new Date(key + 'T00:00:00Z') > new Date(today + 'T00:00:00Z')) break
    if (!paid.has(key)) missed++
  }
  const paidCount = totalWeeks - missed
  const unpaidWeeks = missed

  let key, weeks
  if (unpaidWeeks === 0) {
    key = 'aldia'
    weeks = 0
  } else if (unpaidWeeks === 1) {
    key = '1sem'
    weeks = 1
  } else {
    key = '2sem'
    weeks = unpaidWeeks
  }
  return {
    key,
    weeks,
    atrasado: key !== 'aldia',
    paidCount,
    unpaidWeeks,
    totalWeeks,
  }
}

export function latestUnpaidWeek({ globalStart, weekStartDay, paidWeeks }) {
  const today = currentWeekKey(weekStartDay)
  if (new Date(globalStart + 'T00:00:00Z') > new Date(today + 'T00:00:00Z')) {
    return null
  }
  const totalWeeks = weeksBetween(globalStart, today) + 1
  const paid = new Set(paidWeeks)
  for (let i = totalWeeks - 1; i >= 0; i--) {
    const key = weekKey(addWeeks(new Date(globalStart + 'T00:00:00Z'), i), weekStartDay)
    if (new Date(key + 'T00:00:00Z') > new Date(today + 'T00:00:00Z')) continue
    if (!paid.has(key)) return key
  }
  return null
}