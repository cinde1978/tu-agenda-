import React, { useState } from 'react';
import {
  Users,
  Plus,
  Building2,
  Phone,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Search,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { StaffMember, BranchId, StaffBranchScope } from '../../types';
import { useApp } from '../../context/AppContext';
import { StaffModal } from './StaffModal';
import { cleanPhoneForWhatsApp } from '../../utils/formatters';

const DAYS_MAP: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  0: 'Dom',
};

export function StaffView() {
  const { staff, deleteStaff, updateStaff, appointments, selectedBranch } = useApp();

  const [activeBranchFilter, setActiveBranchFilter] = useState<'todas' | BranchId>(selectedBranch || 'todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffToEdit, setSelectedStaffToEdit] = useState<StaffMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialBranchForModal, setInitialBranchForModal] = useState<BranchId | 'ambas'>(
    activeBranchFilter === 'todas' ? 'sucursal_1' : activeBranchFilter
  );

  // Filter staff by branch and search
  const filteredStaff = staff.filter((s) => {
    // Branch filter
    if (activeBranchFilter !== 'todas') {
      const matchBranch = !s.branchId || s.branchId === 'ambas' || s.branchId === activeBranchFilter;
      if (!matchBranch) return false;
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchRole = s.role.toLowerCase().includes(q);
      const matchPhone = s.phone.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchPhone) return false;
    }
    return true;
  });

  // Counts
  const totalStaffCount = staff.length;
  const sucursal1Count = staff.filter((s) => !s.branchId || s.branchId === 'sucursal_1' || s.branchId === 'ambas').length;
  const sucursal2Count = staff.filter((s) => s.branchId === 'sucursal_2' || s.branchId === 'ambas').length;

  const handleOpenCreateModal = (branchToPreselect?: BranchId) => {
    setSelectedStaffToEdit(null);
    if (branchToPreselect) {
      setInitialBranchForModal(branchToPreselect);
    } else if (activeBranchFilter !== 'todas') {
      setInitialBranchForModal(activeBranchFilter);
    } else {
      setInitialBranchForModal('sucursal_1');
    }
    setIsModalOpen(true);
  };

  const handleEditStaff = (member: StaffMember) => {
    setSelectedStaffToEdit(member);
    setIsModalOpen(true);
  };

  const handleDeleteStaff = async (member: StaffMember) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${member.name}? Esta acción no se puede deshacer.`)) {
      await deleteStaff(member.id);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    await updateStaff({
      ...member,
      active: !member.active,
    });
  };

  const getBranchBadge = (branchScope?: StaffBranchScope) => {
    if (branchScope === 'sucursal_1') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border-2 border-blue-300">
          <Building2 className="w-3.5 h-3.5 text-blue-700" />
          <span>Sucursal 1</span>
        </span>
      );
    }
    if (branchScope === 'sucursal_2') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 border-2 border-purple-300">
          <Building2 className="w-3.5 h-3.5 text-purple-700" />
          <span>Sucursal 2</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border-2 border-emerald-300">
        <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
        <span>Ambas Sucursales</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#f1f5f9] rounded-2xl border-2 border-slate-300 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-700 border border-blue-300">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Equipo de Profesionales
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
            Administra tu personal y asigna profesionales de forma independiente para <strong>Sucursal 1</strong> y <strong>Sucursal 2</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreateModal('sucursal_1')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Agregar a Sucursal 1</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateModal('sucursal_2')}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Agregar a Sucursal 2</span>
          </button>
        </div>
      </div>

      {/* Branch Navigation & Search Bar */}
      <div className="bg-[#f1f5f9] rounded-2xl border-2 border-slate-300 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Branch Filter Tabs */}
        <div className="flex items-center bg-slate-200 p-1.5 rounded-xl border border-slate-300">
          <button
            type="button"
            onClick={() => setActiveBranchFilter('todas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeBranchFilter === 'todas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-800 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <span>Todas</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeBranchFilter === 'todas' ? 'bg-slate-700 text-white' : 'bg-slate-300 text-slate-800'
              }`}
            >
              {totalStaffCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBranchFilter('sucursal_1')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeBranchFilter === 'sucursal_1'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-800 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <span>Sucursal 1</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeBranchFilter === 'sucursal_1' ? 'bg-blue-800 text-white' : 'bg-slate-300 text-slate-800'
              }`}
            >
              {sucursal1Count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBranchFilter('sucursal_2')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeBranchFilter === 'sucursal_2'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-800 hover:bg-purple-600 hover:text-white'
            }`}
          >
            <span>Sucursal 2</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeBranchFilter === 'sucursal_2' ? 'bg-purple-800 text-white' : 'bg-slate-300 text-slate-800'
              }`}
            >
              {sucursal2Count}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por nombre o rol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:bg-white outline-none bg-slate-200 text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="bg-[#f1f5f9] rounded-2xl border-2 border-slate-300 p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-900">No se encontraron profesionales</h3>
          <p className="text-xs text-slate-600 font-semibold max-w-sm mx-auto mt-1 mb-4">
            {activeBranchFilter !== 'todas'
              ? `No hay profesionales registrados para ${activeBranchFilter === 'sucursal_1' ? 'Sucursal 1' : 'Sucursal 2'}.`
              : 'Agrega a tu primer profesional para comenzar a asignar turnos y horarios.'}
          </p>
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Crear Profesional</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member) => {
            const memberAppointments = appointments.filter((a) => a.staffId === member.id && a.status !== 'cancelado');
            const cleanPhone = member.phone ? cleanPhoneForWhatsApp(member.phone) : '';

            return (
              <div
                key={member.id}
                className="bg-[#f8fafc] rounded-2xl border-2 border-slate-300 p-5 shadow-xs hover:border-blue-600 hover:bg-blue-50/70 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Card Row: Avatar, Name, Status, Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-xs shrink-0 ring-2 ring-slate-300"
                        style={{ backgroundColor: member.color || '#2563eb' }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 text-sm leading-tight truncate group-hover:text-blue-900">
                          {member.name}
                        </h4>
                        <span className="text-xs text-slate-600 font-bold truncate block">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditStaff(member)}
                        className="p-1.5 bg-slate-200 hover:bg-blue-600 hover:text-white rounded-lg text-slate-800 transition-colors cursor-pointer"
                        title="Editar profesional"
                      >
                        <Edit2 className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(member)}
                        className="p-1.5 bg-slate-200 hover:bg-rose-600 hover:text-white rounded-lg text-slate-700 transition-colors cursor-pointer"
                        title="Eliminar profesional"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Sucursal Badge */}
                  <div className="mb-3.5 flex items-center gap-2 flex-wrap">
                    {getBranchBadge(member.branchId)}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(member)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black transition-colors cursor-pointer border-2 ${
                        member.active
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                      }`}
                      title="Cambiar estado"
                    >
                      {member.active ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                          <span>Activo</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-500 stroke-[3]" />
                          <span>Pausado</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Schedule & Days */}
                  <div className="space-y-2 text-xs border-t-2 border-slate-200 pt-3">
                    <div className="flex items-center justify-between text-slate-800 font-bold">
                      <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                        <Clock className="w-3.5 h-3.5 text-blue-700 stroke-[2.5]" />
                        <span>Horario:</span>
                      </span>
                      <span className="font-extrabold text-slate-900 bg-slate-200 px-2 py-0.5 rounded-md">
                        {member.workingHoursStart} a {member.workingHoursEnd} hs
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-800 font-bold">
                      <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-blue-700 stroke-[2.5]" />
                        <span>Días de atención:</span>
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                          const works = member.workingDays?.includes(d);
                          return (
                            <span
                              key={d}
                              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                                works
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-slate-200 text-slate-400'
                              }`}
                              title={DAYS_MAP[d]}
                            >
                              {DAYS_MAP[d].charAt(0)}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {member.blockedDates && member.blockedDates.length > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-amber-950 font-bold bg-amber-100 px-2.5 py-1 rounded-lg border-2 border-amber-300">
                        <span>{member.blockedDates.length} fecha(s) bloqueada(s)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: WhatsApp & Appointments */}
                <div className="mt-4 pt-3 border-t-2 border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-extrabold">
                    {memberAppointments.length} turnos programados
                  </span>
                  {cleanPhone ? (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-600 text-emerald-800 hover:text-white font-extrabold transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <span className="text-slate-500 font-medium text-[11px]">Sin teléfono</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Modal (Create / Edit) */}
      {isModalOpen && (
        <StaffModal
          staffToEdit={selectedStaffToEdit}
          initialBranchId={initialBranchForModal}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default StaffView;
