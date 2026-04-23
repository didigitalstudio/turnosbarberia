import { Avatar } from '@/components/shared/Avatar';
import { Icon } from '@/components/shared/Icon';
import type { Barber, Schedule } from '@/types/db';

const DAY_LABELS = ['L','M','M','J','V','S','D']; // Mon..Sun
const SLOTS_PER_DAY = 20; // 10h * 2 slots/h

export function TeamView({
  barbers, weekAppts, schedules, startOfWeek, todayISO, tomorrowISO
}: {
  barbers: Barber[];
  weekAppts: { id: string; barber_id: string; starts_at: string; status: string }[];
  schedules: Schedule[];
  startOfWeek: string;
  todayISO: string;
  tomorrowISO: string;
}) {
  const start = new Date(startOfWeek);
  const todayDate = new Date(todayISO);
  const tomorrowDate = new Date(tomorrowISO);

  return (
    <div className="flex-1 overflow-auto px-5 pt-4 pb-5">
      {barbers.map(b => {
        const barberAppts = weekAppts.filter(a => a.barber_id === b.id);
        const todayCount = barberAppts.filter(a => {
          const d = new Date(a.starts_at);
          return d >= todayDate && d < tomorrowDate;
        }).length;
        const weekCount = barberAppts.length;

        // bar chart: appointments per weekday (Mon..Sun)
        const perDay = Array(7).fill(0);
        for (const a of barberAppts) {
          const dateStart = new Date(a.starts_at);
          const idx = Math.floor((dateStart.getTime() - start.getTime()) / 86400000);
          if (idx >= 0 && idx < 7) perDay[idx]++;
        }

        // working days for this barber
        const working = new Set(
          schedules.filter(s => s.barber_id === b.id && s.is_working).map(s => s.day_of_week)
        );

        // hours summary string
        const wd = schedules.filter(s => s.barber_id === b.id && s.is_working);
        const hoursStr = wd.length
          ? `${dayRangeLabel(working)} · ${wd[0].start_time.replace(':00','')}-${wd[0].end_time.replace(':00','')}`
          : 'Sin horario';

        const occupancy = Math.min(100, Math.round((weekCount * 100) / (SLOTS_PER_DAY * working.size || 1)));

        return (
          <div key={b.id} className="bg-dark-card border border-dark-line rounded-2xl px-4 py-3.5 mb-2.5">
            <div className="flex items-center gap-3">
              <Avatar name={b.initials} size={46} hue={b.hue} dark/>
              <div className="flex-1">
                <div className="text-[15px] font-semibold text-bg">{b.name}</div>
                <div className="text-[11px] text-dark-muted mt-0.5">{b.role}</div>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-dark" style={{ color: '#B6754C' }}>
                <Icon name="star" size={12} color="#B6754C"/>
                <span className="text-[11px] font-semibold">{Number(b.rating).toFixed(1)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Stat l="Hoy"      v={todayCount}/>
              <Stat l="Semana"   v={weekCount}/>
              <Stat l="Ocupación" v={`${occupancy}%`}/>
            </div>

            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-dark-muted">
              <Icon name="clock" size={12} color="#8C8A83"/>
              {hoursStr}
            </div>

            <div className="flex gap-1 mt-3">
              {DAY_LABELS.map((d, di) => {
                // di: 0=Lun..6=Dom; map to dow (0=Sun..6=Sat) → di=0 → dow=1, di=6 → dow=0
                const dow = (di + 1) % 7;
                const off = !working.has(dow);
                const max = Math.max(...perDay, 1);
                const pct = off ? 0 : Math.max(8, Math.round((perDay[di] * 100) / max));
                const isToday = di === ((todayDate.getDay() + 6) % 7);
                return (
                  <div key={di} className="flex-1 text-center">
                    <div className="h-[30px] bg-dark rounded-xs overflow-hidden flex items-end">
                      <div className="w-full rounded-t-xs"
                        style={{
                          height: `${pct}%`,
                          background: off ? 'transparent' : isToday ? '#B6754C' : `oklch(0.75 0.06 ${b.hue})`,
                          opacity: off ? 0 : 1
                        }}/>
                    </div>
                    <div className={`text-[9px] mt-1 ${off ? 'text-dark-muted' : 'text-bg'}`}>{d}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ l, v }: { l: string; v: number | string }) {
  return (
    <div className="flex-1 bg-dark rounded-s px-2.5 py-2">
      <div className="text-[9px] text-dark-muted uppercase">{l}</div>
      <div className="font-display text-[20px] text-bg leading-none mt-0.5">{v}</div>
    </div>
  );
}

function dayRangeLabel(working: Set<number>) {
  const list = Array.from(working).sort();
  if (list.length === 6 && !list.includes(0)) return 'Lun-Sáb';
  if (list.length === 5 && !list.includes(0) && !list.includes(6)) return 'Lun-Vie';
  if (list.length === 7) return 'Todos los días';
  return list.map(n => ['D','L','M','M','J','V','S'][n]).join('·');
}
