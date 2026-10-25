import React, { useState, useMemo } from 'react';
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
  Clock,
  Building2,
  CheckCircle2,
  Download,
  Receipt,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateSpanishLong } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';
import { CashMovementModal } from './CashMovementModal';
import { BranchId, CashMovement, CashMovementType } from '../../types';

export function CashView() {
  const {
    allCashMovements,
    appointments,
    business,
    deleteCashMovement,
    selectedBranch,
    setSelectedBranch,
  } = useApp();

  // Date and branch states
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [viewScope, setViewScope] = useState<'dia' | 'todos'>('dia');
  const [activeTab, setActiveTab] = useState<'todos' | 'ingresos' | 'gastos'>('todos');
  const [branchFilter, setBranchFilter] = useState<'todas' | BranchId>(selectedBranch);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<CashMovementType>('ingreso');

  const openMovementModal = (type: CashMovementType = 'ingreso') => {
    setModalInitialType(type);
    setIsModalOpen(true);
  };

  // 1. Filter movements by selected branch (all or specific)
  const branchMovements = useMemo(() => {
    if (branchFilter === 'todas') return allCashMovements;
    return allCashMovements.filter((m) => (m.branchId || 'sucursal_1') === branchFilter);
  }, [allCashMovements, branchFilter]);

  // 2. Filter movements by date scope
  const scopedMovements = useMemo(() => {
    if (viewScope === 'todos') return branchMovements;
    return branchMovements.filter((m) => m.date === selectedDate);
  }, [branchMovements, viewScope, selectedDate]);

  // 3. Tab filter: todos / ingresos / gastos
  const filteredMovements = useMemo(() => {
    if (activeTab === 'todos') return scopedMovements;
    if (activeTab === 'ingresos') return scopedMovements.filter((m) => m.type === 'ingreso');
    return scopedMovements.filter((m) => m.type === 'gasto');
  }, [scopedMovements, activeTab]);

  // Totals calculations
  const totalIncome = useMemo(() => {
    return scopedMovements
      .filter((m) => m.type === 'ingreso')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
  }, [scopedMovements]);

  const totalExpenses = useMemo(() => {
    return scopedMovements
      .filter((m) => m.type === 'gasto')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
  }, [scopedMovements]);

  const netBalance = totalIncome - totalExpenses;

  // Pending appointment balances
  const relevantAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const branchMatches = branchFilter === 'todas' || (a.branchId || 'sucursal_1') === branchFilter;
      const dateMatches = viewScope === 'todos' || a.date === selectedDate;
      return branchMatches && dateMatches && a.status !== 'cancelado';
    });
  }, [appointments, branchFilter, viewScope, selectedDate]);

  const pendingBalances = useMemo(() => {
    return relevantAppointments.reduce((sum, a) => sum + (a.remainingBalance || 0), 0);
  }, [relevantAppointments]);

  // Payment methods breakdown
  const incomeByMethod = useMemo(() => {
    const breakdown: Record<string, number> = {
      efectivo: 0,
      transferencia: 0,
      mercadopago: 0,
      tarjeta: 0,
      otro: 0,
    };
    scopedMovements
      .filter((m) => m.type === 'ingreso')
      .forEach((m) => {
        const method = m.paymentMethod || 'efectivo';
        breakdown[method] = (breakdown[method] || 0) + (m.amount || 0);
      });
    return breakdown;
  }, [scopedMovements]);

  // Date navigation handlers
  const handleShiftDate = (days: number) => {
    setViewScope('dia');
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${nextY}-${nextM}-${nextD}`);
  };

  const handleSetToday = () => {
    const today = getTodayDateString();
    setSelectedDate(today);
    setViewScope('dia');
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este movimiento de la caja diaria?')) {
      await deleteCashMovement(id);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Tipo', 'Detalle', 'Categoría', 'Importe', 'Medio de Pago', 'Sucursal', 'Estado'];
    const rows = filteredMovements.map((m) => [
      m.id,
      m.date,
      m.type === 'ingreso' ? 'Ingreso' : 'Gasto',
      `"${(m.description || '').replace(/"/g, '""')}"`,
      m.category || 'General',
      m.type === 'ingreso' ? m.amount : -m.amount,
      m.paymentMethod || 'Efectivo',
      m.branchId === 'sucursal_2' ? 'Sucursal 2' : 'Sucursal 1',
      'Completado',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Caja_Diaria_${selectedDate}_${branchFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isTodayActive = viewScope === 'dia' && selectedDate === getTodayDateString();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ============================================================== */}
      {/* 1. CONTENEDOR SUPERIOR: HEADER, ACCIONES, FILTROS Y TARJETAS */}
      {/* ============================================================== */}
      <div className="bg-[#f1f5f9] p-5 sm:p-6 rounded-2xl border-2 border-slate-300 shadow-sm space-y-6">
        {/* Fila 1: Título y Botón Principal + REGISTRAR MOVIMIENTO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Caja Diaria & Finanzas
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-300">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                {branchFilter === 'todas'
                  ? 'Todas las Sucursales'
                  : branchFilter === 'sucursal_2'
                  ? 'Sucursal 2'
                  : 'Sucursal 1'}
              </span>
            </div>
            <p className="text-xs text-slate-700 font-bold mt-1">
              Control de ingresos, gastos, medios de cobro y arqueo diario sincronizado en tiempo real.
            </p>
          </div>

          {/* Botón Destacado + REGISTRAR MOVIMIENTO */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => openMovementModal('ingreso')}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              title="Registrar un nuevo movimiento de caja (Ingreso o Gasto)"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>+ REGISTRAR MOVIMIENTO</span>
            </button>
          </div>
        </div>

        {/* Fila 2: Selectores de Sucursal y Selector de Fecha con HOY y Calendario */}
        <div className="pt-4 border-t border-slate-300 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Selectores de Sucursal (Todas / Sucursal 1 / Sucursal 2) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200 rounded-xl border border-slate-300">
            <span className="text-[11px] font-black text-slate-800 uppercase px-2 hidden sm:inline">
              Sucursal:
            </span>
            <button
              type="button"
              onClick={() => setBranchFilter('todas')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                branchFilter === 'todas'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-800 hover:bg-blue-200 hover:text-blue-950'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => {
                setBranchFilter('sucursal_1');
                setSelectedBranch('sucursal_1');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                branchFilter === 'sucursal_1'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-800 hover:bg-blue-200 hover:text-blue-950'
              }`}
            >
              Sucursal 1
            </button>
            <button
              type="button"
              onClick={() => {
                setBranchFilter('sucursal_2');
                setSelectedBranch('sucursal_2');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                branchFilter === 'sucursal_2'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-800 hover:bg-blue-200 hover:text-blue-950'
              }`}
            >
              Sucursal 2
            </button>
          </div>

          {/* Selector de Fecha con HOY y Calendario */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-200 rounded-xl p-1 border border-slate-300">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="p-1.5 hover:bg-blue-200 hover:text-blue-950 rounded-lg text-slate-800 transition-colors cursor-pointer"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSetToday}
                className={`px-3.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  isTodayActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-900 bg-slate-100 hover:bg-blue-200 hover:text-blue-950 border border-slate-300'
                }`}
                title="Ir al día de hoy"
              >
                HOY
              </button>

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="p-1.5 hover:bg-blue-200 hover:text-blue-950 rounded-lg text-slate-800 transition-colors cursor-pointer"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setViewScope('dia');
                }}
                className="text-xs p-2 rounded-xl border-2 border-slate-300 bg-slate-50 font-black text-slate-900 outline-none focus:border-blue-600"
                title="Seleccionar fecha específica en el calendario"
              />
            </div>

            <button
              type="button"
              onClick={() => setViewScope(viewScope === 'dia' ? 'todos' : 'dia')}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                viewScope === 'todos'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-blue-200 hover:text-blue-950'
              }`}
            >
              {viewScope === 'todos' ? 'Ver Solo Día' : 'Ver Historial Completo'}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TARJETAS DE RESUMEN (ARRIBA): LOS 3 BLOQUES PRINCIPALES       */}
        {/* ============================================================== */}
        <div className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. GASTOS DEL DÍA */}
            <div className="bg-rose-50/60 p-5 rounded-2xl border-2 border-rose-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-rose-800 uppercase tracking-wider block mb-1">
                  Gastos del Día
                </span>
                <div className="text-2xl sm:text-3xl font-black text-rose-900 tracking-tight">
                  {formatCurrency(totalExpenses, business?.currency)}
                </div>
                <span className="text-xs text-rose-700 font-bold mt-1 block">
                  (Insumos y servicios)
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-rose-600 border border-rose-300 flex items-center justify-center shrink-0 shadow-xs">
                <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>

            {/* 2. SALDOS POR COBRAR */}
            <div className="bg-amber-50/60 p-5 rounded-2xl border-2 border-amber-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider block mb-1">
                  Saldos Por Cobrar
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(pendingBalances, business?.currency)}
                </div>
                <span className="text-xs text-amber-800 font-bold mt-1 block">
                  (De turnos de este día)
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-amber-600 border border-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>

            {/* 3. INGRESOS DEL DÍA */}
            <div className="bg-emerald-50/60 p-5 rounded-2xl border-2 border-emerald-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block mb-1">
                  Ingresos del Día
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
                  {formatCurrency(totalIncome, business?.currency)}
                </div>
                <span className="text-xs text-emerald-700 font-bold mt-1 block">
                  (Cobros de turnos + señas)
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 border border-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Balance Neto & Atajos adicionales */}
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-[#1E3A8A]">
                <Wallet className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                  Balance Neto (Ingresos menos Gastos)
                </span>
                <div className={`text-xl font-black ${netBalance >= 0 ? 'text-[#1E3A8A]' : 'text-rose-700'}`}>
                  {formatCurrency(netBalance, business?.currency)}
                </div>
              </div>
            </div>

            {/* Atajos de registro rápido */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openMovementModal('ingreso')}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
              >
                + Ingreso Rápido
              </button>
              <button
                type="button"
                onClick={() => openMovementModal('gasto')}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
              >
                - Gasto Rápido
              </button>
            </div>
          </div>
        </div>

        {/* Desglose de Medios de Pago */}
        <div className="pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-700 block font-bold">Efectivo</span>
              <span className="font-black text-slate-900 text-sm">
                {formatCurrency(incomeByMethod.efectivo || 0, business?.currency)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-700 block font-bold">Transferencia</span>
              <span className="font-black text-slate-900 text-sm">
                {formatCurrency(incomeByMethod.transferencia || 0, business?.currency)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-700 block font-bold">Mercado Pago</span>
              <span className="font-black text-slate-900 text-sm">
                {formatCurrency(incomeByMethod.mercadopago || 0, business?.currency)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-700 block font-bold">Tarjeta</span>
              <span className="font-black text-slate-900 text-sm">
                {formatCurrency(incomeByMethod.tarjeta || 0, business?.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SECCIÓN INFERIOR DE TABLA: "Mostrando Arqueo Para: [Fecha]" */}
      {/* ============================================================== */}
      <div className="bg-[#f1f5f9] rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
        {/* Cabecera de la Tabla */}
        <div className="p-4 sm:p-5 border-b-2 border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-200/80">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-700" />
              <span>
                Mostrando Arqueo Para: {viewScope === 'dia' ? formatDateSpanishLong(selectedDate) : 'Historial Completo'}
              </span>
            </h3>
            <p className="text-xs font-bold text-slate-700 mt-0.5">
              Desglose detallado de los movimientos (Fecha, Detalle, Importe, Medio de Pago, Estado y Sucursal)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pestañas de filtrado: Todos / Ingresos / Gastos */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
              <button
                type="button"
                onClick={() => setActiveTab('todos')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'todos' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-800 hover:bg-blue-200 hover:text-blue-950'
                }`}
              >
                Todos ({scopedMovements.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ingresos')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'ingresos' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-800 hover:bg-emerald-200 hover:text-emerald-950'
                }`}
              >
                Ingresos ({scopedMovements.filter((m) => m.type === 'ingreso').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('gastos')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'gastos' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-800 hover:bg-rose-200 hover:text-rose-950'
                }`}
              >
                Gastos ({scopedMovements.filter((m) => m.type === 'gasto').length})
              </button>
            </div>

            {/* Descargar CSV / Excel */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 text-slate-800 hover:text-white bg-slate-100 hover:bg-blue-600 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Descargar movimientos en CSV / Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido de la Tabla */}
        {filteredMovements.length === 0 ? (
          <div className="text-center py-12 p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                No hay movimientos registrados para este día / filtro
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Utiliza el botón "+ REGISTRAR MOVIMIENTO" para asentar ingresos o gastos.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => openMovementModal('ingreso')}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                + Registrar Ingreso
              </button>
              <button
                type="button"
                onClick={() => openMovementModal('gasto')}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                - Registrar Gasto
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabla para Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-black text-slate-800 uppercase tracking-wider">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Detalle</th>
                    <th className="py-3 px-4">Importe</th>
                    <th className="py-3 px-4">Medio de Pago</th>
                    <th className="py-3 px-4">Sucursal</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-semibold">
                  {filteredMovements.map((mov) => {
                    const isIncome = mov.type === 'ingreso';
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Fecha */}
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {mov.date}
                        </td>

                        {/* Tipo */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                : 'bg-rose-100 text-rose-950 border border-rose-300'
                            }`}
                          >
                            {isIncome ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            <span>{isIncome ? 'Ingreso' : 'Gasto'}</span>
                          </span>
                        </td>

                        {/* Detalle */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{mov.description}</div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            {mov.category || 'General'}
                          </span>
                        </td>

                        {/* Importe */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`font-black text-sm ${
                              isIncome ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatCurrency(mov.amount, business?.currency)}
                          </span>
                        </td>

                        {/* Medio de Pago */}
                        <td className="py-3 px-4 whitespace-nowrap capitalize text-slate-800 font-bold">
                          {mov.paymentMethod || 'Efectivo'}
                        </td>

                        {/* Sucursal */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              mov.branchId === 'sucursal_2'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}
                          >
                            {mov.branchId === 'sucursal_2' ? 'Sucursal 2' : 'Sucursal 1'}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Completado</span>
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDelete(mov.id)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas para Pantallas Móviles */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredMovements.map((mov) => {
                const isIncome = mov.type === 'ingreso';
                return (
                  <div key={mov.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isIncome ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'
                          }`}
                        >
                          {isIncome ? <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" /> : <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />}
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-900 leading-tight">
                            {mov.description}
                          </div>
                          <div className="text-[11px] text-slate-600 font-bold mt-0.5">
                            {mov.date} · <span className="uppercase">{mov.category || 'General'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-black text-sm ${
                            isIncome ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {formatCurrency(mov.amount, business?.currency)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(mov.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer mt-1"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[10px] font-black">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                        Medio: <strong className="capitalize">{mov.paymentMethod || 'Efectivo'}</strong>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md uppercase ${
                          mov.branchId === 'sucursal_2'
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}
                      >
                        {mov.branchId === 'sucursal_2' ? 'Sucursal 2' : 'Sucursal 1'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Completado</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Registrar Movimiento */}
      {isModalOpen && (
        <CashMovementModal
          initialDate={selectedDate}
          initialType={modalInitialType}
          initialBranchId={branchFilter === 'todas' ? selectedBranch : branchFilter}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default CashView;
