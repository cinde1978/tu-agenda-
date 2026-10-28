import React, { useMemo } from 'react';
import { Clock, Plus, User, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { Appointment, StaffMember } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getStatusBadge, openWhatsAppTurno } from '../../utils/formatters';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

interface AgendaDayViewProps {
  currentDate: string;
  selectedStaffId: string;
  onSelectAppointment: (appointment: Appointment) => void;
  onSlotClick: (time: string) => void;
  onOpenWhatsApp: (appointment: Appointment) => void;
}

const START_HOUR = 8; // 08:00
const END_HOUR = 21; // 21:00
const DAY_START_MINUTES = START_HOUR * 60; // 480
const HOUR_HEIGHT = 80; // 80px per 60 minutes
const SLOT_HEIGHT = 40; // 40px per 30 minutes

// Generate 30-min interval labels
const SLOTS: string[] = [];
for (let h = START_HOUR; h < END_HOUR; h++) {
  const hStr = String(h).padStart(2, '0');
  SLOTS.push(`${hStr}:00`);
  SLOTS.push(`${hStr}:30`);
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + (durationMinutes || 30);
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

interface LayoutItem {
  appointment: Appointment;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
}

function computeAppointmentLayout(
  appointments: Appointment[],
  dayStartMinutes: number,
  hourHeight: number
): LayoutItem[] {
  if (appointments.length === 0) return [];

  // Sort by start time, then duration descending
  const sorted = [...appointments].sort((a, b) => {
    const [ah, am] = a.time.split(':').map(Number);
    const [bh, bm] = b.time.split(':').map(Number);
    const aStart = ah * 60 + am;
    const bStart = bh * 60 + bm;
    if (aStart !== bStart) return aStart - bStart;
    return (b.durationMinutes || 30) - (a.durationMinutes || 30);
  });

  // Group overlapping appointments into clusters
  const clusters: Appointment[][] = [];
  let currentCluster: Appointment[] = [];
  let clusterEnd = -1;

  for (const apt of sorted) {
    const [h, m] = apt.time.split(':').map(Number);
    const start = h * 60 + m;
    const duration = apt.durationMinutes || 30;
    const end = start + duration;

    if (currentCluster.length === 0) {
      currentCluster.push(apt);
      clusterEnd = end;
    } else if (start < clusterEnd) {
      currentCluster.push(apt);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [apt];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Layout each cluster into side-by-side columns
  const result: LayoutItem[] = [];

  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const positions: Array<{ apt: Appointment; col: number }> = [];

    for (const apt of cluster) {
      const [h, m] = apt.time.split(':').map(Number);
      const start = h * 60 + m;
      const duration = apt.durationMinutes || 30;
      const end = start + duration;

      let colIndex = columnEnds.findIndex((colEnd) => colEnd <= start);
      if (colIndex === -1) {
        colIndex = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[colIndex] = end;
      }
      positions.push({ apt, col: colIndex });
    }

    const totalCols = columnEnds.length;
    for (const pos of positions) {
      const [h, m] = pos.apt.time.split(':').map(Number);
      const start = h * 60 + m;
      const duration = pos.apt.durationMinutes || 30;
      const top = ((start - dayStartMinutes) / 60) * hourHeight;
      const height = Math.max(38, (duration / 60) * hourHeight - 2);
      const widthPercent = 100 / totalCols;
      const leftPercent = pos.col * widthPercent;

      result.push({
        appointment: pos.apt,
        top,
        height,
        leftPercent,
        widthPercent,
      });
    }
  }

  return result;
}

export function AgendaDayView({
  currentDate,
  selectedStaffId,
  onSelectAppointment,
  onSlotClick,
  onOpenWhatsApp,
}: AgendaDayViewProps) {
  const { appointments, staff, business } = useApp();

  // Filter appointments for this date and selected staff
  const dayAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (apt.date !== currentDate) return false;
      if (selectedStaffId !== 'todos' && apt.staffId !== selectedStaffId) return false;
      return true;
    });
  }, [appointments, currentDate, selectedStaffId]);

  // Compute visual duration layout
  const layoutItems = useMemo(() => {
    return computeAppointmentLayout(dayAppointments, DAY_START_MINUTES, HOUR_HEIGHT);
  }, [dayAppointments]);

  const totalGridHeight = SLOTS.length * SLOT_HEIGHT;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
      {/* Top Day Overview Bar */}
      <div className="p-4 bg-slate-100 border-b-2 border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-black text-[#0F172A] text-sm">
            {dayAppointments.length === 0
              ? 'No hay turnos programados para este día'
              : `${dayAppointments.length} turno(s) agendados`}
          </span>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[11px] border border-blue-300">
            Escala real: 60 min = 1 hora completa
          </span>
        </div>
        <span className="text-slate-600 font-bold text-xs">
          Haz clic en cualquier horario libre para agendar
        </span>
      </div>

      {/* Hourly Timeline with Proportional Visual Duration */}
      <div className="relative overflow-x-auto">
        <div
          className="relative min-w-[650px]"
          style={{ height: `${totalGridHeight}px` }}
        >
          {/* Background Grid: 30-min time slot rows */}
          <div className="absolute inset-0 flex flex-col">
            {SLOTS.map((slot) => {
              const isHour = slot.endsWith(':00');

              return (
                <div
                  key={slot}
                  style={{ height: `${SLOT_HEIGHT}px` }}
                  className={`flex items-center border-b transition-colors group cursor-pointer ${
                    isHour
                      ? 'border-slate-300 bg-white hover:bg-blue-50/70'
                      : 'border-slate-200/80 bg-slate-50/30 hover:bg-blue-50/70'
                  }`}
                  onClick={() => onSlotClick(slot)}
                >
                  {/* Time label */}
                  <div
                    className={`w-20 px-3 text-right select-none shrink-0 border-r-2 border-slate-300 ${
                      isHour
                        ? 'font-black text-sm text-[#0F172A]'
                        : 'font-bold text-xs text-slate-500'
                    }`}
                  >
                    <span>{slot}</span>
                  </div>

                  {/* Slot empty hint */}
                  <div className="flex-1 px-4 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-blue-700 transition-colors flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Disponible · Agendar {slot} hs</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Foreground Appointments Layer: Real Duration Blocks */}
          <div className="absolute top-0 bottom-0 right-0 left-20 pointer-events-none p-1">
            {layoutItems.map((item) => {
              const apt = item.appointment;
              const staffMember = staff.find((s) => s.id === apt.staffId);
              const cardColor = apt.color || staffMember?.color || '#2563eb';
              const status = getStatusBadge(apt.status);
              const endTime = calculateEndTime(apt.time, apt.durationMinutes || 30);
              const isCancelled = apt.status === 'cancelado';

              return (
                <div
                  key={apt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAppointment(apt);
                  }}
                  style={{
                    position: 'absolute',
                    top: `${item.top}px`,
                    height: `${item.height}px`,
                    left: `calc(${item.leftPercent}% + 4px)`,
                    width: `calc(${item.widthPercent}% - 8px)`,
                  }}
                  className={`pointer-events-auto rounded-xl border-2 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between group ${
                    isCancelled
                      ? 'bg-slate-100 border-slate-300 opacity-60 line-through'
                      : 'bg-white border-slate-300 hover:border-blue-600'
                  }`}
                  title={`${apt.clientName} - ${apt.serviceName} (${apt.time} a ${endTime} hs)`}
                >
                  {/* Left accent color stripe */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2.5"
                    style={{ backgroundColor: cardColor }}
                  />

                  {/* Card Content with High-Contrast Typography */}
                  <div className="pl-4 pr-2.5 py-1.5 flex flex-col justify-between h-full">
                    {/* Header: Client Name, Time Range & Status */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cardColor }}
                        />
                        <span className="font-black text-xs sm:text-sm text-[#0F172A] group-hover:text-blue-700 truncate">
                          {apt.clientName}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-black text-blue-900 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-300 shrink-0">
                          {apt.time} - {endTime} ({apt.durationMinutes}m)
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black border ${status.bg}`}
                        >
                          {status.label}
                        </span>
                        {apt.clientPhone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsAppTurno(apt, business?.phoneCountryPrefix || '+54');
                              onOpenWhatsApp(apt);
                            }}
                            className="p-1 hover:bg-emerald-600 rounded text-emerald-600 hover:text-white transition-all shadow-2xs"
                            title={`Enviar WhatsApp a ${apt.clientName}`}
                          >
                            <WhatsAppIcon size={13} variant="monochrome" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle details: Service, Staff & Price */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-bold text-slate-700 mt-0.5">
                      <span className="flex items-center gap-1 text-[#0F172A] font-extrabold truncate">
                        <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">{apt.serviceName}</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-700 truncate">
                        <User className="w-3 h-3 text-sky-700 shrink-0" />
                        <span className="truncate">{apt.staffName}</span>
                      </span>

                      <span className="ml-auto font-black text-[#0F172A] text-xs">
                        {formatCurrency(apt.price, business?.currency)}
                        {apt.remainingBalance > 0 && (
                          <span className="text-amber-700 text-[10px] font-black ml-1">
                            (Resta {formatCurrency(apt.remainingBalance, business?.currency)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
