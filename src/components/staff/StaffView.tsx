import React, { useState } from 'react';
import { Plus, User, Phone, Clock, Calendar, Edit2, Trash2, ShieldAlert, Building2, Search, MessageCircle } from 'lucide-react';
import { StaffMember, BranchId, StaffBranchScope } from '../../types';
import { useApp } from '../../context/AppContext';
import { StaffModal } from './StaffModal';
import { cleanPhoneForWhatsApp } from '../../utils/formatters';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function StaffView() {
  const { staff, deleteStaff, appointments } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [activeBranchFilter, setActiveBranchFilter] = useState<'todas' | BranchId>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${name} del equipo?`)) {
      await deleteStaff(id);
    }
  };

  // Helper to determine if a staff member works in a given branch
  const staffWorksInBranch = (member: StaffMember, bId: BranchId) => {
    if (!member.branchId || member.branchId === 'ambas' || member.branchId === bId) {
      return true;
    }
    if (member.daySchedules && member.daySchedules.length > 0) {
      return member.daySchedules.some((day) => {
        if (!day.active) return false;
        if (day.branchShifts?.[bId]?.active) return true;
        if (day.branchId === bId || day.branchId === 'ambas') return true;
        return false;
      });
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
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
          <Building2 className="w-3 h-3 text-emerald-700" />
          <span>Ambas sucursales (Montevideo / Rioja)</span>
        </span>
      );
    }
    if (inMontevideo) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
          <Building2 className="w-3 h-3 text-blue-700" />
          <span>Soham Montevideo</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300 inline-flex items-center gap-1">
        <Building2 className="w-3 h-3 text-purple-700" />
        <span>Soham Rioja</span>
      </span>
    );
  };

  const countMontevideo = staff.filter((s) => staffWorksInBranch(s, 'sucursal_1')).length;
  const countRioja = staff.filter((s) => staffWorksInBranch(s, 'sucursal_2')).length;

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Equipo de Profesionales</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configuración de especialistas, sucursales (Soham Montevideo / Rioja), horarios y días laborales
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStaffToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Profesional</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Branch Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-300">
          <button
            type="button"
            onClick={() => setActiveBranchFilter('todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-2 ${
              activeBranchFilter === 'todas'
                ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
            }`}
          >
            Todas ({staff.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveBranchFilter('sucursal_1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-2 ${
              activeBranchFilter === 'sucursal_1'
                ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
            }`}
          >
            Soham Montevideo ({countMontevideo})
          </button>
          <button
            type="button"
            onClick={() => setActiveBranchFilter('sucursal_2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-2 ${
              activeBranchFilter === 'sucursal_2'
                ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
            }`}
          >
            Soham Rioja ({countRioja})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar profesional..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStaff.map((member) => {
          // Count active appointments for this staff
          const memberAppointments = appointments.filter((a) => a.staffId === member.id && a.status !== 'cancelado');
          const cleanPhone = member.phone ? cleanPhoneForWhatsApp(member.phone) : '';

          return (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: Avatar, Name, Role and Actions */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-bold text-lg shadow-sm"
                      style={{ backgroundColor: member.color || '#2563eb' }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{member.name}</h4>
                      <p className="text-xs text-blue-600 font-medium">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStaffToEdit(member);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(member.id, member.name)}
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Branch Badge & Phone */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getBranchBadge(member)}
                  {member.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{member.phone}</span>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Schedule and working days */}
                <div className="space-y-2 py-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Horario habitual:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {member.workingHoursStart} - {member.workingHoursEnd} hs
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Días laborales:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                        const isWorking = member.workingDays.includes(d);
                        return (
                          <span
                            key={d}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isWorking
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-400 opacity-60'
                            }`}
                          >
                            {DAY_NAMES[d]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {member.blockedDates && member.blockedDates.length > 0 && (
                    <div className="pt-1.5">
                      <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mb-1">
                        <ShieldAlert className="w-3 h-3" />
                        {member.blockedDates.length} fecha(s) bloqueadas
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {member.blockedDates.slice(0, 3).map((d) => (
                          <span
                            key={d}
                            className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px]"
                          >
                            {d}
                          </span>
                        ))}
                        {member.blockedDates.length > 3 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{member.blockedDates.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom stats & status */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${member.active !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${member.active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {member.active !== false ? 'Activo' : 'Inactivo'}
                </span>
                <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {memberAppointments.length} turnos
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-600">No se encontraron profesionales con los filtros seleccionados.</p>
        </div>
      )}

      {isModalOpen && (
        <StaffModal
          staffToEdit={staffToEdit}
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
