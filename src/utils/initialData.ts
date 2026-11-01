import {
  Business,
  BranchId,
  BranchBusinessConfig,
  ENABLED_PAYMENT_METHOD_OPTIONS,
  Client,
  Service,
  StaffMember,
  Appointment,
  CashMovement,
  Resource,
  GiftCard,
} from '../types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDefaultBranchSettings(): Record<BranchId, BranchBusinessConfig> {
  return {
    sucursal_1: {
      name: 'Soham Montevideo',
      address: 'Montevideo 397, Rosario',
      phone: '',
      whatsapp: '',
      cbuAlias: '',
      mercadoPagoAlias: '',
      mercadoPagoCvu: '',
      mercadoPagoAccessToken: '',
      enabledPaymentMethods: [...ENABLED_PAYMENT_METHOD_OPTIONS],
    },
    sucursal_2: {
      name: 'Soham Rioja',
      address: 'Rioja 2954, Rosario',
      phone: '',
      whatsapp: '',
      cbuAlias: '',
      mercadoPagoAlias: '',
      mercadoPagoCvu: '',
      mercadoPagoAccessToken: '',
      enabledPaymentMethods: [...ENABLED_PAYMENT_METHOD_OPTIONS],
    },
  };
}

export function getBranchBusinessConfig(
  business: Business | null | undefined,
  branchId: BranchId
): BranchBusinessConfig {
  const defaults = getDefaultBranchSettings()[branchId];
  const saved = business?.branchSettings?.[branchId];
  if (saved) {
    return {
      name: saved.name || defaults.name,
      address: saved.address ?? defaults.address,
      phone: saved.phone ?? '',
      whatsapp: saved.whatsapp ?? '',
      cbuAlias: saved.cbuAlias ?? '',
      mercadoPagoAlias: saved.mercadoPagoAlias ?? '',
      mercadoPagoCvu: saved.mercadoPagoCvu ?? '',
      mercadoPagoAccessToken: saved.mercadoPagoAccessToken ?? '',
      enabledPaymentMethods:
        Array.isArray(saved.enabledPaymentMethods) && saved.enabledPaymentMethods.length > 0
          ? saved.enabledPaymentMethods
          : [...ENABLED_PAYMENT_METHOD_OPTIONS],
    };
  }

  // Legacy fallback only for sucursal_1 if branchSettings was never initialized yet
  if (branchId === 'sucursal_1' && business && !business.branchSettings) {
    return {
      ...defaults,
      phone: business.phone || '',
      whatsapp: business.phone || '',
      cbuAlias: business.cbuAlias || '',
      mercadoPagoAlias: business.mercadoPagoAlias || '',
      mercadoPagoCvu: business.mercadoPagoCvu || '',
      mercadoPagoAccessToken: business.mercadoPagoAccessToken || '',
    };
  }

  return defaults;
}

export function getDefaultBusiness(ownerId: string, businessName = 'Tu Agenda Lista'): Business {
  const today = getTodayDateString();
  return {
    id: `biz_${ownerId.slice(0, 10)}`,
    ownerId,
    name: businessName,
    category: 'Centro de Estética & Salud Integral',
    phone: '',
    address: 'Montevideo 397 / Rioja 2954, Rosario',
    currency: '$',
    cbuAlias: '',
    phoneCountryPrefix: '+54',
    mercadoPagoAlias: '',
    mercadoPagoCvu: '',
    mercadoPagoAccessToken: '',
    branchSettings: getDefaultBranchSettings(),
    defaultDepositPercentage: 30,
    defaultSlotMinutes: 30,
    themeColor: '#D4AF37',
    themeName: 'Oro Metálico & Obsidian (Oficial)',
    developerName: 'Iris Quiroz',
    tagline: 'Desarrollado por Iris Quiroz',
    cleanStartVersion: '2026-10-31',
    createdAt: today,
    updatedAt: today,
  };
}

export function getDefaultServices(_businessId: string): Service[] {
  return [];
}

export function getDefaultStaff(_businessId: string): StaffMember[] {
  return [];
}

export function getDefaultResources(_businessId: string): Resource[] {
  return [];
}

export function getDefaultGiftCards(_businessId: string): GiftCard[] {
  return [];
}

export function getDefaultClients(_businessId: string): Client[] {
  return [];
}

export function getDefaultAppointments(_businessId: string): Appointment[] {
  return [];
}

export function getDefaultCashMovements(_businessId: string): CashMovement[] {
  return [];
}
