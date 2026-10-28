import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Wallet,
  CreditCard,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateSpanishLong } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';
import { CashMovementModal } from './CashMovementModal';

export function CashView() {
  const { cashMovements, appointments, business, deleteCashMovement, selectedBranch } = useApp();
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [activeTab, setActiveTab] = useState<'todos' | 'ingresos' | 'gastos'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dayMovements = cashMovements.filter((m) => m.date === selectedDate);
  const filteredMovements = dayMovements.filter((m) => {
    if (activeTab === 'todos') return true;
    if (activeTab === 'ingresos') return m.type === 'ingreso';
    return m.type === 'gasto';
  });

  const totalIncome = dayMovements
    .filter((m) => m.type === 'ingreso')
    .reduce((sum, m) => sum + (m.amount || 0), 0);

  const totalExpenses = dayMovements
    .filter((m) => m.type === 'gasto')
    .reduce((sum, m) => sum + (m.amount || 0), 0);

  const netBalance = totalIncome - totalExpenses;

  const dayAppointments = appointments.filter((a) => a.date === selectedDate && a.status !== 'cancelado');
  const pendingBalances = dayAppointments.reduce((sum, a) => sum + (a.remainingBalance || 0), 0);

  const incomeByMethod: Record<string, number> = {
    efectivo: 0,
    transferencia: 0,
    mercadopago: 0,
    tarjeta: 0,
  };
  dayMovements
    .filter((m) => m.type === 'ingreso')
    .forEach((m) => {
      const method = m.paymentMethod || 'efectivo';
      incomeByMethod[method] = (incomeByMethod[method] || 0) + (m.amount || 0);
    });

  const handleShiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${nextY}-${nextM}-${nextD}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este movimiento de la caja diaria?')) {
      await deleteCashMovement(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Date Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Caja Diaria & Finanzas</h2>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1E3A8A] border-2 border-blue-200 shadow-2xs">
              {selectedBranch === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'}
            </span>
          </div>
          <p className="text-xs text-slate-700 font-semibold mt-0.5">
            Arqueo diario y movimientos filtrados automáticamente para {selectedBranch === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'}
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-gray-100/90 rounded-xl p-1 border border-gray-200/60">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 hover:bg-white rounded-lg text-gray-600 transition-colors"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateString())}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-colors cursor-pointer ${
                selectedDate === getTodayDateString() ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#0F172A] hover:bg-white'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-1.5 hover:bg-white rounded-lg text-gray-600 transition-colors"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-gray-800 outline-none focus:border-purple-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-[#172554] active:bg-[#0F172A] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md border-2 border-[#1E3A8A] transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-white" />
            <span className="text-white font-black">Registrar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Date badge */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
        <span className="font-semibold capitalize">
          Mostrando arqueo de caja para: {formatDateSpanishLong(selectedDate)}
        </span>
        <span>{dayMovements.length} movimientos registrados</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">
              Ingresos del Día
            </span>
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(totalIncome, business?.currency)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Cobros de turnos + señas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Total Gastos */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block mb-1">
              Gastos del Día
            </span>
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(totalExpenses, business?.currency)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Insumos y servicios
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Balance Neto */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-1">
              Balance Neto
            </span>
            <div className={`text-3xl font-extrabold tracking-tight ${netBalance >= 0 ? 'text-purple-900' : 'text-rose-600'}`}>
              {formatCurrency(netBalance, business?.currency)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Ingresos menos gastos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Saldos pendientes por cobrar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1">
              Saldos por Cobrar
            </span>
            <div className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {formatCurrency(pendingBalances, business?.currency)}
            </div>
            <span className="text-[11px] text-slate-600 font-semibold mt-1 block">
              De turnos de este día
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-[#0F172A] border border-slate-300 flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-6 h-6 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Payment methods breakdown bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-purple-600" />
          Desglose de Ingresos por Medio de Pago
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] text-gray-500 block font-medium">Efectivo</span>
            <span className="font-extrabold text-gray-900 text-sm">
              {formatCurrency(incomeByMethod.efectivo || 0, business?.currency)}
            </span>
          </div>
          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] text-gray-500 block font-medium">Transferencia</span>
            <span className="font-extrabold text-gray-900 text-sm">
              {formatCurrency(incomeByMethod.transferencia || 0, business?.currency)}
            </span>
          </div>
          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] text-gray-500 block font-medium">Mercado Pago</span>
            <span className="font-extrabold text-gray-900 text-sm">
              {formatCurrency(incomeByMethod.mercadopago || 0, business?.currency)}
            </span>
          </div>
          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] text-gray-500 block font-medium">Tarjeta</span>
            <span className="font-extrabold text-gray-900 text-sm">
              {formatCurrency(incomeByMethod.tarjeta || 0, business?.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Movements Table / List */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Tab Filters */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('todos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                activeTab === 'todos' ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs' : 'bg-slate-100 text-[#0F172A] border-slate-300 hover:bg-white hover:border-slate-400'
              }`}
            >
              Todos ({dayMovements.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ingresos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                activeTab === 'ingresos' ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs' : 'bg-slate-100 text-[#0F172A] border-slate-300 hover:bg-white hover:border-slate-400'
              }`}
            >
              Ingresos ({dayMovements.filter((m) => m.type === 'ingreso').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gastos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                activeTab === 'gastos' ? 'bg-rose-700 text-white border-rose-700 shadow-xs' : 'bg-slate-100 text-[#0F172A] border-slate-300 hover:bg-white hover:border-slate-400'
              }`}
            >
              Gastos ({dayMovements.filter((m) => m.type === 'gasto').length})
            </button>
          </div>
        </div>

        {/* Content */}
        {filteredMovements.length === 0 ? (
          <div className="text-center py-12 p-6 text-gray-400 text-xs">
            No hay movimientos registrados para este día. Utiliza el botón "Registrar Movimiento" para asentar un cobro o gasto.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredMovements.map((mov) => (
              <div key={mov.id} className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      mov.type === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {mov.type === 'ingreso' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-800">{mov.description}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                        {mov.category}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 capitalize">
                      Medio: {mov.paymentMethod || 'Efectivo'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`font-extrabold text-base ${
                      mov.type === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {mov.type === 'ingreso' ? '+' : '-'} {formatCurrency(mov.amount, business?.currency)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDelete(mov.id)}
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-300 hover:text-rose-600 transition-colors"
                    title="Eliminar movimiento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <CashMovementModal
          initialDate={selectedDate}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
