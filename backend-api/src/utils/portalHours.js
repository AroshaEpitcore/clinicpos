/**
 * Portal-hours helpers — drives when the public online-booking portal is open.
 *
 * portal_hours rows: { day_of_week (0=Sun..6=Sat), is_open, open_time, close_time }
 */

const { queryTenant } = require('../config/db');

/**
 * Returns { open_now, today: row|null, next_open: { day_of_week, day_label, open_time, close_time }|null, hours: [...rows] }
 *
 * `open_now` is true when today's row is open and current time is within
 * [open_time, close_time). `next_open` is the next future day_of_week that
 * is open (so the frontend can render "Opens Mon 8:00 AM").
 */
async function getPortalHoursStatus(schema, now = new Date()) {
  const rows = (await queryTenant(
    schema,
    `SELECT day_of_week, is_open, open_time, close_time FROM portal_hours ORDER BY day_of_week`
  )).rows;

  if (rows.length === 0) {
    return { open_now: true, today: null, next_open: null, hours: [] };  // permissive when unconfigured
  }

  const dayMap = new Map(rows.map(r => [r.day_of_week, r]));
  const today = dayMap.get(now.getDay()) || null;

  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const inWindow = (row) => {
    if (!row || !row.is_open) return false;
    const openHHMM  = String(row.open_time).slice(0, 5);
    const closeHHMM = String(row.close_time).slice(0, 5);
    return hhmm >= openHHMM && hhmm < closeHHMM;
  };

  const openNow = inWindow(today);

  // Find next open day (today if it hasn't opened yet, else following day)
  const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let nextOpen = null;
  for (let offset = 0; offset < 8; offset++) {
    const dow = (now.getDay() + offset) % 7;
    const row = dayMap.get(dow);
    if (!row || !row.is_open) continue;
    if (offset === 0) {
      // Today — is it still ahead of `now`?
      const openHHMM = String(row.open_time).slice(0, 5);
      if (hhmm < openHHMM) {
        nextOpen = { day_of_week: dow, day_label: DAY_LABELS[dow], open_time: openHHMM, close_time: String(row.close_time).slice(0, 5), is_today: true };
        break;
      }
      continue;
    }
    nextOpen = { day_of_week: dow, day_label: DAY_LABELS[dow], open_time: String(row.open_time).slice(0, 5), close_time: String(row.close_time).slice(0, 5), is_today: false };
    break;
  }

  return { open_now: openNow, today, next_open: nextOpen, hours: rows };
}

module.exports = { getPortalHoursStatus };
