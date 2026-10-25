import React, { useState } from 'react';
import { X, DollarSign, ArrowUpRight, ArrowDownLeft, Tag, CreditCard, Check, Building2 } from 'lucide-react';
import { CashMovementType, CashMovementCategory, PaymentMethod, BranchId } from '../../types';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/initialData';

interface CashMovementModalProps {
  initialDate?: string;
  initialType?: CashMovementType;
  initialBranchId?: BranchId;
  onClose: () => void;
  onSaved: (id: string) => void;
}

const INCOME_CATEGORIES: CashMovementCategory[] = ['turno', 'seña', 'saldo', 'otro'];
const EXPENSE_CATEGORIES: CashMovementCategory[] = ['insumos', 'alquiler', 'servicios', 'comisiones', 'otro'];

export function CashMovementModal({
  initialDate,
  initialType = 'ingreso',
  initialBranchId,
  onClose,
  onSaved,
}: CashMovementModalProps) {
  const { createCashMovement, business, selectedBranch, branches } = useApp();
  const [branchId, setBranchId] = useState<BranchId>(initialBranchId || selectedBranch);
  const [date, setDate] = useState(initialDate || getTodayDateString());
  const [type, setType] = useState<CashMovementType>(initialType);
  const [category, setCategory] = useState<CashMovementCategory>(initialType === 'ingreso' ? 'turno' : 'insumos');
  const [amount, setAmount] = useState<number>(1000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (newType: CashMovementType) => {
    setType(newType);
    if (newType === 'ingreso') {
      setCategory('turno');
    } else {
      setCategory('insumos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    setIsSubmitting(true);
    try {
      const id = await createCashMovement({
        date,
        branchId,
        type,
        category,
        amount: Number(amount),
        paymentMethod,
        description: description.trim() || (type === 'ingreso' ? 'Ingreso registrado' : 'Gasto registrado'),
      });
      onSaved(id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className={`p-5 text-white flex items-center justify-between ${
          type === 'ingreso' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-rose-600 to-red-600'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              {type === 'ingreso' ? <ArrowDownLeft className="w-5 h-5 text-white" /> : <ArrowUpRight className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {type === 'ingreso' ? 'Nuevo Ingreso a Caja' : 'Nuevo Gasto de Caja'}
              </h3>
              <p className="text-white/80 text-xs">
                Registra movimientos para mantener el arqueo al día
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('ingreso')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === 'ingreso'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Ingreso (+)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('gasto')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === 'gasto'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Gasto (-)</span>
            </button>
          </div>

          {/* Sucursal Selector */}
          <div>
            <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#0F172A]" />
              <span>Sucursal asignada</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all border text-center cursor-pointer ${
                    branchId === b.id
                      ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs'
                      : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-50'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Monto ({business?.currency || '$'}) *
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                min="1"
                step="50"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full text-base font-bold pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#000000] block mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CashMovementCategory)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] capitalize outline-none"
              >
                {(type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat} className="text-[#000000] font-bold bg-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-[#000000] block mb-1">Medio de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] capitalize outline-none"
              >
                <option value="efectivo" className="text-[#000000] font-bold bg-white">Efectivo</option>
                <option value="transferencia" className="text-[#000000] font-bold bg-white">Transferencia</option>
                <option value="mercadopago" className="text-[#000000] font-bold bg-white">Mercado Pago</option>
                <option value="tarjeta" className="text-[#000000] font-bold bg-white">Tarjeta</option>
                <option value="otro" className="text-[#000000] font-bold bg-white">Otro</option>
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-black text-[#000000] block mb-1">Fecha del movimiento</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-black text-[#000000] block mb-1">Descripción o Detalle</label>
            <input
              type="text"
              placeholder={type === 'ingreso' ? 'Ej. Venta de shampoo o propina' : 'Ej. Compra de algodón, café o toallas'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-400 hover:border-black bg-white hover:bg-slate-100 text-[#000000] font-black text-xs shadow-2xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-md flex items-center gap-2 cursor-pointer ${
                type === 'ingreso' ? 'bg-[#1E3A8A] hover:bg-[#172554]' : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Guardando...' : 'Registrar Movimiento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
