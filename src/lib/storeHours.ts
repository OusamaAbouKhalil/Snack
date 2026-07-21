import { BusinessHoursRow } from '../hooks/useBusinessHours';

const BEIRUT_TZ = 'Asia/Beirut';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function beirutParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BEIRUT_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')!.value;
  let hour = parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(parts.find((p) => p.type === 'minute')!.value, 10);

  return { dayOfWeek: WEEKDAYS.indexOf(weekday), minutesOfDay: hour * 60 + minute };
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Mirrors the DB's is_store_open() — same Asia/Beirut tz, same overnight-wrap rule. */
export function computeStoreStatus(hours: BusinessHoursRow[], now: Date = new Date()) {
  const { dayOfWeek, minutesOfDay } = beirutParts(now);
  const today = hours.find((h) => h.day_of_week === dayOfWeek) || null;

  if (!today || today.is_closed) {
    return { isOpen: false, today };
  }

  const open = toMinutes(today.open_time);
  const close = toMinutes(today.close_time);
  const isOpen = close > open
    ? minutesOfDay >= open && minutesOfDay <= close
    : minutesOfDay >= open || minutesOfDay <= close;

  return { isOpen, today };
}
