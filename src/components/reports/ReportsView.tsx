import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Users,
  Award,
  DollarSign,
  Receipt,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';

export function ReportsView() {
  const { appointments, clients, services, staff, business } = useApp();
  const [period, setPeriod] = useState<'mes' | 'semana' | 'hoy' | 'todo'>('mes');

  const todayStr = getTodayDateString();

  // Filter appointments according to selected period
  const filteredAppointments = useMemo(() => {
    if (period === 'todo') return appointments;

    const today = new Date();
    return appointments.filter((apt) => {
      const [y, m, d] = apt.date.split('-').map(Number);
      const aptDate = new Date(y, m - 1, d);

      if (period === 'hoy') {
        return apt.date === todayStr;
      }
      if (period === 'semana') {
        const diffTime = Math.abs(today.getTime() - aptDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (period === 'mes') {
        return aptDate.getMonth() === today.getMonth() && aptDate.getFullYear() === today.getFullYear();
      }
      return true;
    });
  }, [appointments, period, todayStr]);

  // Compute metrics
  const totalTurns = filteredAppointments.length;
  const completedTurns = filteredAppointments.filter((a) => a.status === 'completado');
  const cancelledTurns = filteredAppointments.filter((a) => a.status === 'cancelado');
  const confirmedTurns = filteredAppointments.filter((a) => a.status === 'confirmado');

  const totalRevenue = completedTurns.reduce((sum, a) => sum + (a.price || 0), 0);
  const averageTicket = completedTurns.length > 0 ? Math.round(totalRevenue / completedTurns.length) : 0;
  const attendanceRate = totalTurns > 0 ? Math.round((completedTurns.length / (completedTurns.length + cancelledTurns.length || 1)) * 100) : 100;

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
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredAppointments]);

  // Performance by staff member
  const staffStats = useMemo(() => {
    const stats: Record<string, { count: number; revenue: number; name: string; role: string }> = {};
    staff.forEach((s) => {
      stats[s.id] = { count: 0, revenue: 0, name: s.name, role: s.role };
    });
    filteredAppointments.forEach((apt) => {
      if (apt.status === 'cancelado') return;
      if (stats[apt.staffId]) {
        stats[apt.staffId].count += 1;
        stats[apt.staffId].revenue += apt.price || 0;
      }
    });
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [filteredAppointments, staff]);

  // Top clients
  const topClients = useMemo(() => {
    const counts: Record<string, { count: number; spent: number; name: string }> = {};
    filteredAppointments.forEach((apt) => {
      if (apt.status === 'cancelado') return;
      const name = apt.clientName;
      if (!counts[name]) {
        counts[name] = { count: 0, spent: 0, name };
      }
      counts[name].count += 1;
      counts[name].spent += apt.price || 0;
    });
    return Object.values(counts).sort((a, b) => b.spent - a.spent).slice(0, 5);
  }, [filteredAppointments]);

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f1f5f9] p-6 rounded-2xl border-2 border-slate-300 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-800 border border-blue-200">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Métricas & Rendimiento del Negocio
            </h2>
          </div>
          <p className="text-xs text-slate-700 font-bold mt-1 pl-9">
            Resumen de facturación, tasa de asistencia y servicios con mayor demanda
          </p>
        </div>

        {/* Period Pills (Segmented control) */}
        <div className="flex items-center bg-slate-200 p-1 rounded-xl border border-slate-300 self-start sm:self-auto">
          {(['hoy', 'semana', 'mes', 'todo'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black capitalize transition-all cursor-pointer ${
                period === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-800 hover:bg-blue-200 hover:text-blue-950'
              }`}
            >
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta Semana' : p === 'mes' ? 'Este Mes' : 'Histórico Total'}
            </button>
          ))}
        </div>
      </div>

      {/* Prominent Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Facturación */}
        <div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-slate-300 shadow-xs flex flex-col justify-between group hover:border-blue-500 hover:bg-blue-50/40 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                Facturación Cobrada
              </span>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                {formatCurrency(totalRevenue, business?.currency)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold pt-2 border-t border-slate-200">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
              {completedTurns.length} completados
            </span>
            <span>en este período</span>
          </div>
        </div>

        {/* Turnos Totales */}
        <div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-slate-300 shadow-xs flex flex-col justify-between group hover:border-blue-500 hover:bg-blue-50/40 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                Turnos Agendados
              </span>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                {totalTurns}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
              <CalendarCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold pt-2 border-t border-slate-200">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
              {confirmedTurns.length} programados
            </span>
            <span>listos para atender</span>
          </div>
        </div>

        {/* Asistencias y Cancelaciones */}
        <div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-slate-300 shadow-xs flex flex-col justify-between group hover:border-blue-500 hover:bg-blue-50/40 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                Tasa de Asistencia
              </span>
              <div className="text-3xl font-black text-emerald-800 tracking-tight mt-1">
                {attendanceRate}%
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold pt-2 border-t border-slate-200">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-950 border border-rose-300">
              {cancelledTurns.length} cancelados
            </span>
            <span>total de bajas</span>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-slate-300 shadow-xs flex flex-col justify-between group hover:border-blue-500 hover:bg-blue-50/40 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                Ticket Promedio
              </span>
              <div className="text-3xl font-black text-blue-900 tracking-tight mt-1">
                {formatCurrency(averageTicket, business?.currency)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
              <Receipt className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold pt-2 border-t border-slate-200">
            <span>Inversión media por visita</span>
          </div>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-slate-300 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Servicios Más Demandados
            </h3>
            <p className="text-xs text-slate-600 font-bold mt-0.5">Top tratamientos por facturación y volumen</p>
          </div>

          {serviceStats.length === 0 ? (
            <p className="text-xs text-slate-500 font-bold text-center py-8">No hay turnos registrados en este período.</p>
          ) : (
            <div className="space-y-4 pt-2">
              {serviceStats.map((srv, idx) => {
                const maxRev = serviceStats[0]?.revenue || 1;
                const percentage = Math.round((srv.revenue / maxRev) * 100);
                return (
                  <div key={srv.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-black text-[10px] flex items-center justify-center border border-blue-200">
                          {idx + 1}
                        </span>
                        {srv.name}
                      </span>
                      <div className="text-right">
                        <span className="text-slate-900 font-black">
                          {formatCurrency(srv.revenue, business?.currency)}
                        </span>
                        <span className="text-slate-600 text-[10px] ml-1.5 font-bold">
                          ({srv.count} turnos)
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Staff Performance */}
        <div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-slate-300 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              Rendimiento por Profesional
            </h3>
            <p className="text-xs text-slate-600 font-bold mt-0.5">Turnos atendidos y aportes a la facturación</p>
          </div>

          {staffStats.length === 0 ? (
            <p className="text-xs text-slate-500 font-bold text-center py-8">No hay profesionales registrados.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {staffStats.map((st) => (
                <div
                  key={st.name}
                  className="p-3.5 bg-slate-100 hover:bg-blue-100 rounded-xl border border-slate-200 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm leading-tight">{st.name}</h4>
                      <p className="text-xs text-slate-600 font-semibold">{st.role}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-slate-900 text-sm">
                      {formatCurrency(st.revenue, business?.currency)}
                    </div>
                    <div className="text-xs text-blue-800 font-black">
                      {st.count} turnos realizados
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Frequent Clients */}
      <div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-slate-300 shadow-xs space-y-4">
        <div>
          <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Clientes Destacados del Período
          </h3>
          <p className="text-xs text-slate-600 font-bold mt-0.5">Clientes frecuentes e inversión acumulada</p>
        </div>

        {topClients.length === 0 ? (
          <p className="text-xs text-slate-500 font-bold text-center py-6">Sin datos de visitas en este período.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {topClients.map((cli, i) => (
              <div key={cli.name} className="p-4 bg-slate-100 hover:bg-blue-100 border border-slate-200 rounded-xl text-center transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-200 text-blue-950 font-black mx-auto mb-2 flex items-center justify-center text-xs">
                  #{i + 1}
                </div>
                <h5 className="font-black text-xs text-slate-900 truncate mb-1">{cli.name}</h5>
                <div className="text-xs font-black text-blue-900">
                  {formatCurrency(cli.spent, business?.currency)}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5 font-bold">{cli.count} visitas</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
