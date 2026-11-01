import React, { useState } from 'react';
import {
  X,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { CashMovementType, CashMovementCategory, PaymentMethod, BranchId } from '../../types';
import { useApp } from '../../context/AppContext';
import { getTodayDateString, getBranchBusinessConfig } from '../../utils/initialData';

interface CashMovementModalProps {
  initialDate?: string;
  initialType?: CashMovementType;
  onClose: () => void;
  onSaved: (id: string, savedDate?: string, savedType?: CashMovementType) => void;
}

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
};

export function CashMovementModal({
  initialDate,
  initialType = 'ingreso',
  onClose,
  onSaved,
}: CashMovementModalProps) {
  const { createCashMovement, business, activeSingleBranch, branches } = useApp();
  const [branchId, setBranchId] = useState<BranchId>(activeSingleBranch);
  const [date, setDate] = useState(initialDate || getTodayDateString());
  const [type, setType] = useState<CashMovementType>(initialType);
  const [category, setCategory] = useState<CashMovementCategory>(
    initialType === 'gasto' ? 'insumos' : 'turno'
  );
  const [amount, setAmount] = useState<string>('');
  const enabledMethods = getBranchBusinessConfig(business, branchId).enabledPaymentMethods;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    enabledMethods[0] || 'efectivo'
  );
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (newType: CashMovementType) => {
    setErrorMsg('');
    setType(newType);
    if (newType === 'ingreso') {
      setCategory('turno');
    } else {
      setCategory('insumos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericAmount = Number(amount);
    if (!date) {
      setErrorMsg('Por favor seleccioná la fecha del movimiento.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Por favor ingresá el concepto del movimiento.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Por favor ingresá un importe válido mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const effectivePaymentMethod = enabledMethods.includes(paymentMethod)
        ? paymentMethod
        : (enabledMethods[0] || 'efectivo');
      const id = await createCashMovement({
        date,
        branchId,
        type,
        category,
        amount: numericAmount,
        paymentMethod: effectivePaymentMethod,
        description: description.trim(),
      });
      onSaved(id, date, type);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Error al registrar el movimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div
          className={`p-4 sm:p-5 text-white flex items-center justify-between shrink-0 ${
            type === 'ingreso'
              ? 'bg-gradient-to-r from-emerald-700 to-teal-700'
              : 'bg-gradient-to-r from-rose-700 to-red-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              {type === 'ingreso' ? (
                <ArrowDownLeft className="w-5 h-5 text-white" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                {type === 'ingreso' ? 'Registrar Ingreso en Caja' : 'Registrar Gasto en Caja'}
              </h3>
              <p className="text-white/85 text-xs font-medium">
                Completá fecha, concepto, importe, sucursal y medio de pago
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          id="cash-movement-modal-form"
          noValidate
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-black flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleTypeChange('ingreso')}
              className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'ingreso'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Ingreso (+)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('gasto')}
              className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'gasto'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Gasto (-)</span>
            </button>
          </div>

          {/* Sucursal Selector */}
          <div>
            <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Sucursal *</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all border-2 text-center cursor-pointer ${
                    branchId === b.id
                      ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-xs'
                      : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-50'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="text-xs font-black text-[#0F172A] block mb-1">
              Concepto *
            </label>
            <input
              type="text"
              placeholder={
                type === 'ingreso'
                  ? 'Ej. Cobro de turno, venta de producto...'
                  : 'Ej. Compra de insumos, algodón, alquiler...'
              }
              value={description}
              onChange={(e) => {
                setErrorMsg('');
                setDescription(e.target.value);
              }}
              className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
            />
          </div>

          {/* Importe & Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Importe ({business?.currency || '$'}) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Ej. 15000"
                  value={amount}
                  onChange={(e) => {
                    setErrorMsg('');
                    setAmount(e.target.value);
                  }}
                  className="w-full text-sm font-black pl-8 pr-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0F172A] block mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CashMovementCategory)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] capitalize outline-none"
              >
                {(type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat} className="text-[#0F172A] font-bold bg-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Medio de pago *
              </label>
              <select
                value={enabledMethods.includes(paymentMethod) ? paymentMethod : (enabledMethods[0] || 'efectivo')}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] outline-none"
              >
                {enabledMethods.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_LABELS[m] || m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        <div className="sticky bottom-0 bg-white p-4 border-t-2 border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-400 hover:border-black bg-white hover:bg-slate-100 text-[#0F172A] font-black text-xs shadow-2xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="cash-movement-modal-form"
            disabled={isSubmitting}
            className={`px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              type === 'ingreso'
                ? 'bg-[#1E3A8A] hover:bg-[#172554]'
                : 'bg-rose-700 hover:bg-rose-800'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSubmitting ? 'Guardando...' : 'Registrar movimiento'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
