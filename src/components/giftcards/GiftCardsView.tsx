import React, { useState, useMemo } from 'react';
import {
  Gift,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Send,
  Building2,
  Sparkles,
  DollarSign,
  User,
  Trash2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { GiftCard, BranchId } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateSpanish } from '../../utils/formatters';
import { GiftCardModal } from './GiftCardModal';

export function GiftCardsView() {
  const { allGiftCards, redeemGiftCard, deleteGiftCard, staff, selectedBranch, business } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'activa' | 'canjeada' | 'vencida'>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fast redemption box state
  const [redemptionCode, setRedemptionCode] = useState('');
  const [selectedStaffForRedeem, setSelectedStaffForRedeem] = useState<string>(staff[0]?.id || '');
  const [selectedBranchForRedeem, setSelectedBranchForRedeem] = useState<BranchId>(selectedBranch);
  const [redemptionNotes, setRedemptionNotes] = useState('');
  const [redemptionFeedback, setRedemptionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Quick lookup of the voucher being entered in fast redemption box
  const lookupCard = useMemo(() => {
    const clean = redemptionCode.trim().toUpperCase();
    if (!clean) return null;
    return allGiftCards.find((c) => c.code.trim().toUpperCase() === clean) || null;
  }, [redemptionCode, allGiftCards]);

  // Handle fast redemption submit
  const handleFastRedemption = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedemptionFeedback(null);

    if (!redemptionCode.trim()) {
      setRedemptionFeedback({
        type: 'error',
        message: 'Ingresá un código de voucher para canjear.',
      });
      return;
    }

    try {
      const chosenStaff = staff.find((s) => s.id === selectedStaffForRedeem);
      const result = await redeemGiftCard(redemptionCode, {
        branchId: selectedBranchForRedeem,
        staffId: chosenStaff?.id,
        staffName: chosenStaff?.name,
        notes: redemptionNotes.trim() || undefined,
      });

      setRedemptionFeedback({
        type: 'success',
        message: `¡Voucher ${result.giftCard.code} canjeado con éxito para ${result.giftCard.recipientName}! Registrado en auditoría.`,
      });
      setRedemptionCode('');
      setRedemptionNotes('');
    } catch (err: any) {
      setRedemptionFeedback({
        type: 'error',
        message: err.message || 'Error al canjear el voucher.',
      });
    }
  };

  // Filtered gift cards
  const filteredCards = useMemo(() => {
    return allGiftCards.filter((card) => {
      // Status filter
      if (statusFilter !== 'todas' && card.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = card.code.toLowerCase().includes(q);
        const matchRecipient = card.recipientName.toLowerCase().includes(q);
        const matchBuyer = card.buyerName.toLowerCase().includes(q);
        const matchService = (card.serviceName || '').toLowerCase().includes(q);
        if (!matchCode && !matchRecipient && !matchBuyer && !matchService) {
          return false;
        }
      }
      return true;
    });
  }, [allGiftCards, statusFilter, searchQuery]);

  // Metrics
  const totalCount = allGiftCards.length;
  const activeCards = allGiftCards.filter((c) => c.status === 'activa');
  const activeCount = activeCards.length;
  const redeemedCount = allGiftCards.filter((c) => c.status === 'canjeada').length;
  const totalActiveAmount = activeCards.reduce((sum, c) => sum + (c.amount || 0), 0);

  // Generate WhatsApp Share Message
  const getWhatsAppShareText = (card: GiftCard) => {
    const branchText =
      card.branchId === 'ambas'
        ? 'Soham Montevideo o Soham Rioja'
        : card.branchId === 'sucursal_2'
        ? 'Soham Rioja (Rioja 2954, Rosario)'
        : 'Soham Montevideo (Montevideo 1420)';

    const giftDetail =
      card.type === 'tratamiento'
        ? card.serviceName || 'Tratamiento Especial'
        : `${formatCurrency(card.amount || 0, business?.currency)} en servicios y tratamientos`;

    const dedicatoria = card.message ? `\n\n💬 *Mensaje:* "${card.message}"` : '';

    return (
      `✨ *¡TENÉS UNA GIFT CARD SOHAM!* ✨\n\n` +
      `Hola *${card.recipientName}*, te regalaron una experiencia de bienestar y belleza Soham de parte de *${card.buyerName}*.\n\n` +
      `🎁 *Tu Regalo:* ${giftDetail}\n` +
      `🔑 *Código de Voucher:* *${card.code}*\n` +
      `📍 *Válido en:* ${branchText}\n` +
      `📅 *Válido hasta:* ${card.expiryDate ? formatDateSpanish(card.expiryDate) : 'Consultar en recepción'}` +
      `${dedicatoria}\n\n` +
      `Para coordinar tu turno, escribinos a nuestro WhatsApp indicando este código. ¡Te esperamos en Soham!`
    );
  };

  const handleShareWhatsApp = (card: GiftCard) => {
    const text = encodeURIComponent(getWhatsAppShareText(card));
    const phone = (card.recipientPhone || card.buyerPhone || '').replace(/\D/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[#0F172A]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-200">
              <Gift className="w-6 h-6 stroke-[2.5]" />
            </span>
            <div>
              <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                Gift Cards & Vouchers de Regalo
              </h2>
              <p className="text-xs text-slate-700 font-bold">
                Gestión, emisión y canje protegido para Soham Montevideo y Soham Rioja
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 active:scale-98 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nueva Gift Card</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-2xs">
          <span className="text-xs font-bold text-slate-700 block">Total Emitidas</span>
          <span className="text-2xl font-black text-[#0F172A] block mt-1">{totalCount}</span>
          <span className="text-[11px] text-slate-600 font-semibold block mt-0.5">Historial acumulado</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-2xs">
          <span className="text-xs font-bold text-emerald-800 block">Activas para Canjear</span>
          <span className="text-2xl font-black text-emerald-700 block mt-1">{activeCount}</span>
          <span className="text-[11px] text-emerald-800 font-bold block mt-0.5">
            {formatCurrency(totalActiveAmount, business?.currency)} disponible
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-2xs">
          <span className="text-xs font-bold text-blue-800 block">Vouchers Canjeados</span>
          <span className="text-2xl font-black text-blue-900 block mt-1">{redeemedCount}</span>
          <span className="text-[11px] text-blue-700 font-bold block mt-0.5">Servicios disfrutados</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-2xs">
          <span className="text-xs font-bold text-slate-700 block">Control Antifraude</span>
          <span className="text-sm font-black text-[#0F172A] block mt-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            Bloqueo de Doble Canje
          </span>
          <span className="text-[11px] text-slate-600 font-semibold block mt-0.5">Auditoría con fecha y sucursal</span>
        </div>
      </div>

      {/* Fast Redemption Panel (Buscador y Canje Rápido en Recepción) */}
      <div className="bg-white p-5 rounded-2xl border-2 border-[#1E3A8A] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1E3A8A] stroke-[2.5]" />
            <h3 className="text-sm font-black text-[#0F172A]">
              Canje Rápido de Voucher en Recepción
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300">
            Valida al instante y evita duplicados
          </span>
        </div>

        <form onSubmit={handleFastRedemption} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Input Código */}
            <div className="sm:col-span-4">
              <label className="text-xs font-bold text-[#0F172A] block mb-1">
                Ingresá o pegá el Código del Voucher *
              </label>
              <input
                type="text"
                placeholder="Ej. SOHAM-884912"
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-black text-sm text-[#0F172A] uppercase placeholder-slate-400 focus:border-[#1E3A8A] outline-none"
              />
            </div>

            {/* Profesional que atiende */}
            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-[#0F172A] block mb-1">
                Profesional que atiende
              </label>
              <select
                value={selectedStaffForRedeem}
                onChange={(e) => setSelectedStaffForRedeem(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs text-[#0F172A] focus:border-[#1E3A8A] outline-none cursor-pointer"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Sucursal donde se canjea */}
            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-[#0F172A] block mb-1">
                Sucursal de atención
              </label>
              <select
                value={selectedBranchForRedeem}
                onChange={(e) => setSelectedBranchForRedeem(e.target.value as BranchId)}
                className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs text-[#0F172A] focus:border-[#1E3A8A] outline-none cursor-pointer"
              >
                <option value="sucursal_1">Soham Montevideo</option>
                <option value="sucursal_2">Soham Rioja</option>
              </select>
            </div>

            {/* Botón Canjear */}
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 px-3 bg-[#1E3A8A] hover:bg-blue-900 active:scale-98 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Canjear</span>
              </button>
            </div>
          </div>

          {/* Quick Realtime Preview of Lookup Card */}
          {lookupCard && (
            <div
              className={`p-3.5 rounded-xl border-2 transition-all ${
                lookupCard.status === 'activa'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : lookupCard.status === 'canjeada'
                  ? 'bg-rose-50 border-rose-400 text-rose-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {lookupCard.status === 'activa' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 stroke-[2.5]" />
                  )}
                  <div>
                    <span className="font-black text-xs block">
                      {lookupCard.code} — Para: <strong>{lookupCard.recipientName}</strong> (De: {lookupCard.buyerName})
                    </span>
                    <span className="text-[11px] block font-bold">
                      {lookupCard.type === 'tratamiento'
                        ? `Tratamiento: ${lookupCard.serviceName || 'Servicio'}`
                        : `Monto: ${formatCurrency(lookupCard.amount || 0, business?.currency)}`}
                      {' · '}
                      Sucursal permitida:{' '}
                      {lookupCard.branchId === 'ambas'
                        ? 'Ambas (Montevideo & Rioja)'
                        : lookupCard.branchId === 'sucursal_2'
                        ? 'Soham Rioja'
                        : 'Soham Montevideo'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {lookupCard.status === 'activa' && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 font-black text-xs">
                      Listo para Canjear
                    </span>
                  )}
                  {lookupCard.status === 'canjeada' && (
                    <div className="text-xs font-black text-rose-700 bg-rose-200 px-3 py-1 rounded-lg">
                      ¡YA CANJEADO el {lookupCard.redeemedDate} en {lookupCard.redeemedBranchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'}!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Feedback Message */}
          {redemptionFeedback && (
            <div
              className={`p-3 rounded-xl border-2 text-xs font-black flex items-center gap-2 ${
                redemptionFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {redemptionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 stroke-[2.5] shrink-0" />
              )}
              <span>{redemptionFeedback.message}</span>
            </div>
          )}
        </form>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-[#0F172A]">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por código, agasajado o comprador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-[#0F172A] placeholder-slate-400 focus:border-[#1E3A8A] outline-none"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['todas', 'activa', 'canjeada', 'vencida'] as const).map((tab) => {
            const isActive = statusFilter === tab;
            const labels: Record<string, string> = {
              todas: 'Todas',
              activa: 'Activas',
              canjeada: 'Canjeadas',
              vencida: 'Vencidas',
            };
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white shadow-2xs'
                    : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {filteredCards.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border-2 border-slate-300 text-slate-700 space-y-3">
            <Gift className="w-12 h-12 text-slate-400 mx-auto" />
            <h4 className="text-base font-black text-[#0F172A]">No se encontraron Gift Cards</h4>
            <p className="text-xs text-slate-600 font-bold max-w-sm mx-auto">
              Podés emitir un nuevo voucher para regalar por monto en pesos o por un tratamiento específico.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-2 px-4 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Emitir Primer Voucher</span>
            </button>
          </div>
        ) : (
          filteredCards.map((card) => {
            const isRedeemed = card.status === 'canjeada';
            const isExpired = card.status === 'vencida';
            const isActive = card.status === 'activa';

            return (
              <div
                key={card.id}
                className={`bg-white rounded-2xl border-2 p-4 sm:p-5 shadow-2xs transition-all ${
                  isActive
                    ? 'border-emerald-300 hover:border-emerald-500'
                    : isRedeemed
                    ? 'border-slate-300 bg-slate-50/50'
                    : 'border-rose-300 bg-rose-50/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Code, Status & Protagonists */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm sm:text-base font-black px-2.5 py-1 rounded-lg bg-slate-900 text-white tracking-wider flex items-center gap-1.5 shadow-2xs">
                        <Gift className="w-4 h-4 text-amber-400" />
                        {card.code}
                      </span>

                      {/* Status Badge */}
                      {isActive && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                          ● Activa
                        </span>
                      )}
                      {isRedeemed && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-200 text-slate-800 border border-slate-300">
                          ✓ Canjeada
                        </span>
                      )}
                      {isExpired && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                          ✕ Vencida
                        </span>
                      )}

                      {/* Branch Scope */}
                      <span className="text-xs font-bold text-[#0F172A] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
                        {card.branchId === 'ambas'
                          ? 'Soham Ambas Sucursales'
                          : card.branchId === 'sucursal_2'
                          ? 'Soham Rioja'
                          : 'Soham Montevideo'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#0F172A] space-y-0.5">
                      <div>
                        Para: <strong className="text-sm font-black text-slate-900">{card.recipientName}</strong>
                        {card.recipientPhone && <span className="text-slate-600 font-semibold ml-1.5">({card.recipientPhone})</span>}
                      </div>
                      <div className="text-slate-700">
                        Comprado por: <strong>{card.buyerName}</strong>
                        {card.buyerPhone && <span className="text-slate-600 font-semibold ml-1.5">({card.buyerPhone})</span>}
                      </div>
                      {card.message && (
                        <p className="text-slate-600 italic font-medium pt-1">
                          "{card.message}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Gift Value / Treatment */}
                  <div className="lg:text-right space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 lg:bg-transparent lg:border-0 lg:p-0">
                    <span className="text-xs font-bold text-slate-600 block">Beneficio</span>
                    <span className="text-lg sm:text-xl font-black text-[#1E3A8A] block">
                      {card.type === 'tratamiento'
                        ? card.serviceName || 'Tratamiento'
                        : formatCurrency(card.amount || 0, business?.currency)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      Emitido el {formatDateSpanish(card.issueDate)}
                      {card.expiryDate && ` · Vence: ${formatDateSpanish(card.expiryDate)}`}
                    </span>

                    {/* Audit trail if redeemed */}
                    {isRedeemed && (
                      <div className="text-[11px] font-bold text-slate-800 bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-300 mt-1 inline-block">
                        Canjeado: {card.redeemedDate} · {card.redeemedBranchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'}
                        {card.redeemedStaffName && ` por ${card.redeemedStaffName}`}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap lg:flex-nowrap">
                    {/* Share WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(card)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Enviar voucher por WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Copy Code */}
                    <button
                      type="button"
                      onClick={() => handleCopyCode(card.code)}
                      className="p-2 bg-white hover:bg-slate-100 border-2 border-slate-300 text-[#0F172A] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Copiar código del voucher"
                    >
                      {copiedCode === card.code ? (
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Quick Redeem button in row */}
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setRedemptionCode(card.code);
                          window.scrollTo({ top: 100, behavior: 'smooth' });
                        }}
                        className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Canjear</span>
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Eliminar la Gift Card ${card.code}?`)) {
                          deleteGiftCard(card.id);
                        }
                      }}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar voucher"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Emit Gift Card Modal */}
      {isModalOpen && (
        <GiftCardModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newId) => {
            const found = allGiftCards.find((c) => c.id === newId);
            if (found) {
              setRedemptionFeedback({
                type: 'success',
                message: `Gift Card ${found.code} creada con éxito. Podés enviarla por WhatsApp al agasajado o comprador.`,
              });
            }
          }}
        />
      )}
    </div>
  );
}
