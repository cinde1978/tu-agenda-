import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { Resource, BranchId } from '../../types';
import { useApp } from '../../context/AppContext';
import { ResourceModal } from './ResourceModal';
import { getTodayDateString } from '../../utils/initialData';

export function ResourcesView() {
  const { resources, deleteResource, allAppointments } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<Resource | null>(null);
  const [filterBranch, setFilterBranch] = useState<'todas' | BranchId>('todas');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  const filteredResources = resources.filter((res) => {
    if (filterBranch === 'todas') return true;
    return res.branchId === 'ambas' || res.branchId === filterBranch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[#0F172A]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-200">
              <Layers className="w-6 h-6 stroke-[2.5]" />
            </span>
            <div>
              <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                Cabinas & Equipamiento
              </h2>
              <p className="text-xs text-slate-700 font-bold">
                Asignación de espacios y control automático de solapamientos
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setResourceToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 active:scale-98 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nueva Cabina / Equipo</span>
        </button>
      </div>

      {/* Branch Filter */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border-2 border-slate-300">
        <span className="text-xs font-black text-slate-700 ml-1">Filtrar por sucursal:</span>
        <button
          type="button"
          onClick={() => setFilterBranch('todas')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            filterBranch === 'todas'
              ? 'bg-[#1E3A8A] text-white'
              : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200'
          }`}
        >
          Todas ({resources.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterBranch('sucursal_1')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            filterBranch === 'sucursal_1'
              ? 'bg-[#1E3A8A] text-white'
              : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200'
          }`}
        >
          Soham Montevideo
        </button>
        <button
          type="button"
          onClick={() => setFilterBranch('sucursal_2')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            filterBranch === 'sucursal_2'
              ? 'bg-[#1E3A8A] text-white'
              : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200'
          }`}
        >
          Soham Rioja
        </button>
      </div>

      {/* Grid of Resources */}
      {filteredResources.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1E3A8A] border border-blue-200 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="font-black text-base text-[#0F172A]">
            No hay cabinas ni equipos cargados
          </h3>
          <p className="text-xs text-slate-600 font-semibold max-w-md mx-auto">
            Registrá las cabinas, boxes o equipos de aparatología de Soham Montevideo y Soham Rioja para controlar su disponibilidad al agendar turnos.
          </p>
          <button
            type="button"
            onClick={() => {
              setResourceToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nueva Cabina / Equipo</span>
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((res) => {
          // Today's appointments utilizing this resource across branches
          const todayAppointmentsForResource = allAppointments.filter(
            (a) => a.resourceId === res.id && a.date === todayStr && a.status !== 'cancelado'
          );
          const totalLinkedAppointments = allAppointments.filter(
            (a) => a.resourceId === res.id && a.status !== 'cancelado'
          ).length;

          return (
            <div
              key={res.id}
              className="bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                      {res.type === 'cabina' ? 'Cabina / Box' : res.type === 'equipo' ? 'Aparato / Equipo' : 'Espacio / Sillón'}
                    </span>
                    <h3 className="font-black text-base text-[#0F172A]">{res.name}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setResourceToEdit(res);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-[#0F172A] border border-slate-200 cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDeleteId((prev) => (prev === res.id ? null : res.id))
                      }
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-700 border border-rose-200 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {confirmDeleteId === res.id && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50 border-2 border-rose-300 space-y-2 text-xs text-[#0F172A]">
                    <p className="font-black text-rose-950">
                      ¿Eliminar "{res.name}"?
                    </p>
                    {totalLinkedAppointments > 0 && (
                      <p className="font-semibold text-rose-900 flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                        <span>
                          Hay <strong>{totalLinkedAppointments} turno(s)</strong> asignados a este recurso.
                        </span>
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#0F172A] border-2 border-slate-300 font-black cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteResource(res.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white border border-rose-800 font-black cursor-pointer"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold text-[#0F172A] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    {res.branchId === 'ambas'
                      ? 'Ambas Sucursales'
                      : res.branchId === 'sucursal_2'
                      ? 'Soham Rioja'
                      : 'Soham Montevideo'}
                  </span>

                  {res.active ? (
                    <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      Habilitada
                    </span>
                  ) : (
                    <span className="text-[11px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                      En mantenimiento
                    </span>
                  )}
                </div>

                {res.description && (
                  <p className="text-xs text-slate-600 font-medium mt-2">
                    {res.description}
                  </p>
                )}
              </div>

              {/* Today's occupation */}
              <div className="pt-3 border-t border-slate-200">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Ocupación Hoy ({todayAppointmentsForResource.length} turnos)
                </span>

                {todayAppointmentsForResource.length === 0 ? (
                  <span className="text-[11px] text-slate-500 font-semibold block italic">
                    Sin turnos asignados hoy
                  </span>
                ) : (
                  <div className="space-y-1">
                    {todayAppointmentsForResource.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        className="text-[11px] font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <span>{a.time} hs · {a.clientName}</span>
                        <span className="text-slate-600 font-semibold">{a.durationMinutes} min</span>
                      </div>
                    ))}
                    {todayAppointmentsForResource.length > 3 && (
                      <span className="text-[10px] text-slate-500 font-semibold block text-center">
                        +{todayAppointmentsForResource.length - 3} turnos más hoy
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {isModalOpen && (
        <ResourceModal
          resourceToEdit={resourceToEdit}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
