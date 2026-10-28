export type AppointmentStatus = 'confirmado' | 'pendiente' | 'completado' | 'cancelado' | 'en_espera';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'mercadopago' | 'pendiente';
export type CashMovementType = 'ingreso' | 'gasto';
export type CashMovementCategory = 'turno' | 'seña' | 'saldo' | 'insumos' | 'alquiler' | 'servicios' | 'comisiones' | 'otro';

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  phone: string;
  address: string;
  currency: string;
  cbuAlias?: string;
  phoneCountryPrefix?: string; // e.g. "+54" (Argentina), "+34" (España), etc.
  mercadoPagoAccessToken?: string; // Production or Test Access Token (APP_USR-...)
  mercadoPagoPublicKey?: string; // Public Key (APP_USR-...)
  mercadoPagoAlias?: string; // e.g. "agenda.turnos.mp"
  mercadoPagoCvu?: string; // 22-digit CVU
  defaultDepositPercentage?: number; // e.g. 30 or 50%
  defaultSlotMinutes: number;
  openingHour?: string; // e.g. "08:00"
  closingHour?: string; // e.g. "20:00"
  themeColor?: string; // Hex color for salon brand identity (e.g. "#D4AF37", "#2563eb", etc.)
  themeName?: string; // e.g. "Oro & Obsidian Luxury"
  developerName?: string; // Strictly fixed: "Iris Quiroz"
  tagline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  birthday?: string;
  totalVisits: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  description: string;
  color: string;
  active: boolean;
  createdAt: string;
}

export type BranchId = 'sucursal_1' | 'sucursal_2';
export type StaffBranchScope = BranchId | 'ambas';

export interface StaffBreak {
  id: string;
  start: string; // e.g. "13:00"
  end: string; // e.g. "14:00"
  description?: string; // e.g. "Almuerzo"
}

export interface StaffBranchShift {
  active: boolean; // ¿Atiende en esta sucursal en este día?
  start: string; // "09:00"
  end: string; // "14:00"
  breaks?: StaffBreak[];
}

export interface StaffDaySchedule {
  day: number; // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
  active: boolean; // ¿Laboral o descanso semanal?
  start: string; // "09:00" (horario habitual / general)
  end: string; // "20:00" (horario habitual / general)
  breaks: StaffBreak[]; // Uno o más descansos
  branchId?: StaffBranchScope; // 'sucursal_1' | 'sucursal_2' | 'ambas'
  branchShifts?: {
    sucursal_1?: StaffBranchShift;
    sucursal_2?: StaffBranchShift;
  };
}

export interface StaffMember {
  id: string;
  businessId: string;
  name: string;
  role: string;
  phone: string;
  color: string;
  branchId?: StaffBranchScope; // 'sucursal_1' | 'sucursal_2' | 'ambas'
  workingDays: number[]; // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string; // "20:00"
  daySchedules?: StaffDaySchedule[]; // Horarios independientes por día con descansos y sucursales
  blockedDates: string[]; // ['2026-10-12', ...]
  active: boolean;
  createdAt: string;
}

export interface Branch {
  id: BranchId;
  name: string;
}

export const BRANCHES: Branch[] = [
  { id: 'sucursal_1', name: 'Soham Montevideo' },
  { id: 'sucursal_2', name: 'Soham Rioja' },
];

export interface Appointment {
  id: string;
  businessId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  branchId?: BranchId; // 'sucursal_1' | 'sucursal_2'
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  price: number;
  depositAmount: number; // Seña
  remainingBalance: number; // price - depositAmount
  color?: string; // Distinctive color for appointment
  status: AppointmentStatus;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashMovement {
  id: string;
  businessId: string;
  branchId?: BranchId; // 'sucursal_1' | 'sucursal_2'
  date: string; // YYYY-MM-DD
  type: CashMovementType;
  category: CashMovementCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  appointmentId?: string;
  createdAt: string;
}

export type ViewTab = 'agenda' | 'clientes' | 'servicios' | 'profesionales' | 'caja' | 'reportes' | 'exportar' | 'configuracion';
export type AgendaMode = 'dia' | 'semana' | 'mes' | 'staff';

export const APPOINTMENT_COLORS = [
  { label: 'Azul Real', hex: '#2563eb' },
  { label: 'Celeste Cielo', hex: '#0284c7' },
  { label: 'Esmeralda', hex: '#059669' },
  { label: 'Violeta', hex: '#7c3aed' },
  { label: 'Rosa Glam', hex: '#db2777' },
  { label: 'Ámbar Cálido', hex: '#d97706' },
  { label: 'Coral', hex: '#ea580c' },
  { label: 'Grafito', hex: '#475569' },
];

export interface ThemeColorOption {
  id: string;
  name: string;
  hex: string;
  category: string;
}

export const THEME_COLOR_OPTIONS: ThemeColorOption[] = [
  { id: 'gold', name: 'Oro Metálico & Obsidian (Oficial)', hex: '#D4AF37', category: 'Alta Gama / Monograma' },
  { id: 'blue', name: 'Azul Real & Índigo', hex: '#2563eb', category: 'Salud & Consultorio' },
  { id: 'emerald', name: 'Esmeralda Botanicals', hex: '#059669', category: 'Spa & Relax' },
  { id: 'pink', name: 'Rosa Glam & Magenta', hex: '#ec4899', category: 'Uñas & Manicuría' },
  { id: 'violet', name: 'Lavanda & Violeta Intenso', hex: '#7c3aed', category: 'Estética Facial & Corporal' },
  { id: 'dark', name: 'Grafito & Acero Negro', hex: '#334155', category: 'Moderno & Sobrio' },
];

export interface BusinessConfigExport {
  version: string;
  schema: 'TuAgendaLista_Config';
  exportedAt: string;
  business: {
    name: string;
    category: string;
    phone: string;
    phoneCountryPrefix?: string;
    address: string;
    currency: string;
    cbuAlias?: string;
    mercadoPagoAccessToken?: string;
    mercadoPagoAlias?: string;
    mercadoPagoCvu?: string;
    defaultDepositPercentage?: number;
    defaultSlotMinutes: number;
    openingHour?: string;
    closingHour?: string;
    themeColor?: string;
    themeName?: string;
  };
  colors?: {
    primary: string;
    themeName?: string;
    palette?: string[];
  };
  services: Array<Omit<Service, 'businessId' | 'createdAt'>>;
  staff: Array<Omit<StaffMember, 'businessId' | 'createdAt'>>;
  license: {
    developer: 'Iris Quiroz';
    type: 'SaaS Multi-Cliente PRO';
    status: 'ACTIVE_VERIFIED';
    protected: true;
  };
}
