import React, { useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';
import { StaffBranchScope } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateSpanishLong } from '../../utils/formatters';
import { getTodayDateString, getBranchBusinessConfig } from '../../utils/initialData';
import { SCOPE_NAMES } from '../../utils/staffSchedule';

export function ExportView() {
  const {
    allAppointments,
    selectedBranch,
    setSelectedBranch,
    business,
    exportAppointmentsToCSV,
  } = useApp();
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [filterMode, setFilterMode] = useState<'dia' | 'todos'>('dia');

  const filteredAppointments = allAppointments
    .filter((apt) => {
      const aptBranch = apt.branchId || 'sucursal_1';
      if (selectedBranch !== 'ambas' && aptBranch !== selectedBranch) return false;
      if (filterMode === 'dia') return apt.date === selectedDate;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const totalRevenue = filteredAppointments
    .filter((a) => a.status !== 'cancelado')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  const totalPending = filteredAppointments
    .filter((a) => a.status !== 'cancelado')
    .reduce((sum, a) => sum + (a.remainingBalance || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    exportAppointmentsToCSV(
      filterMode === 'dia' ? selectedDate : undefined,
      selectedBranch
    );
  };

  const singleBranchCfg =
    selectedBranch !== 'ambas'
      ? getBranchBusinessConfig(business, selectedBranch)
      : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Card - Hidden in print */}
      <div className="no-print bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-[#0F172A]">
              Imprimir y Descargar Agenda
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#1E3A8A] border border-blue-200">
              {SCOPE_NAMES[selectedBranch]}
            </span>
          </div>
          <p className="text-xs text-slate-600 font-semibold mt-0.5">
            Generá planillas listas para imprimir, guardar en PDF o descargar en Excel (.CSV) respetando sucursal y período
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel (.CSV)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar en PDF</span>
          </button>
        </div>
      </div>

      {/* Filter controls - Hidden in print */}
      <div className="no-print bg-white p-4 rounded-2xl border-2 border-slate-300 space-y-3">
        {/* Branch Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <span className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#1E3A8A]" />
            <span>Sucursal a imprimir / exportar:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['sucursal_1', 'sucursal_2', 'ambas'] as StaffBranchScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setSelectedBranch(scope)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                  selectedBranch === scope
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                    : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
                }`}
              >
                {SCOPE_NAMES[scope]}
              </button>
            ))}
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterMode('dia')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                filterMode === 'dia'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
              }`}
            >
              Por Día Específico
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('todos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                filterMode === 'todos'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
              }`}
            >
              Todos los Turnos
            </button>
          </div>

          {filterMode === 'dia' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#0F172A] font-black">Fecha:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="text-xs p-2 rounded-lg border-2 border-slate-300 bg-white font-black text-[#0F172A] outline-none focus:border-[#1E3A8A]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Printable Sheet View - Styled both on screen and on paper */}
      <div className="print-page bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 text-[#0F172A]">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-5 gap-4">
          <div>
            <span className="text-[10px] font-black tracking-widest text-[#1E3A8A] uppercase">
              Planilla Oficial de Turnos — {SCOPE_NAMES[selectedBranch]}
            </span>
            <h1 className="text-2xl font-extrabold text-[#0F172A] mt-0.5">
              {business?.name || 'Tu Agenda Lista'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {singleBranchCfg ? (
                <>
                  {singleBranchCfg.name} — {singleBranchCfg.address}
                  {singleBranchCfg.phone ? ` · Tel: ${singleBranchCfg.phone}` : ''}
                </>
              ) : (
                <>Soham Montevideo (Montevideo 397) & Soham Rioja (Rioja 2954)</>
              )}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-black text-[#0F172A] capitalize">
              {filterMode === 'dia' ? formatDateSpanishLong(selectedDate) : 'Listado General de Turnos'}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Generado: {new Date().toLocaleDateString('es-AR')} a las{' '}
              {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
            </div>
          </div>
        </div>

        {/* Summary Numbers */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-600 block font-bold">Total Turnos</span>
            <span className="text-base font-extrabold text-[#0F172A]">
              {filteredAppointments.length} turnos
            </span>
          </div>
          <div>
            <span className="text-slate-600 block font-bold">Facturación Estimada</span>
            <span className="text-base font-extrabold text-[#1E3A8A]">
              {formatCurrency(totalRevenue, business?.currency)}
            </span>
          </div>
          <div>
            <span className="text-slate-600 block font-bold">Saldos por Cobrar</span>
            <span className="text-base font-extrabold text-[#0F172A]">
              {formatCurrency(totalPending, business?.currency)}
            </span>
          </div>
        </div>

        {/* Appointments Table */}
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-semibold">
            No hay turnos registrados para la sucursal y período seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-300 text-[#0F172A] font-black uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-2">Hora</th>
                  {filterMode === 'todos' && <th className="py-2.5 px-2">Fecha</th>}
                  <th className="py-2.5 px-2">Sucursal</th>
                  <th className="py-2.5 px-2">Cliente</th>
                  <th className="py-2.5 px-2">Teléfono</th>
                  <th className="py-2.5 px-2">Servicio</th>
                  <th className="py-2.5 px-2">Profesional</th>
                  <th className="py-2.5 px-2 text-right">Precio</th>
                  <th className="py-2.5 px-2 text-right">Saldo</th>
                  <th className="py-2.5 px-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-2 font-black text-[#0F172A] whitespace-nowrap">
                      {apt.time} hs
                    </td>
                    {filterMode === 'todos' && (
                      <td className="py-2.5 px-2 text-slate-700 font-semibold whitespace-nowrap">
                        {apt.date}
                      </td>
                    )}
                    <td className="py-2.5 px-2 text-[#1E3A8A] font-bold whitespace-nowrap">
                      {apt.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-[#0F172A]">
                      {apt.clientName}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 font-medium whitespace-nowrap">
                      {apt.clientPhone || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-[#0F172A] font-semibold">
                      {apt.serviceName}
                    </td>
                    <td className="py-2.5 px-2 text-slate-700 font-semibold">
                      {apt.staffName}
                    </td>
                    <td className="py-2.5 px-2 font-black text-[#0F172A] text-right whitespace-nowrap">
                      {formatCurrency(apt.price, business?.currency)}
                    </td>
                    <td className="py-2.5 px-2 font-black text-[#0F172A] text-right whitespace-nowrap">
                      {apt.remainingBalance > 0
                        ? formatCurrency(apt.remainingBalance, business?.currency)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap capitalize">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border ${
                          apt.status === 'completado'
                            ? 'bg-sky-50 text-sky-900 border-sky-200'
                            : apt.status === 'cancelado'
                            ? 'bg-rose-50 text-rose-900 border-rose-200'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer in print */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
          <span>
            {business?.name || 'Tu Agenda Lista'} — Desarrollado por{' '}
            {business?.developerName || 'Iris Quiroz'}
          </span>
          <span>Firma responsable: _________________________</span>
        </div>
      </div>
    </div>
  );
}
