import React, { useState } from 'react';
import { Building2, Plus, Clock, Users, User, Calendar, CheckCircle } from 'lucide-react';
import { Appointment, BranchId, StaffMember } from '../../types';
import { useApp } from '../../context/AppContext';
import { StaffModal } from '../staff/StaffModal';

export interface AgendaStaffViewProps {
  currentDate?: string;
  onSelectAppointment?: (appointment: Appointment) => void;
  onSelectSlot?: (staffId: string, time: string) => void;
}

const HOURS = [
  '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30',
  '20:00'
];

export function AgendaStaffView({
  currentDate,
  onSelectAppointment,
  onSelectSlot,
}: AgendaStaffViewProps = {}) {
  const { staff, appointments, selectedBranch, setSelectedBranch } = useApp();

  const [activeBranch, setActiveBranch] = useState<BranchId>(selectedBranch || 'sucursal_1');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Filter staff by the active sucursal
  const branchStaff = staff.filter(
    (s) => s.active && (!s.branchId || s.branchId === 'ambas' || s.branchId === activeBranch)
  );

  // Filter appointments for this date and branch
  const dateStr = currentDate || new Date().toISOString().split('T')[0];
  const dayAppointments = appointments.filter((apt) => {
    if (apt.date !== dateStr) return false;
    const aptBranch = apt.branchId || 'sucursal_1';
    return aptBranch === activeBranch && apt.status !== 'cancelado';
  });

  const handleBranchChange = (branch: BranchId) => {
    setActiveBranch(branch);
    setSelectedBranch(branch);
  };

  return (
    <div className="bg-[#f1f5f9] rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
      {/* Top Controls Bar: Branch Toggle & Add Staff */}
      <div className="p-4 sm:p-5 bg-slate-200/90 border-b-2 border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
              Agenda Multi-Staff por Sucursal
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Sincronizado
            </span>
          </div>
          <p className="text-xs text-slate-600 font-bold mt-0.5">
            Visualiza los turnos de todos los profesionales en paralelo para la sucursal seleccionada.
          </p>
        </div>

        {/* Branch Switch Buttons & Add Staff CTA */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-300/80 p-1 rounded-xl border border-slate-400/50">
            <button
              type="button"
              onClick={() => handleBranchChange('sucursal_1')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeBranch === 'sucursal_1'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-800 hover:bg-blue-600 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Sucursal 1</span>
            </button>

            <button
              type="button"
              onClick={() => handleBranchChange('sucursal_2')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeBranch === 'sucursal_2'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-800 hover:bg-purple-600 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Sucursal 2</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsStaffModalOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title={`Agregar profesional a ${activeBranch === 'sucursal_1' ? 'Sucursal 1' : 'Sucursal 2'}`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ Agregar Staff a esta Sucursal</span>
          </button>
        </div>
      </div>

      {/* Main Staff Schedule Matrix */}
      {branchStaff.length === 0 ? (
        <div className="p-12 text-center bg-[#f1f5f9]">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-black text-slate-900">
            No hay profesionales asignados a {activeBranch === 'sucursal_1' ? 'Sucursal 1' : 'Sucursal 2'}
          </h4>
          <p className="text-xs text-slate-600 font-bold max-w-sm mx-auto mt-1 mb-4">
            Agrega profesionales o edita los existentes para asignarlos a esta sucursal.
          </p>
          <button
            type="button"
            onClick={() => setIsStaffModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Agregar Profesional a {activeBranch === 'sucursal_1' ? 'Sucursal 1' : 'Sucursal 2'}</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto bg-slate-100">
          <div
            className="grid min-w-[750px] divide-x-2 divide-slate-300 border-b-2 border-slate-300"
            style={{
              gridTemplateColumns: `80px repeat(${branchStaff.length}, minmax(160px, 1fr))`,
            }}
          >
            {/* Header: Hour Column Header */}
            <div className="sticky top-0 z-20 bg-slate-300/90 p-3 text-center text-xs font-black text-slate-900 border-b-2 border-slate-300">
              Hora
            </div>

            {/* Header: Staff Names Headers */}
            {branchStaff.map((member) => (
              <div
                key={member.id}
                className="sticky top-0 z-20 bg-slate-200 p-2.5 text-center border-b-2 border-slate-300 flex flex-col items-center justify-center gap-1 shadow-2xs"
              >
                <div className="flex items-center gap-1.5 max-w-full">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-2xs ring-1 ring-slate-400"
                    style={{ backgroundColor: member.color || '#2563eb' }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-black text-slate-900 truncate">
                    {member.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-700 font-bold truncate max-w-full">
                  {member.role}
                </span>
              </div>
            ))}

            {/* Time Rows */}
            {HOURS.map((hour) => {
              const [hH, hM] = hour.split(':').map(Number);
              const slotMinutes = hH * 60 + hM;

              return (
                <React.Fragment key={hour}>
                  {/* Time label */}
                  <div className="h-12 border-b-2 border-slate-200 bg-slate-200/80 flex items-center justify-center text-xs font-black text-slate-800 select-none">
                    {hour}
                  </div>

                  {/* Staff Cells */}
                  {branchStaff.map((member) => {
                    const aptForSlot = dayAppointments.find((a) => {
                      if (a.staffId !== member.id) return false;
                      const [aH, aM] = a.time.split(':').map(Number);
                      const aptStart = aH * 60 + aM;
                      const aptEnd = aptStart + (a.durationMinutes || 30);
                      return slotMinutes >= aptStart && slotMinutes < aptEnd;
                    });

                    const isStartSlot = aptForSlot && (() => {
                      const [aH, aM] = aptForSlot.time.split(':').map(Number);
                      return slotMinutes === (aH * 60 + aM);
                    })();

                    return (
                      <div
                        key={`${member.id}-${hour}`}
                        className="h-12 border-b border-slate-200 p-1 relative transition-colors group cursor-pointer hover:bg-blue-200/80 hover:border-blue-600"
                        onClick={() => {
                          if (aptForSlot) {
                            if (onSelectAppointment) onSelectAppointment(aptForSlot);
                          } else {
                            if (onSelectSlot) onSelectSlot(member.id, hour);
                          }
                        }}
                      >
                        {aptForSlot ? (
                          <div
                            className={`w-full h-full rounded-lg px-2 py-0.5 flex flex-col justify-center text-xs shadow-2xs border overflow-hidden ${
                              isStartSlot
                                ? 'bg-blue-600 text-white border-blue-700 font-black'
                                : 'bg-blue-500/90 text-white border-blue-600 text-[11px] font-bold'
                            }`}
                            style={{
                              backgroundColor: isStartSlot ? (member.color || '#2563eb') : undefined,
                            }}
                            title={`${aptForSlot.clientName} - ${aptForSlot.serviceName} (${aptForSlot.time} hs)`}
                          >
                            {isStartSlot ? (
                              <>
                                <span className="truncate leading-tight font-black">
                                  {aptForSlot.clientName}
                                </span>
                                <span className="truncate text-[10px] opacity-95 leading-tight font-semibold">
                                  {aptForSlot.serviceName}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] opacity-90 italic truncate font-bold">
                                (Ocupado)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-black text-blue-950 bg-blue-300/80 border-2 border-blue-500 shadow-2xs">
                            + Agendar
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {isStaffModalOpen && (
        <StaffModal
          initialBranchId={activeBranch}
          onClose={() => setIsStaffModalOpen(false)}
          onSaved={() => setIsStaffModalOpen(false)}
        />
      )}
    </div>
  );
}

export default AgendaStaffView;
