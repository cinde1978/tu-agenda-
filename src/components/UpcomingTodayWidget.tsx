import React from 'react';
import { Clock, Calendar } from 'lucide-react';
import { Appointment } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, getStatusBadge, openWhatsAppTurno } from '../utils/formatters';
import { WhatsAppIcon } from './icons/WhatsAppIcon';

interface UpcomingTodayWidgetProps {
  onSelectAppointment: (appointment: Appointment) => void;
  onOpenWhatsApp: (appointment: Appointment) => void;
  onNewAppointment: () => void;
}

export function UpcomingTodayWidget({
  onSelectAppointment,
  onOpenWhatsApp,
  onNewAppointment,
}: UpcomingTodayWidgetProps) {
  const { upcomingTodayAppointments, business } = useApp();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#0F172A] flex items-center justify-center font-bold border border-slate-300 shadow-2xs">
            <Clock className="w-4 h-4 text-[#0F172A] stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-black text-sm text-[#0F172A] leading-tight">
              Próximos Turnos del Día
            </h3>
            <p className="text-[11px] text-slate-700 font-semibold">
              {upcomingTodayAppointments.length === 0
                ? 'No hay turnos pendientes para hoy'
                : `${upcomingTodayAppointments.length} cliente(s) agendados para atender hoy`}
            </p>
          </div>
        </div>

        {upcomingTodayAppointments.length > 0 && (
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-[#0F172A] border border-slate-300 shadow-2xs">
            {upcomingTodayAppointments.length} activos
          </span>
        )}
      </div>

      {/* List or Empty State */}
      {upcomingTodayAppointments.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 space-y-2">
          <Calendar className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-600 font-medium">No hay turnos para hoy en el salón.</p>
          <button
            type="button"
            onClick={onNewAppointment}
            className="text-xs text-blue-700 font-bold hover:underline"
          >
            + Agendar primer turno para hoy
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {upcomingTodayAppointments.slice(0, 6).map((apt) => {
            const status = getStatusBadge(apt.status);
            const avatarColor = apt.color || '#2563EB';
            const initials = apt.clientName
              .split(' ')
              .map((n) => n.charAt(0))
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={apt.id}
                onClick={() => onSelectAppointment(apt)}
                className="p-4 rounded-xl border border-slate-200/80 hover:border-blue-400 bg-white hover:bg-blue-50/20 shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group min-w-0"
              >
                {/* Client Avatar + Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-slate-900 group-hover:text-blue-700 transition-colors truncate block">
                        {apt.clientName}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {apt.serviceName}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-bold text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {apt.time} hs
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${status.bg}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Quick Trigger (Direct WhatsApp Open with preconfigured confirmation) */}
                {apt.clientPhone && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openWhatsAppTurno(apt, business?.phoneCountryPrefix || '+54');
                      onOpenWhatsApp(apt);
                    }}
                    className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition-all shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                    title={`Enviar WhatsApp a ${apt.clientName}`}
                  >
                    <WhatsAppIcon size={16} variant="monochrome" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
