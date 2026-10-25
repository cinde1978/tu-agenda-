import React from 'react';
import {
  X,
  Bell,
  Clock,
  MessageCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { Appointment, Business } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateSpanishLong, openWhatsAppTurno } from '../../utils/formatters';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

interface RemindersModalProps {
  onClose: () => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onOpenWhatsApp: (appointment: Appointment) => void;
}

export function RemindersModal({
  onClose,
  onSelectAppointment,
  onOpenWhatsApp,
}: RemindersModalProps) {
  const { upcomingTodayAppointments, business } = useApp();

  const handleTestSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('AudioContext not allowed yet', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-sky-600 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Centro de Recordatorios</h3>
              <p className="text-blue-100 text-xs">
                Turnos programados para hoy listos para avisar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleTestSound}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white/90 hover:text-white transition-colors"
              title="Probar sonido de campana"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of appointments */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {upcomingTodayAppointments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No hay turnos pendientes para hoy</p>
              <p className="mt-0.5">Todos los clientes están al día o no hay turnos agendados en esta fecha.</p>
            </div>
          ) : (
            upcomingTodayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between gap-3 group"
              >
                <div
                  className="cursor-pointer space-y-1 flex-1 min-w-0"
                  onClick={() => {
                    onClose();
                    onSelectAppointment(apt);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded text-xs">
                      {apt.time} hs
                    </span>
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {apt.clientName}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 truncate">
                    {apt.serviceName} · {apt.staffName}
                  </div>

                  {apt.clientPhone && (
                    <div className="text-[11px] text-slate-400">
                      {apt.clientPhone}
                    </div>
                  )}
                </div>

                {/* Direct WhatsApp trigger */}
                {apt.clientPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      openWhatsAppTurno(apt, business?.phoneCountryPrefix || '+54');
                      onClose();
                      onOpenWhatsApp(apt);
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0 transition-all hover:scale-105 active:scale-95"
                    title={`Enviar WhatsApp a ${apt.clientName}`}
                  >
                    <WhatsAppIcon size={14} variant="monochrome" />
                    <span>Avisar</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{upcomingTodayAppointments.length} turnos para hoy</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
