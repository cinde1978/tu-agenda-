import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  CalendarCheck,
  CheckCircle2,
  Users,
  Award,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  BarChart3,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateSpanish } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';
import { SCOPE_NAMES } from '../../utils/staffSchedule';

export function ReportsView() {
  const {
    appointments,
    cashMovements,
    staff,
    business,
    createCashMovement,
    selectedBranch,
    activeSingleBranch,
    setSelectedBranch,
  } = useApp();
  const [period, setPeriod] = useState<'mes' | 'semana' | 'hoy' | 'todo'>('mes');
  const [liquidationFeedback, setLiquidationFeedback] = useState<string | null>(null);
  const [confirmLiquidateStaffId, setConfirmLiquidateStaffId] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  const matchesSelectedPeriod = (dateStr: string): boolean => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    if (period === 'todo') return true;
    if (period === 'hoy') return dateStr === todayStr;

    const [ty, tm, td] = todayStr.split('-').map(Number);
    const [y, m, d] = dateStr.split('-').map(Number);

    if (period === 'mes') {
      return y === ty && m === tm;
    }

    if (period === 'semana') {
      const todayObj = new Date(ty, tm - 1, td);
      const itemObj = new Date(y, m - 1, d);
      const diffDays = Math.abs(
        Math.round((todayObj.getTime() - itemObj.getTime()) / (1000 * 60 * 60 * 24))
      );
      return diffDays <= 7;
    }

    return true;
  };

  // Filter appointments according to selected period
  const filteredAppointments = useMemo(() => {
    if (period === 'todo') return appointments;
    return appointments.filter((apt) => matchesSelectedPeriod(apt.date));
  }, [appointments, period, todayStr]);

  // Filter cash movements according to selected period
  const filteredCashMovements = useMemo(() => {
    if (period === 'todo') return cashMovements;
    return cashMovements.filter((mov) => matchesSelectedPeriod(mov.date));
  }, [cashMovements, period, todayStr]);

  const periodIncomeMovements = useMemo(
    () => filteredCashMovements.filter((m) => m.type === 'ingreso'),
    [filteredCashMovements]
  );
  const periodExpenseMovements = useMemo(
    () => filteredCashMovements.filter((m) => m.type === 'gasto'),
    [filteredCashMovements]
  );

  const periodCashIncome = useMemo(
    () => periodIncomeMovements.reduce((sum, m) => sum + (m.amount || 0), 0),
    [periodIncomeMovements]
  );
  const periodCashExpenses = useMemo(
    () => periodExpenseMovements.reduce((sum, m) => sum + (m.amount || 0), 0),
    [periodExpenseMovements]
  );
  const periodCashNet = periodCashIncome - periodCashExpenses;

  // Compute appointment metrics
  const totalTurns = filteredAppointments.length;
  const completedTurns = filteredAppointments.filter((a) => a.status === 'completado');
  const cancelledTurns = filteredAppointments.filter((a) => a.status === 'cancelado');
  const confirmedTurns = filteredAppointments.filter((a) => a.status === 'confirmado');

  const totalRevenue = completedTurns.reduce((sum, a) => sum + (a.price || 0), 0);
  const averageTicket =
    completedTurns.length > 0 ? Math.round(totalRevenue / completedTurns.length) : 0;
  const resolvedTurnsCount = completedTurns.length + cancelledTurns.length;
  const hasAttendanceData = totalTurns > 0 && resolvedTurnsCount > 0;
  const attendanceRateLabel = hasAttendanceData
    ? `${Math.round((completedTurns.length / resolvedTurnsCount) * 100)}%`
    : 'Sin datos';

  // Revenue by service
  const serviceStats = useMemo(() => {
    const stats: Record<string, { count: number; revenue: number; name: string }> = {};
    filteredAppointments.forEach((apt) => {
      if (apt.status === 'cancelado') return;
      const srvName = apt.serviceName || 'Otros';
      if (!stats[srvName]) {
        stats[srvName] = { count: 0, revenue: 0, name: srvName };
      }
      stats[srvName].count += 1;
      stats[srvName].revenue += apt.price || 0;
    });
    return Object.values(stats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredAppointments]);

  // Performance and Commissions by staff member
  const staffStats = useMemo(() => {
    const stats: Record<
      string,
      {
        id: string;
        count: number;
        revenue: number;
        name: string;
        role: string;
        commissionPercentage: number;
        commissionEarned: number;
        salonNet: number;
      }
    > = {};

    staff.forEach((s) => {
      const pct = s.commissionPercentage ?? 40;
      stats[s.id] = {
        id: s.id,
        count: 0,
        revenue: 0,
        name: s.name,
        role: s.role,
        commissionPercentage: pct,
        commissionEarned: 0,
        salonNet: 0,
      };
    });

    filteredAppointments.forEach((apt) => {
      if (apt.status === 'cancelado') return;
      if (stats[apt.staffId]) {
        stats[apt.staffId].count += 1;
        const rev = apt.price || 0;
        stats[apt.staffId].revenue += rev;
        const comm = Math.round((rev * stats[apt.staffId].commissionPercentage) / 100);
        stats[apt.staffId].commissionEarned += comm;
        stats[apt.staffId].salonNet += rev - comm;
      }
    });
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [filteredAppointments, staff]);

  // Top clients
  const topClients = useMemo(() => {
    const counts: Record<string, { count: number; spent: number; name: string }> = {};
    filteredAppointments.forEach((apt) => {
      if (apt.status === 'cancelado') return;
      const name = apt.clientName || 'Cliente';
      if (!counts[name]) {
        counts[name] = { count: 0, spent: 0, name };
      }
      counts[name].count += 1;
      counts[name].spent += apt.price || 0;
    });
    return Object.values(counts)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  }, [filteredAppointments]);

  const branchNameLabel = SCOPE_NAMES[selectedBranch];

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Top Header & Period + Branch Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-200">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
              Estadísticas, Caja & Comisiones
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#1E3A8A] border border-blue-200">
              {branchNameLabel}
            </span>
          </div>
          <p className="text-xs text-slate-600 font-semibold mt-1 pl-9">
            Resumen de turnos, facturación, asistencia, cancelaciones y comisiones por sucursal y período
          </p>
          {/* Branch Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap mt-3 pl-9">
            {(['sucursal_1', 'sucursal_2', 'ambas'] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setSelectedBranch(scope)}
                className={`px-3 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                  selectedBranch === scope
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-2xs'
                    : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
                }`}
              >
                {SCOPE_NAMES[scope]}
              </button>
            ))}
          </div>
        </div>

        {/* Period Pills (Segmented control) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border-2 border-slate-300 self-start lg:self-auto">
          {(['hoy', 'semana', 'mes', 'todo'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black capitalize border-2 transition-all cursor-pointer ${
                period === p
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
              }`}
            >
              {p === 'hoy'
                ? 'Hoy'
                : p === 'semana'
                ? 'Esta Semana'
                : p === 'mes'
                ? 'Este Mes'
                : 'Histórico Total'}
            </button>
          ))}
        </div>
      </div>

      {/* Prominent Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Facturación Turnos */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Facturación Turnos Completados
              </span>
              <div className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-1">
                {formatCurrency(totalRevenue, business?.currency)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1E3A8A] border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {completedTurns.length} completados
            </span>
            <span>en este período</span>
          </div>
        </div>

        {/* Turnos Totales */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Turnos Agendados
              </span>
              <div className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-1">
                {totalTurns}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1E3A8A] border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
              <CalendarCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#1E3A8A] border border-blue-200">
              {confirmedTurns.length} programados
            </span>
            <span>listos para atender</span>
          </div>
        </div>

        {/* Asistencias y Cancelaciones */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Tasa de Asistencia
              </span>
              <div
                className={`font-extrabold tracking-tight mt-1 ${
                  hasAttendanceData
                    ? 'text-3xl text-emerald-700'
                    : 'text-2xl text-slate-600'
                }`}
              >
                {attendanceRateLabel}
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${
                hasAttendanceData
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-300'
              }`}
            >
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
            {totalTurns === 0 ? (
              <span className="text-[11px] font-bold text-slate-500">
                Sin turnos en este período
              </span>
            ) : (
              <>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  {cancelledTurns.length} cancelados
                </span>
                <span>total de bajas</span>
              </>
            )}
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Ticket Promedio
              </span>
              <div className="text-3xl font-extrabold text-[#1E3A8A] tracking-tight mt-1">
                {formatCurrency(averageTicket, business?.currency)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span>Inversión media por visita</span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* REPORTE DE MOVIMIENTOS DE CAJA DIARIA (INGRESOS Y GASTOS)          */}
      {/* ================================================================= */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-300 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-black text-[#0F172A] text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#1E3A8A]" />
              <span>Reporte de Caja Diaria — Ingresos y Gastos ({branchNameLabel})</span>
            </h3>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Refleja todos los ingresos y gastos registrados en Caja Diaria durante el período seleccionado
            </p>
          </div>
          <span className="text-xs font-black text-[#0F172A] bg-slate-100 px-3 py-1 rounded-xl border border-slate-300 self-start sm:self-auto">
            {filteredCashMovements.length} movimiento(s) en el período
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-emerald-800 uppercase block">
                Ingresos Registrados
              </span>
              <span className="text-2xl font-black text-emerald-950 block mt-0.5">
                {formatCurrency(periodCashIncome, business?.currency)}
              </span>
              <span className="text-[11px] font-bold text-emerald-800">
                {periodIncomeMovements.length} ingreso(s)
              </span>
            </div>
            <ArrowDownLeft className="w-6 h-6 text-emerald-700 shrink-0" />
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-rose-800 uppercase block">
                Gastos Registrados
              </span>
              <span className="text-2xl font-black text-rose-950 block mt-0.5">
                {formatCurrency(periodCashExpenses, business?.currency)}
              </span>
              <span className="text-[11px] font-bold text-rose-800">
                {periodExpenseMovements.length} gasto(s)
              </span>
            </div>
            <ArrowUpRight className="w-6 h-6 text-rose-700 shrink-0" />
          </div>

          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-[#1E3A8A] uppercase block">
                Balance Neto de Caja
              </span>
              <span
                className={`text-2xl font-black block mt-0.5 ${
                  periodCashNet >= 0 ? 'text-[#1E3A8A]' : 'text-rose-700'
                }`}
              >
                {formatCurrency(periodCashNet, business?.currency)}
              </span>
              <span className="text-[11px] font-bold text-slate-700">
                Ingresos menos gastos
              </span>
            </div>
            <Wallet className="w-6 h-6 text-[#1E3A8A] shrink-0" />
          </div>
        </div>

        {filteredCashMovements.length === 0 ? (
          <p className="text-xs text-slate-500 font-bold text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
            No hay movimientos de ingresos ni gastos registrados en Caja Diaria para este período.
          </p>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-200 max-h-80 overflow-y-auto">
            {filteredCashMovements.map((mov) => (
              <div
                key={mov.id}
                className="p-3.5 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded-md font-black uppercase text-[10px] shrink-0 border ${
                      mov.type === 'ingreso'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {mov.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                  </span>
                  <span className="font-black text-[#0F172A] truncate">
                    {mov.description}
                  </span>
                  <span className="text-slate-500 font-bold capitalize shrink-0">
                    ({mov.category} · {mov.paymentMethod || 'efectivo'})
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="text-slate-500 font-bold">
                    {formatDateSpanish(mov.date) || mov.date}
                  </span>
                  <span
                    className={`font-black text-sm ${
                      mov.type === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {mov.type === 'ingreso' ? '+' : '-'}{' '}
                    {formatCurrency(mov.amount, business?.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-[#0F172A] text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              Servicios Más Demandados
            </h3>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Top tratamientos por facturación y volumen
            </p>
          </div>

          {serviceStats.length === 0 ? (
            <p className="text-xs text-slate-500 font-semibold text-center py-8">
              No hay turnos registrados en este período.
            </p>
          ) : (
            <div className="space-y-4 pt-2">
              {serviceStats.map((srv, idx) => {
                const maxRev = serviceStats[0]?.revenue || 1;
                const percentage = Math.round((srv.revenue / maxRev) * 100);
                return (
                  <div key={srv.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#0F172A] font-bold flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-200 font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {srv.name}
                      </span>
                      <div className="text-right">
                        <span className="text-[#0F172A] font-extrabold">
                          {formatCurrency(srv.revenue, business?.currency)}
                        </span>
                        <span className="text-slate-500 text-[10px] ml-1.5 font-semibold">
                          ({srv.count} turnos)
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1E3A8A] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Staff Performance & Commissions */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-300 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-black text-[#0F172A] text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-[#1E3A8A]" />
                Liquidación de Comisiones & Rendimiento
              </h3>
              <p className="text-xs text-slate-700 font-bold mt-0.5">
                Cálculo automático según el % configurado en cada profesional
              </p>
            </div>
            {liquidationFeedback && (
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
                {liquidationFeedback}
              </span>
            )}
          </div>

          {staffStats.length === 0 ? (
            <p className="text-xs text-slate-500 font-bold text-center py-8">
              No hay profesionales registrados.
            </p>
          ) : (
            <div className="space-y-3.5 pt-1">
              {staffStats.map((st) => (
                <div
                  key={st.id}
                  className="p-4 bg-slate-50 hover:bg-blue-50/40 rounded-xl border-2 border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-[#0F172A] text-sm leading-tight">
                        {st.name}
                      </h4>
                      <p className="text-xs text-slate-600 font-bold">{st.role}</p>
                      <span className="text-[11px] font-bold text-[#1E3A8A] bg-blue-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                        Comisión fijada: {st.commissionPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-right shrink-0 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-600 block">
                        Facturación
                      </span>
                      <span className="font-black text-xs sm:text-sm text-[#0F172A] block">
                        {formatCurrency(st.revenue, business?.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        {st.count} turnos
                      </span>
                    </div>

                    <div className="border-x border-slate-200 px-2">
                      <span className="text-[10px] font-bold text-emerald-800 block">A Pagar</span>
                      <span className="font-black text-xs sm:text-sm text-emerald-700 block">
                        {formatCurrency(st.commissionEarned, business?.currency)}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        {st.commissionPercentage}%
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-700 block">
                        Neto Soham
                      </span>
                      <span className="font-black text-xs sm:text-sm text-[#1E3A8A] block">
                        {formatCurrency(st.salonNet, business?.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Margen
                      </span>
                    </div>
                  </div>

                  {/* Action: Pay commission to Cash (iframe-safe inline confirmation) */}
                  {st.commissionEarned > 0 &&
                    (confirmLiquidateStaffId === st.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            const targetBranch =
                              selectedBranch === 'ambas' ? activeSingleBranch : selectedBranch;
                            await createCashMovement({
                              date: todayStr,
                              branchId: targetBranch,
                              type: 'gasto',
                              category: 'comisiones',
                              amount: st.commissionEarned,
                              paymentMethod: 'efectivo',
                              description: `Liquidación de comisión a ${st.name} (${st.commissionPercentage}% de ${formatCurrency(
                                st.revenue,
                                business?.currency
                              )})`,
                            });
                            setConfirmLiquidateStaffId(null);
                            setLiquidationFeedback(
                              `¡Comisión de ${st.name} registrada en Caja Diaria!`
                            );
                            setTimeout(() => setLiquidationFeedback(null), 4000);
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmLiquidateStaffId(null)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-[#0F172A] border-2 border-slate-300 rounded-xl text-xs font-black cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmLiquidateStaffId(st.id)}
                        className="px-3 py-2 bg-[#1E3A8A] hover:bg-blue-900 active:scale-98 text-white rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer shadow-2xs"
                      >
                        Registrar en Caja
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Frequent Clients */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-black text-[#0F172A] text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1E3A8A]" />
            Clientes Destacados del Período
          </h3>
          <p className="text-xs text-slate-600 font-semibold mt-0.5">
            Clientes frecuentes e inversión acumulada
          </p>
        </div>

        {topClients.length === 0 ? (
          <p className="text-xs text-slate-500 font-semibold text-center py-6">
            Sin datos de visitas en este período.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {topClients.map((cli, i) => (
              <div
                key={cli.name}
                className="p-4 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 rounded-xl text-center transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-200 font-extrabold mx-auto mb-2 flex items-center justify-center text-xs">
                  #{i + 1}
                </div>
                <h5 className="font-black text-xs text-[#0F172A] truncate mb-1">{cli.name}</h5>
                <div className="text-xs font-extrabold text-[#1E3A8A]">
                  {formatCurrency(cli.spent, business?.currency)}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5 font-bold">
                  {cli.count} visitas
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
