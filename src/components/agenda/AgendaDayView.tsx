import React from 'react';
import { Clock, Plus, User, Sparkles, AlertCircle, CheckCircle, Coffee } from 'lucide-react';
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

const HOURS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
];

export function AgendaDayView({
  currentDate,
  selectedStaffId,
  onSelectAppointment,
  onSlotClick,
  onOpenWhatsApp,
}: AgendaDayViewProps) {
  const { appointments, staff, business } = useApp();

  // Filter appointments for this date and staff
  const dayAppointments = appointments.filter((apt) => {
    if (apt.date !== currentDate) return false;
    if (selectedStaffId !== 'todos' && apt.staffId !== selectedStaffId) return false;
    return true;
  });

  return (
    <div className="bg-[#f1f5f9] rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
      {/* Top Day Overview Bar */}
      <div className="p-4 bg-slate-200/90 border-b-2 border-slate-300 flex items-center justify-between text-xs">
        <span className="font-extrabold text-slate-900">
          {dayAppointments.length === 0
            ? 'No hay turnos programados para hoy'
            : `${dayAppointments.length} turno(s) agendados para este día`}
        </span>
        <span className="text-slate-600 font-bold">
          Toca cualquier franja horaria para agendar un turno rápido
        </span>
      </div>

      {/* Hourly Timeline */}
      <div className="divide-y-2 divide-slate-200">
        {HOURS.map((hour) => {
          const matchingAppointments = dayAppointments.filter((a) => {
            const [aptH, aptM] = a.time.split(':').map(Number);
            const [hH, hM] = hour.split(':').map(Number);
            const aptMinutes = aptH * 60 + aptM;
            const slotMinutes = hH * 60 + hM;
            return aptMinutes >= slotMinutes && aptMinutes < slotMinutes + 30;
          });

          return (
            <div
              key={hour}
              className="grid grid-cols-[80px_repeat(auto-fit,minmax(180px,1fr))] items-start min-h-[64px] hover:bg-blue-100/60 transition-colors group relative"
            >
              {/* Time Column */}
              <div className="w-16 sm:w-20 py-3.5 px-3 border-r-2 border-slate-300 bg-slate-200/60 text-right select-none shrink-0">
                <span className="text-xs font-black text-slate-900 block">{hour}</span>
                <span className="text-[10px] text-slate-600 font-bold">hs</span>
              </div>

              {/* Slot Area */}
              <div className="flex-1 p-2 flex flex-wrap gap-2 items-center">
                {matchingAppointments.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => onSlotClick(hour)}
                    className="w-full h-9 rounded-xl border-2 border-dashed border-blue-400 bg-blue-100/80 hover:bg-blue-600 text-blue-900 hover:text-white text-xs font-black flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Agendar en las {hour} hs</span>
                  </button>
                ) : (
                  matchingAppointments.map((apt) => {
                    const status = getStatusBadge(apt.status);
                    const staffMember = staff.find((s) => s.id === apt.staffId);
                    const cardColor = apt.color || staffMember?.color || '#2563eb';

                    return (
                      <div
                        key={apt.id}
                        onClick={() => onSelectAppointment(apt)}
                        className={`flex-1 min-w-[280px] p-3 rounded-xl border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-100 hover:shadow-md cursor-pointer transition-all bg-[#f8fafc] relative overflow-hidden group/card ${
                          apt.status === 'cancelado' ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        {/* Side color stripe */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2.5"
                          style={{ backgroundColor: cardColor }}
                        />

                        <div className="pl-2">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cardColor }}
                              />
                              <span className="font-bold text-sm text-slate-900 group-hover/card:text-blue-600 transition-colors">
                                {apt.clientName}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.bg}`}>
                                {status.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {apt.clientPhone && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWhatsAppTurno(apt, business?.phoneCountryPrefix || '+54');
                                    onOpenWhatsApp(apt);
                                  }}
                                  className="p-1.5 hover:bg-emerald-600 rounded-lg text-emerald-600 hover:text-white transition-all shadow-2xs"
                                  title={`Enviar WhatsApp a ${apt.clientName}`}
                                >
                                  <WhatsAppIcon size={14} variant="monochrome" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              {apt.serviceName} ({apt.durationMinutes}m)
                            </span>

                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-sky-600" />
                              {apt.staffName}
                            </span>

                            <span className="ml-auto font-bold text-slate-900 text-xs">
                              {formatCurrency(apt.price, business?.currency)}
                              {apt.remainingBalance > 0 && (
                                <span className="text-[#0F172A] text-[10px] font-bold ml-1.5">
                                  (Resta {formatCurrency(apt.remainingBalance, business?.currency)})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
