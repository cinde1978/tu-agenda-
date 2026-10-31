import React, { useState } from 'react';
import {
  Plus,
  User,
  Phone,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  ShieldAlert,
  Building2,
  Search,
  MessageCircle,
  Percent,
  LayoutGrid,
  CalendarRange,
  Coffee,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { StaffMember, BranchId, StaffBranchScope } from '../../types';
import { useApp } from '../../context/AppContext';
import { StaffModal } from './StaffModal';
import { cleanPhoneForWhatsApp } from '../../utils/formatters';
import { DAY_LABELS, BRANCH_NAMES, getStaffDaySchedule } from '../../utils/staffSchedule';

export function StaffView() {
  const { staff, deleteStaff, appointments } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [activeBranchFilter, setActiveBranchFilter] = useState<'todas' | BranchId>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'semanal' | 'fichas'>('semanal');
  const [initialDayToEdit, setInitialDayToEdit] = useState<number>(1);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${name} del equipo?`)) {
      await deleteStaff(id);
    }
  };

  // Helper to determine if a staff member works in a given branch
  const staffWorksInBranch = (member: StaffMember, bId: BranchId) => {
    if (member.daySchedules && member.daySchedules.length > 0) {
      return member.daySchedules.some((day) => {
        if (!day.active) return false;
        if (day.branchShifts?.[bId]?.active) return true;
        if (day.branchId === bId || day.branchId === 'ambas') return true;
        return false;
      });
    }
    if (!member.branchId || member.branchId === 'ambas' || member.branchId === bId) {
      return true;
    }
    return false;
  };

  // Filter staff by branch and search term
  const filteredStaff = staff.filter((member) => {
    if (activeBranchFilter !== 'todas') {
      if (!staffWorksInBranch(member, activeBranchFilter)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = member.name.toLowerCase().includes(q);
      const matchRole = member.role.toLowerCase().includes(q);
      const matchPhone = member.phone?.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchPhone) return false;
    }
    return true;
  });

  const getBranchBadge = (member: StaffMember) => {
    const inMontevideo = staffWorksInBranch(member, 'sucursal_1');
    const inRioja = staffWorksInBranch(member, 'sucursal_2');

    if (inMontevideo && inRioja) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-indigo-50 text-indigo-900 border border-indigo-200 inline-flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-indigo-700" />
          <span>Ambas sucursales (Montevideo / Rioja)</span>
        </span>
      );
    }
    if (inMontevideo) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-blue-50 text-[#1E3A8A] border border-blue-200 inline-flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
          <span>Soham Montevideo</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-purple-50 text-purple-900 border border-purple-200 inline-flex items-center gap-1">
        <Building2 className="w-3.5 h-3.5 text-purple-700" />
        <span>Soham Rioja</span>
      </span>
    );
  };

  const countMontevideo = staff.filter((s) => staffWorksInBranch(s, 'sucursal_1')).length;
  const countRioja = staff.filter((s) => staffWorksInBranch(s, 'sucursal_2')).length;

  return (
    <div className="space-y-5 text-[#0F172A]">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Equipo de Profesionales</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-[#1E3A8A]">
              {staff.length} {staff.length === 1 ? 'profesional' : 'profesionales'}
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Configuración independiente de días, horarios y descansos por sucursal (Soham Montevideo & Soham Rioja)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStaffToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 active:scale-98 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nuevo Profesional</span>
          </button>
        </div>
      </div>

      {/* Filter and View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher: Weekly Matrix vs Cards */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              type="button"
              onClick={() => setViewMode('semanal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'semanal'
                  ? 'bg-[#1E3A8A] text-white shadow-xs'
                  : 'text-slate-700 hover:text-black'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Vista Semanal de Horarios</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('fichas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'fichas'
                  ? 'bg-[#1E3A8A] text-white shadow-xs'
                  : 'text-slate-700 hover:text-black'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Fichas de Profesionales</span>
            </button>
          </div>

          {/* Branch Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              type="button"
              onClick={() => setActiveBranchFilter('todas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeBranchFilter === 'todas'
                  ? 'bg-white text-[#1E3A8A] shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({staff.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveBranchFilter('sucursal_1')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeBranchFilter === 'sucursal_1'
                  ? 'bg-white text-[#1E3A8A] shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Montevideo ({countMontevideo})
            </button>
            <button
              type="button"
              onClick={() => setActiveBranchFilter('sucursal_2')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeBranchFilter === 'sucursal_2'
                  ? 'bg-white text-[#1E3A8A] shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rioja ({countRioja})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o rol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E3A8A] font-bold"
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* VISTA 1: VISTA SEMANAL DE HORARIOS DEL STAFF (MANDATORIA)    */}
      {/* ============================================================ */}
      {viewMode === 'semanal' && (
        <div className="space-y-4">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8">
              <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-black text-[#0F172A] text-base">No hay profesionales que coincidan</h3>
              <p className="text-xs text-slate-600 mt-1">Intenta con otro término de búsqueda o cambia el filtro de sucursal.</p>
            </div>
          ) : (
            filteredStaff.map((member) => {
              const cleanPhone = member.phone ? cleanPhoneForWhatsApp(member.phone) : '';

              return (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all space-y-4"
                >
                  {/* Staff Row Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl text-white flex items-center justify-center font-black text-base shadow-xs shrink-0"
                        style={{ backgroundColor: member.color || '#1E3A8A' }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-base text-[#0F172A] leading-tight">
                            {member.name}
                          </h4>
                          {getBranchBadge(member)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600 font-bold mt-0.5 flex-wrap">
                          <span className="text-[#1E3A8A]">{member.role}</span>
                          {member.phone && (
                            <span className="flex items-center gap-1 text-slate-500 font-medium">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{member.phone}</span>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:text-emerald-900 ml-0.5 font-bold"
                                  title="Enviar WhatsApp"
                                >
                                  (WhatsApp)
                                </a>
                              )}
                            </span>
                          )}
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">
                            Comisión: {member.commissionPercentage ?? 40}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setStaffToEdit(member);
                          setInitialDayToEdit(1);
                          setIsModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                        title="Modificar horarios y sucursales"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar Horarios</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(member.id, member.name)}
                        className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Eliminar profesional"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 7-Day Weekly Schedule Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {[1, 2, 3, 4, 5, 6, 0].map((dNum) => {
                      const dayLabel = DAY_LABELS.find((l) => l.day === dNum);
                      const schedule = getStaffDaySchedule(member, dNum);
                      const s1 = schedule.branchShifts?.sucursal_1;
                      const s2 = schedule.branchShifts?.sucursal_2;
                      const s1Active = Boolean(s1?.active);
                      const s2Active = Boolean(s2?.active);
                      const isDayWorking = schedule.active && (s1Active || s2Active);

                      return (
                        <div
                          key={dNum}
                          onClick={() => {
                            setStaffToEdit(member);
                            setInitialDayToEdit(dNum);
                            setIsModalOpen(true);
                          }}
                          className={`p-3 rounded-xl border-2 flex flex-col justify-between transition-all cursor-pointer hover:border-[#1E3A8A] hover:shadow-xs group/day ${
                            isDayWorking
                              ? 'bg-white border-slate-300 shadow-2xs hover:bg-blue-50/20'
                              : 'bg-slate-50 border-dashed border-slate-200 opacity-70 hover:opacity-100 hover:bg-slate-100'
                          }`}
                          title={`Click para editar horarios de ${dayLabel?.name}`}
                        >
                          {/* Day Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                            <span className="text-xs font-black text-[#0F172A] group-hover/day:text-[#1E3A8A] transition-colors">
                              {dayLabel?.name}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                isDayWorking
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isDayWorking ? 'Atiende' : 'No trabaja'}
                            </span>
                          </div>

                          {/* Day Content */}
                          {!isDayWorking ? (
                            <div className="py-3 text-center">
                              <span className="text-xs font-black text-slate-400 block">
                                No trabaja
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Franco semanal
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2 text-xs">
                              {/* Montevideo Shift */}
                              {s1Active && (
                                <div className="p-2 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-950 space-y-0.5">
                                  <span className="text-[10px] uppercase font-black text-[#1E3A8A] block">
                                    Montevideo
                                  </span>
                                  <span className="font-black text-xs block">
                                    {s1?.start} - {s1?.end} hs
                                  </span>
                                  {s1?.breaks && s1.breaks.length > 0 && (
                                    <div className="text-[10px] text-blue-800 font-semibold flex items-center gap-1 pt-0.5">
                                      <Coffee className="w-3 h-3 text-amber-700" />
                                      <span>
                                        Pausa: {s1.breaks.map((b) => `${b.start}-${b.end}`).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Rioja Shift */}
                              {s2Active && (
                                <div className="p-2 rounded-lg bg-purple-50/80 border border-purple-200 text-purple-950 space-y-0.5">
                                  <span className="text-[10px] uppercase font-black text-purple-900 block">
                                    Rioja
                                  </span>
                                  <span className="font-black text-xs block">
                                    {s2?.start} - {s2?.end} hs
                                  </span>
                                  {s2?.breaks && s2.breaks.length > 0 && (
                                    <div className="text-[10px] text-purple-800 font-semibold flex items-center gap-1 pt-0.5">
                                      <Coffee className="w-3 h-3 text-amber-700" />
                                      <span>
                                        Pausa: {s2.breaks.map((b) => `${b.start}-${b.end}`).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 2: FICHAS DE PROFESIONALES (CARDS VIEW)                */}
      {/* ============================================================ */}
      {viewMode === 'fichas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((member) => {
            const cleanPhone = member.phone ? cleanPhoneForWhatsApp(member.phone) : '';

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Header: Avatar, Name, Role and Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-lg shadow-xs"
                        style={{ backgroundColor: member.color || '#1E3A8A' }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-[#0F172A] text-base">{member.name}</h4>
                        <p className="text-xs text-[#1E3A8A] font-bold">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setStaffToEdit(member);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#1E3A8A] transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(member.id, member.name)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Branch Badge & Phone */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    {getBranchBadge(member)}
                    {member.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{member.phone}</span>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:text-emerald-900"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Schedule Breakdown */}
                  <div className="space-y-2 py-3 border-t border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 font-bold">
                        <Percent className="w-3.5 h-3.5 text-[#1E3A8A]" />
                        Comisión por turno:
                      </span>
                      <span className="font-black text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {member.commissionPercentage ?? 40}%
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="text-[11px] font-black text-slate-700 block mb-1.5">
                        Días y sucursales asignadas:
                      </span>
                      <div className="space-y-1">
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                          const dayLabel = DAY_LABELS.find((l) => l.day === d);
                          const sched = getStaffDaySchedule(member, d);
                          const s1 = sched.branchShifts?.sucursal_1;
                          const s2 = sched.branchShifts?.sucursal_2;
                          const s1Active = Boolean(s1?.active);
                          const s2Active = Boolean(s2?.active);

                          if (!sched.active || (!s1Active && !s2Active)) {
                            return null;
                          }

                          return (
                            <div
                              key={d}
                              onClick={() => {
                                setStaffToEdit(member);
                                setInitialDayToEdit(d);
                                setIsModalOpen(true);
                              }}
                              className="flex items-center justify-between text-[11px] bg-slate-50 hover:bg-blue-50/60 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-[#1E3A8A] cursor-pointer transition-all group/row"
                              title={`Click para editar horarios del ${dayLabel?.name}`}
                            >
                              <span className="font-black text-slate-800 group-hover/row:text-[#1E3A8A]">{dayLabel?.name}:</span>
                              <div className="flex items-center gap-1.5 font-bold">
                                {s1Active && (
                                  <span className="text-[#1E3A8A] bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                                    Montevideo ({s1?.start}-{s1?.end})
                                  </span>
                                )}
                                {s2Active && (
                                  <span className="text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                                    Rioja ({s2?.start}-{s2?.end})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Action */}
                <div className="pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setStaffToEdit(member);
                      setInitialDayToEdit(1);
                      setIsModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Ficha y Horarios</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Modal */}
      {isModalOpen && (
        <StaffModal
          staffToEdit={staffToEdit}
          initialDay={initialDayToEdit}
          initialBranchId={activeBranchFilter !== 'todas' ? activeBranchFilter : 'sucursal_1'}
          onClose={() => {
            setIsModalOpen(false);
            setStaffToEdit(null);
          }}
          onSaved={() => {
            setIsModalOpen(false);
            setStaffToEdit(null);
          }}
        />
      )}
    </div>
  );
}
