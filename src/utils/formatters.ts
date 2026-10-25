export function formatCurrency(amount: number, currency = '$'): string {
  const formatted = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `${currency} ${formatted}`;
}

export function formatDateSpanish(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateSpanishLong(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function cleanPhoneForWhatsApp(phone: string, countryPrefix = '+54'): string {
  if (!phone) return '';
  // Clean prefix: remove +, spaces, dashes
  const cleanPrefix = (countryPrefix || '+54').replace(/\D/g, '') || '54';
  let cleaned = phone.replace(/\D/g, '');

  if (!cleaned) return '';

  // If already starts with prefix
  if (cleaned.startsWith(cleanPrefix)) {
    // For Argentina (54), ensure mobile 9 is present
    if (cleanPrefix === '54' && !cleaned.startsWith('549')) {
      const rest = cleaned.substring(2);
      if (rest.length === 10) return '549' + rest;
    }
    return cleaned;
  }

  // If national prefix starts with 0 (e.g., 011...)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Argentina special mobile format (needs 549 before 10-digit number)
  if (cleanPrefix === '54') {
    if (cleaned.length === 10) {
      return '549' + cleaned;
    }
    return '54' + cleaned;
  }

  return cleanPrefix + cleaned;
}

export function buildWhatsAppTurnoMessage(
  appointment: { clientName: string; serviceName: string; date: string; time: string },
  _businessName?: string
): string {
  const formattedDate = formatDateSpanish(appointment.date);
  return `Hola ${appointment.clientName}, te confirmamos tu turno para ${appointment.serviceName} el día ${formattedDate} a las ${appointment.time} hs.`;
}

export function openWhatsAppTurno(
  appointment: { clientName: string; clientPhone: string; serviceName: string; date: string; time: string },
  countryPrefix = '+54',
  customMessage?: string
): { success: boolean; url: string; phone: string } {
  const cleanPhone = cleanPhoneForWhatsApp(appointment.clientPhone, countryPrefix);
  if (!cleanPhone) {
    return { success: false, url: '', phone: '' };
  }
  const message = customMessage || buildWhatsAppTurnoMessage(appointment);
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.error('Error opening WhatsApp URL:', e);
  }

  return { success: true, url, phone: cleanPhone };
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'confirmado':
      return {
        label: 'Confirmado',
        bg: 'bg-emerald-50 text-[#0F172A] border-emerald-300 font-black',
        dot: 'bg-emerald-600',
      };
    case 'pendiente':
      return {
        label: 'Pendiente',
        bg: 'bg-blue-50 text-[#0F172A] border-blue-300 font-black',
        dot: 'bg-blue-600',
      };
    case 'completado':
      return {
        label: 'Completado',
        bg: 'bg-sky-50 text-[#0F172A] border-sky-300 font-black',
        dot: 'bg-sky-600',
      };
    case 'cancelado':
      return {
        label: 'Cancelado',
        bg: 'bg-rose-50 text-[#0F172A] border-rose-300 font-black',
        dot: 'bg-rose-600',
      };
    case 'en_espera':
      return {
        label: 'En espera',
        bg: 'bg-purple-50 text-[#0F172A] border-purple-300 font-black',
        dot: 'bg-purple-600',
      };
    default:
      return {
        label: status,
        bg: 'bg-slate-100 text-[#0F172A] border-slate-300 font-black',
        dot: 'bg-slate-500',
      };
  }
}
