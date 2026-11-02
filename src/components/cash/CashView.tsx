import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CreditCard,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  Building2,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import {
  BranchId,
  CashMovementCategory,
  CashMovementType,
  PaymentMethod,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency,
  formatDateSpanish,
  formatDateSpanishLong,
} from '../../utils/formatters';
import { getTodayDateString, getBranchBusinessConfig } from '../../utils/initialData';
import { SCOPE_NAMES } from '../../utils/staffSchedule';
import { CashMovementModal } from './CashMovementModal';

const INCOME_CATEGORIES: CashMovementCategory[] = ['turno', 'seña', 'saldo', 'otro'];
const EXPENSE_CATEGORIES: CashMovementCategory[] = [
  'insumos',
  'alquiler',
  'servicios',
  'comisiones',
  'otro',
];

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mercadopago: 'Mercado Pago',
  tarjeta: 'Tarjeta',
  pendiente: 'Pendiente',
};

export function CashView() {
  const {
    cashMovements,
    appointments,
    business,
    createCashMovement,
    deleteCashMovement,
    selectedBranch,
    activeSingleBranch,
    setSelectedBranch,
    branches,
  } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [activeTab, setActiveTab] = useState<'todos' | 'ingresos' | 'gastos'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<CashMovementType>('ingreso');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Inline complete form states (visible on desktop & mobile)
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const conceptInputRef = useRef<HTMLInputElement | null>(null);
  const [formType, setFormType] = useState<CashMovementType>('ingreso');
  const [formDate, setFormDate] = useState<string>(getTodayDateString());
  const [formConcept, setFormConcept] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formBranchId, setFormBranchId] = useState<BranchId>(activeSingleBranch);
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [formCategory, setFormCategory] = useState<CashMovementCategory>('turno');
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [isSavingInline, setIsSavingInline] = useState<boolean>(false);

  const branchPaymentMethods = getBranchBusinessConfig(business, formBranchId).enabledPaymentMethods;

  // Sync form branch and date with top navigation
  useEffect(() => {
    setFormBranchId(activeSingleBranch);
  }, [activeSingleBranch]);

  useEffect(() => {
    if (branchPaymentMethods.length > 0 && !branchPaymentMethods.includes(formPaymentMethod)) {
      setFormPaymentMethod(branchPaymentMethods[0]);
    }
  }, [branchPaymentMethods, formPaymentMethod]);

  useEffect(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      setFormDate(selectedDate);
    }
  }, [selectedDate]);

  const handleTabSwitch = (nextTab: 'todos' | 'ingresos' | 'gastos') => {
    setActiveTab(nextTab);
    if (nextTab === 'gastos') {
      setFormType('gasto');
      setFormCategory('insumos');
    } else if (nextTab === 'ingresos') {
      setFormType('ingreso');
      setFormCategory('turno');
    }
  };

  const handleInlineTypeChange = (nextType: CashMovementType) => {
    setFormError('');
    setFormType(nextType);
    setFormCategory(nextType === 'ingreso' ? 'turno' : 'insumos');
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const parsedAmount = Number(formAmount);
    if (!formDate || !/^\d{4}-\d{2}-\d{2}$/.test(formDate)) {
      setFormError('Seleccioná una fecha válida para el movimiento.');
      return;
    }
    if (!formConcept.trim()) {
      setFormError('Ingresá el concepto del movimiento (ej. compra de insumos o cobro).');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Ingresá un importe válido mayor a 0.');
      return;
    }

    setIsSavingInline(true);
    try {
      await createCashMovement({
        date: formDate,
        branchId: formBranchId,
        type: formType,
        category: formCategory,
        amount: parsedAmount,
        paymentMethod: formPaymentMethod,
        description: formConcept.trim(),
      });

      // Ensure user immediately sees the newly saved movement in the list
      setSelectedDate(formDate);
      if (activeTab === 'ingresos' && formType === 'gasto') {
        setActiveTab('gastos');
      } else if (activeTab === 'gastos' && formType === 'ingreso') {
        setActiveTab('ingresos');
      }

      setFormConcept('');
      setFormAmount('');
      setFormSuccess(
        formType === 'gasto'
          ? '✓ Gasto registrado correctamente en Caja Diaria.'
          : '✓ Ingreso registrado correctamente en Caja Diaria.'
      );
      setTimeout(() => setFormSuccess(''), 4000);
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'No se pudo guardar el movimiento.');
    } finally {
      setIsSavingInline(false);
    }
  };

  const focusMovementForm = (preferredType?: CashMovementType) => {
    if (preferredType) {
      handleInlineTypeChange(preferredType);
    }
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => conceptInputRef.current?.focus(), 150);
  };

  const [dateFilterMode, setDateFilterMode] = useState<'dia' | 'todos'>('dia');

  const safeSelectedDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
    ? selectedDate
    : getTodayDateString();

  const dayMovements = cashMovements.filter((m) => m.date === safeSelectedDate);
  const baseMovements = dateFilterMode === 'dia' ? dayMovements : cashMovements;
  const incomeMovements = baseMovements.filter((m) => m.type === 'ingreso');
  const expenseMovements = baseMovements.filter((m) => m.type === 'gasto');

  const filteredMovements = baseMovements.filter((m) => {
    if (activeTab === 'todos') return true;
    if (activeTab === 'ingresos') return m.type === 'ingreso';
    return m.type === 'gasto';
  });

  const totalIncome = dayMovements.filter((m) => m.type === 'ingreso').reduce((sum, m) => sum + (m.amount || 0), 0);
  const totalExpenses = dayMovements.filter((m) => m.type === 'gasto').reduce((sum, m) => sum + (m.amount || 0), 0);
  const netBalance = totalIncome - totalExpenses;

  const dayAppointments = appointments.filter(
    (a) => a.date === safeSelectedDate && a.status !== 'cancelado'
  );
  const pendingBalances = dayAppointments.reduce(
    (sum, a) => sum + (a.remainingBalance || 0),
    0
  );

  const incomeByMethod: Record<string, number> = {
    efectivo: 0,
    transferencia: 0,
    mercadopago: 0,
    tarjeta: 0,
  };
  incomeMovements.forEach((m) => {
    const method = m.paymentMethod || 'efectivo';
    incomeByMethod[method] = (incomeByMethod[method] || 0) + (m.amount || 0);
  });

  const expensesByCategory: Record<string, number> = {
    insumos: 0,
    alquiler: 0,
    servicios: 0,
    comisiones: 0,
    otro: 0,
  };
  expenseMovements.forEach((m) => {
    const cat = m.category || 'otro';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (m.amount || 0);
  });

  const handleShiftDate = (days: number) => {
    const [y, m, d] = safeSelectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${nextY}-${nextM}-${nextD}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Date Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border-2 border-slate-300 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
              Caja Diaria & Finanzas
            </h2>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1E3A8A] border-2 border-blue-200 shadow-2xs">
              {SCOPE_NAMES[selectedBranch]}
            </span>
          </div>
          <p className="text-xs text-slate-700 font-semibold mt-0.5">
            Registro de ingresos y gastos diarios — Vista actual: {SCOPE_NAMES[selectedBranch]}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            {(['sucursal_1', 'sucursal_2', 'ambas'] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setSelectedBranch(scope)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer ${
                  selectedBranch === scope
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                    : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-100'
                }`}
              >
                {SCOPE_NAMES[scope]}
              </button>
            ))}
          </div>
        </div>

        {/* Date Selector & Quick Modal Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border-2 border-slate-300">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 hover:bg-white rounded-lg text-[#0F172A] transition-colors cursor-pointer"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateString())}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-colors cursor-pointer ${
                safeSelectedDate === getTodayDateString()
                  ? 'bg-[#1E3A8A] text-white shadow-xs'
                  : 'text-[#0F172A] hover:bg-white'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-1.5 hover:bg-white rounded-lg text-[#0F172A] transition-colors cursor-pointer"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <input
            type="date"
            value={safeSelectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="text-xs p-2 rounded-xl border-2 border-slate-300 bg-white font-black text-[#0F172A] outline-none focus:border-[#1E3A8A]"
            aria-label="Fecha de arqueo de caja"
          />

          <button
            type="button"
            onClick={() => {
              setModalInitialType(activeTab === 'gastos' ? 'gasto' : 'ingreso');
              setIsModalOpen(true);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md border-2 transition-all shrink-0 cursor-pointer text-white disabled:cursor-not-allowed disabled:opacity-75 ${
              activeTab === 'gastos'
                ? 'bg-[#B91C1C] hover:bg-[#991b1b] active:bg-[#7f1d1d] border-[#B91C1C] text-white disabled:bg-[#B91C1C] disabled:text-white'
                : 'bg-[#1E3A8A] hover:bg-[#172554] active:bg-[#0F172A] border-[#1E3A8A] text-white disabled:bg-[#1E3A8A] disabled:text-white'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-white" />
            <span className="text-white">Registrar movimiento</span>
          </button>
        </div>
      </div>

      {/* Date badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 px-1">
        <span className="font-bold capitalize">
          Arqueo de caja para: {formatDateSpanishLong(safeSelectedDate) || safeSelectedDate}
        </span>
        <span className="font-black text-[#0F172A]">
          {dayMovements.length} movimiento(s) en la fecha ({incomeMovements.length} ingresos ·{' '}
          {expenseMovements.length} gastos)
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-emerald-700 uppercase tracking-wider block mb-1">
              Ingresos del Día
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              {formatCurrency(totalIncome, business?.currency)}
            </div>
            <span className="text-[11px] text-slate-600 font-semibold mt-1 block">
              Cobros de turnos + señas
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Total Gastos */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-rose-700 uppercase tracking-wider block mb-1">
              Gastos del Día
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              {formatCurrency(totalExpenses, business?.currency)}
            </div>
            <span className="text-[11px] text-slate-600 font-semibold mt-1 block">
              Insumos, alquiler y egresos
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Balance Neto */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider block mb-1">
              Balance Neto
            </span>
            <div
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                netBalance >= 0 ? 'text-[#1E3A8A]' : 'text-rose-700'
              }`}
            >
              {formatCurrency(netBalance, business?.currency)}
            </div>
            <span className="text-[11px] text-slate-600 font-semibold mt-1 block">
              Ingresos menos gastos
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1E3A8A] border border-blue-200 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Saldos pendientes por cobrar */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1">
              Saldos por Cobrar
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              {formatCurrency(pendingBalances, business?.currency)}
            </div>
            <span className="text-[11px] text-slate-600 font-semibold mt-1 block">
              De turnos de este día
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-[#0F172A] border border-slate-300 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* FORMULARIO COMPLETO DE REGISTRO DE MOVIMIENTO (DESKTOP Y CELULAR) */}
      {/* ================================================================= */}
      <div
        ref={formSectionRef}
        className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden"
      >
        <div
          className={`p-4 sm:p-5 border-b-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            formType === 'gasto' ? 'bg-rose-50/70' : 'bg-emerald-50/60'
          }`}
        >
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#0F172A] flex items-center gap-2">
              {formType === 'gasto' ? (
                <ArrowUpRight className="w-5 h-5 text-rose-700 shrink-0" />
              ) : (
                <ArrowDownLeft className="w-5 h-5 text-emerald-700 shrink-0" />
              )}
              <span>
                {formType === 'gasto'
                  ? 'Registrar Gasto en Caja Diaria'
                  : 'Registrar Ingreso en Caja Diaria'}
              </span>
            </h3>
            <p className="text-xs text-slate-700 font-semibold mt-0.5">
              Completá fecha, concepto, importe, sucursal y medio de pago para asentar el movimiento.
            </p>
          </div>

          {/* Ingreso / Gasto Toggle */}
          <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-xl border-2 border-slate-300 self-start sm:self-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleInlineTypeChange('ingreso')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                formType === 'ingreso'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-[#0F172A] hover:bg-slate-100'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Ingreso (+)</span>
            </button>
            <button
              type="button"
              onClick={() => handleInlineTypeChange('gasto')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                formType === 'gasto'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-[#0F172A] hover:bg-slate-100'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Gasto (-)</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleInlineSubmit} noValidate className="p-4 sm:p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-black flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs font-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
            {/* Fecha */}
            <div className="lg:col-span-1">
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => {
                  setFormError('');
                  if (e.target.value) setFormDate(e.target.value);
                }}
                className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
              />
            </div>

            {/* Concepto */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Concepto *
              </label>
              <input
                ref={conceptInputRef}
                type="text"
                placeholder={
                  formType === 'gasto'
                    ? 'Ej. Insumos de gabinete, algodón, luz...'
                    : 'Ej. Cobro de sesión, venta de crema...'
                }
                value={formConcept}
                onChange={(e) => {
                  setFormError('');
                  setFormConcept(e.target.value);
                }}
                className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
              />
            </div>

            {/* Importe */}
            <div className="lg:col-span-1">
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Importe ({business?.currency || '$'}) *
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0"
                  value={formAmount}
                  onChange={(e) => {
                    setFormError('');
                    setFormAmount(e.target.value);
                  }}
                  className="w-full text-xs font-black pl-7 pr-2.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
            </div>

            {/* Sucursal */}
            <div className="lg:col-span-1">
              <label className="text-xs font-black text-[#0F172A] flex items-center gap-1 mb-1">
                <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span>Sucursal *</span>
              </label>
              <select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value as BranchId)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Medio de pago */}
            <div className="lg:col-span-1">
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Medio de pago *
              </label>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
              >
                {branchPaymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_LABELS[method] || method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="w-full sm:w-64">
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Categoría contable
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as CashMovementCategory)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] capitalize focus:border-[#1E3A8A] outline-none"
              >
                {(formType === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSavingInline}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer text-white disabled:cursor-not-allowed disabled:opacity-75 ${
                formType === 'gasto' || activeTab === 'gastos'
                  ? 'bg-[#B91C1C] hover:bg-[#991b1b] active:bg-[#7f1d1d] border-2 border-[#B91C1C] text-white disabled:bg-[#B91C1C] disabled:text-white'
                  : 'bg-[#1E3A8A] hover:bg-[#172554] active:bg-[#0F172A] border-2 border-[#1E3A8A] text-white disabled:bg-[#1E3A8A] disabled:text-white'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3] text-white" />
              <span className="text-white">{isSavingInline ? 'Guardando...' : 'Registrar movimiento'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Breakdown Grids: Ingresos & Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Desglose de Ingresos */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <span>Desglose de Ingresos por Medio de Pago</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(['efectivo', 'transferencia', 'mercadopago', 'tarjeta'] as const).map((method) => (
              <div
                key={method}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200"
              >
                <span className="text-[11px] text-slate-600 block font-bold">
                  {PAYMENT_LABELS[method]}
                </span>
                <span className="font-black text-[#0F172A] text-sm">
                  {formatCurrency(incomeByMethod[method] || 0, business?.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Desglose de Gastos */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-700" />
            <span>Desglose de Gastos por Categoría</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {EXPENSE_CATEGORIES.map((cat) => (
              <div
                key={cat}
                className="p-3 bg-rose-50/40 rounded-xl border border-rose-200/80"
              >
                <span className="text-[11px] text-slate-700 block font-bold capitalize">
                  {cat}
                </span>
                <span className="font-black text-rose-900 text-sm">
                  {formatCurrency(expensesByCategory[cat] || 0, business?.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Movements Table / List */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
        {/* Tab Filters + Quick Action */}
        <div className="p-4 border-b-2 border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Vista por día o historial completo */}
            <div className="flex items-center bg-white p-1 rounded-xl border-2 border-slate-300 shadow-2xs mr-2">
              <button
                type="button"
                onClick={() => setDateFilterMode('dia')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  dateFilterMode === 'dia'
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'text-[#0F172A] hover:bg-slate-100'
                }`}
                title="Ver sólo los movimientos del día seleccionado"
              >
                Día seleccionado ({dayMovements.length})
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('todos')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  dateFilterMode === 'todos'
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'text-[#0F172A] hover:bg-slate-100'
                }`}
                title="Ver todos los movimientos históricos (ideal para revisar y limpiar registros de prueba)"
              >
                Todos los días ({cashMovements.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleTabSwitch('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                activeTab === 'todos'
                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:border-slate-500'
              }`}
            >
              Todos ({baseMovements.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('ingresos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                activeTab === 'ingresos'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:border-slate-500'
              }`}
            >
              Ingresos ({incomeMovements.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('gastos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                activeTab === 'gastos'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:border-slate-500'
              }`}
            >
              Gastos ({expenseMovements.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              focusMovementForm(activeTab === 'gastos' ? 'gasto' : 'ingreso')
            }
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black text-white flex items-center gap-1.5 cursor-pointer shadow-2xs border-2 transition-all disabled:opacity-75 disabled:cursor-not-allowed ${
              activeTab === 'gastos'
                ? 'bg-[#B91C1C] hover:bg-[#991b1b] active:bg-[#7f1d1d] border-[#B91C1C] text-white disabled:bg-[#B91C1C] disabled:text-white'
                : 'bg-[#1E3A8A] hover:bg-[#172554] active:bg-[#0F172A] border-[#1E3A8A] text-white disabled:bg-[#1E3A8A] disabled:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3] text-white" />
            <span className="text-white">
              {activeTab === 'gastos'
                ? 'Cargar nuevo gasto arriba'
                : 'Cargar nuevo movimiento arriba'}
            </span>
          </button>
        </div>

        {/* Content */}
        {filteredMovements.length === 0 ? (
          <div className="text-center py-10 px-6 bg-white space-y-3">
            <p className="text-sm font-black text-[#0F172A]">
              {activeTab === 'gastos'
                ? 'No hay gastos registrados en esta fecha'
                : activeTab === 'ingresos'
                ? 'No hay ingresos registrados en esta fecha'
                : 'No hay movimientos de caja registrados en esta fecha'}
            </p>
            <p className="text-xs text-slate-600 font-semibold max-w-md mx-auto">
              Completá el formulario superior y presioná «Registrar movimiento» para asentar un{' '}
              {activeTab === 'gastos' ? 'gasto' : 'ingreso o gasto'} en{' '}
              {SCOPE_NAMES[selectedBranch]}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredMovements.map((mov) => {
              const branchLabel =
                mov.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo';
              return (
                <div
                  key={mov.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        mov.type === 'ingreso'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {mov.type === 'ingreso' ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-[#0F172A]">
                          {mov.description}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                            mov.type === 'ingreso'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {mov.type === 'ingreso' ? 'Ingreso' : 'Gasto'} · {mov.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-bold mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Fecha: {formatDateSpanish(mov.date) || mov.date}</span>
                        <span>·</span>
                        <span>Sucursal: {branchLabel}</span>
                        <span>·</span>
                        <span>
                          Medio: {PAYMENT_LABELS[mov.paymentMethod] || mov.paymentMethod || 'Efectivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span
                      className={`font-black text-base ${
                        mov.type === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {mov.type === 'ingreso' ? '+' : '-'}{' '}
                      {formatCurrency(mov.amount, business?.currency)}
                    </span>

                    {confirmDeleteId === mov.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteCashMovement(mov.id);
                              setFormSuccess('✓ Movimiento eliminado correctamente de la caja.');
                              setTimeout(() => setFormSuccess(''), 3000);
                            } catch (err: any) {
                              console.error(err);
                              setFormError(err?.message || 'Error al eliminar el movimiento');
                            } finally {
                              setConfirmDeleteId(null);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white border border-red-800 text-xs font-black cursor-pointer shadow-xs"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-[#1E3A8A] border-2 border-[#1E3A8A] text-xs font-black cursor-pointer shadow-2xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(mov.id)}
                        className="px-2.5 py-1.5 bg-red-700 hover:bg-red-800 text-white border border-red-800 rounded-lg text-xs font-black flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Eliminar movimiento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <CashMovementModal
          initialDate={safeSelectedDate}
          initialType={modalInitialType}
          onClose={() => setIsModalOpen(false)}
          onSaved={(_id, savedDate, savedType) => {
            if (savedDate) {
              setSelectedDate(savedDate);
            }
            if (savedType === 'gasto' && activeTab === 'ingresos') {
              setActiveTab('gastos');
            } else if (savedType === 'ingreso' && activeTab === 'gastos') {
              setActiveTab('ingresos');
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
