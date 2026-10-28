import React, { useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateSpanishLong } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';

export function ExportView() {
  const { appointments, business, exportAppointmentsToCSV } = useApp();
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [filterMode, setFilterMode] = useState<'dia' | 'todos'>('dia');

  const filteredAppointments = appointments.filter((apt) => {
    if (filterMode === 'dia') return apt.date === selectedDate;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

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
    exportAppointmentsToCSV(filterMode === 'dia' ? selectedDate : undefined);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Card - Hidden in print */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Imprimir y Descargar Agenda</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Genera hojas de papel listas para imprimir, guardar en PDF o descargar en Excel
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel (.CSV)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar en PDF</span>
          </button>
        </div>
      </div>

      {/* Filter controls - Hidden in print */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/80 p-3.5 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('dia')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
              filterMode === 'dia' ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs' : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
            }`}
          >
            Por Día Específico
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('todos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
              filterMode === 'todos' ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs' : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
            }`}
          >
            Todos los Turnos
          </button>
        </div>

        {filterMode === 'dia' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Fecha:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs p-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 outline-none"
            />
          </div>
        )}
      </div>

      {/* Printable Sheet View - Styled both on screen and on paper */}
      <div className="print-page bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase">
              Planilla Oficial de Turnos
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {business?.name || 'Tu Agenda Lista'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {business?.phone && `Tel: ${business.phone} · `}
              {business?.address && `Dirección: ${business.address}`}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-800 capitalize">
              {filterMode === 'dia' ? formatDateSpanishLong(selectedDate) : 'Listado General de Turnos'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Generado: {new Date().toLocaleDateString('es-AR')} a las {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
            </div>
          </div>
        </div>

        {/* Summary Numbers */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Total Turnos</span>
            <span className="text-base font-extrabold text-slate-900">
              {filteredAppointments.length} turnos
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Facturación Estimada</span>
            <span className="text-base font-extrabold text-blue-800">
              {formatCurrency(totalRevenue, business?.currency)}
            </span>
          </div>
          <div>
            <span className="text-slate-700 block font-bold">Saldos por Cobrar</span>
            <span className="text-base font-extrabold text-[#0F172A]">
              {formatCurrency(totalPending, business?.currency)}
            </span>
          </div>
        </div>

        {/* Appointments Table */}
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs italic">
            No hay turnos registrados para el período seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-300 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-2">Hora</th>
                  {filterMode === 'todos' && <th className="py-2.5 px-2">Fecha</th>}
                  <th className="py-2.5 px-2">Cliente</th>
                  <th className="py-2.5 px-2">Teléfono</th>
                  <th className="py-2.5 px-2">Servicio</th>
                  <th className="py-2.5 px-2">Profesional</th>
                  <th className="py-2.5 px-2 text-right">Precio</th>
                  <th className="py-2.5 px-2 text-right">Saldo</th>
                  <th className="py-2.5 px-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-2 font-bold text-slate-900 whitespace-nowrap">
                      {apt.time} hs
                    </td>
                    {filterMode === 'todos' && (
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                        {apt.date}
                      </td>
                    )}
                    <td className="py-2.5 px-2 font-semibold text-slate-800">
                      {apt.clientName}
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                      {apt.clientPhone || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-slate-700">
                      {apt.serviceName}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600">
                      {apt.staffName}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-slate-900 text-right whitespace-nowrap">
                      {formatCurrency(apt.price, business?.currency)}
                    </td>
                    <td className="py-2.5 px-2 font-black text-[#0F172A] text-right whitespace-nowrap">
                      {apt.remainingBalance > 0 ? formatCurrency(apt.remainingBalance, business?.currency) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap capitalize">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        apt.status === 'completado'
                          ? 'bg-sky-50 text-sky-800 border border-sky-200'
                          : apt.status === 'cancelado'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
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
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span>{business?.name || 'Tu Agenda Lista'} — Desarrollado por {business?.developerName || 'Iris Quiroz'}</span>
          <span>Firma responsable: _________________________</span>
        </div>
      </div>
    </div>
  );
}
