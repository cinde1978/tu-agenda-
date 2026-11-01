import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Phone,
  MapPin,
  DollarSign,
  CreditCard,
  Check,
  Award,
  Key,
  Eye,
  EyeOff,
  QrCode,
  Palette,
  ShieldCheck,
  Clock,
  ExternalLink,
  Users,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  CalendarDays,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WhatsAppIcon, MercadoPagoIcon } from './icons';
import {
  THEME_COLOR_OPTIONS,
  StaffMember,
  Service,
  BranchId,
  BranchBusinessConfig,
  PaymentMethod,
  ENABLED_PAYMENT_METHOD_OPTIONS,
  SERVICE_CATEGORY_PRESETS,
} from '../types';
import { StaffModal } from './staff/StaffModal';
import { ServiceModal } from './services/ServiceModal';
import { formatCurrency } from '../utils/formatters';
import { getBranchBusinessConfig } from '../utils/initialData';
import {
  ALL_WEEK_DAYS,
  DAY_LABELS,
  createEmptyWeeklySchedules,
  getStaffDaySchedule,
  getStaffEffectiveShift,
  formatShiftRanges,
} from '../utils/staffSchedule';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia Bancaria',
  mercadopago: 'Mercado Pago',
  tarjeta: 'Tarjeta de Débito / Crédito',
  pendiente: 'Pendiente',
};

const OWNER_WHATSAPP_DISPLAY = '3413540643';
const OWNER_WHATSAPP_WA = '5493413540643';
const SUBSCRIPTION_WHATSAPP_URL = `https://wa.me/${OWNER_WHATSAPP_WA}?text=${encodeURIComponent(
  'Hola Iris, quiero contratar la suscripción mensual de $45.000 de Tu Agenda Lista.'
)}`;
const CONSULTATION_WHATSAPP_URL = `https://wa.me/${OWNER_WHATSAPP_WA}?text=${encodeURIComponent(
  'Hola Iris, quiero realizar una consulta comercial sobre Tu Agenda Lista.'
)}`;

export type SettingsSubTab = 'suscripcion' | 'profesionales' | 'servicios' | 'negocio' | 'todos';

interface SettingsViewProps {
  initialTab?: SettingsSubTab;
  focusSeq?: number;
}

export function SettingsView({ initialTab = 'suscripcion', focusSeq }: SettingsViewProps = {}) {
  const {
    business,
    updateBusiness,
    loginWithGoogle,
    isDemoMode,
    staff,
    createStaff,
    deleteStaff,
    services,
    createService,
    updateService,
    deleteService,
    appointments,
    allAppointments,
    allCashMovements,
    allGiftCards,
    activeSingleBranch,
  } = useApp();

  // Navigation tab inside Settings
  const [activeTab, setActiveTab] = useState<SettingsSubTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, focusSeq]);

  // Quick inline add states for Staff
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [isQuickAddingStaff, setIsQuickAddingStaff] = useState(false);

  // Quick inline add states for Services
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState<string>(SERVICE_CATEGORY_PRESETS[0]);
  const [newServiceDuration, setNewServiceDuration] = useState(45);
  const [newServicePrice, setNewServicePrice] = useState(6000);
  const [isQuickAddingService, setIsQuickAddingService] = useState(false);

  // Modals inside Settings for advanced editing
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('todos');

  // Internal confirmation states (no window.confirm)
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<string | null>(null);
  const [confirmClearSample, setConfirmClearSample] = useState<'staff' | 'services' | null>(null);

  // Local form state for general business settings + independent per-branch settings
  const [name, setName] = useState(business?.name || 'Tu Agenda Lista');
  const [category, setCategory] = useState(business?.category || 'Centro de Estética & Salud Integral');
  const [phoneCountryPrefix, setPhoneCountryPrefix] = useState(business?.phoneCountryPrefix || '+54');
  const [currency, setCurrency] = useState(business?.currency || '$');
  const [defaultDepositPercentage, setDefaultDepositPercentage] = useState(business?.defaultDepositPercentage || 30);
  const [showToken, setShowToken] = useState(false);
  const [defaultSlotMinutes, setDefaultSlotMinutes] = useState(business?.defaultSlotMinutes || 30);
  const [themeColor, setThemeColor] = useState(business?.themeColor || '#D4AF37');
  const [themeName, setThemeName] = useState(business?.themeName || 'Oro Metálico & Obsidian (Oficial)');

  const [settingsBranch, setSettingsBranch] = useState<BranchId>(activeSingleBranch);
  const [branchConfigs, setBranchConfigs] = useState<Record<BranchId, BranchBusinessConfig>>(() => ({
    sucursal_1: getBranchBusinessConfig(business, 'sucursal_1'),
    sucursal_2: getBranchBusinessConfig(business, 'sucursal_2'),
  }));

  const [isSaved, setIsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  // Sync state whenever business updates
  useEffect(() => {
    if (business) {
      setName(business.name || 'Tu Agenda Lista');
      setCategory(business.category || 'Centro de Estética & Salud Integral');
      setPhoneCountryPrefix(business.phoneCountryPrefix || '+54');
      setCurrency(business.currency || '$');
      setDefaultDepositPercentage(business.defaultDepositPercentage || 30);
      setDefaultSlotMinutes(business.defaultSlotMinutes || 30);
      setThemeColor(business.themeColor || '#D4AF37');
      setThemeName(business.themeName || 'Oro Metálico & Obsidian (Oficial)');
      setBranchConfigs({
        sucursal_1: getBranchBusinessConfig(business, 'sucursal_1'),
        sucursal_2: getBranchBusinessConfig(business, 'sucursal_2'),
      });
    }
  }, [business]);

  const currentBranchCfg = branchConfigs[settingsBranch];

  const updateCurrentBranchField = <K extends keyof BranchBusinessConfig>(
    field: K,
    value: BranchBusinessConfig[K]
  ) => {
    setSettingsError('');
    setBranchConfigs((prev) => ({
      ...prev,
      [settingsBranch]: {
        ...prev[settingsBranch],
        [field]: value,
      },
    }));
  };

  const toggleBranchPaymentMethod = (method: PaymentMethod) => {
    setSettingsError('');
    const current = currentBranchCfg.enabledPaymentMethods || [];
    const exists = current.includes(method);
    if (exists && current.length <= 1) {
      setSettingsError('Cada sucursal debe mantener al menos un medio de pago habilitado.');
      return;
    }
    const next = exists ? current.filter((m) => m !== method) : [...current, method];
    updateCurrentBranchField('enabledPaymentMethods', next);
  };

  // Handle Quick Add Staff (without imposing predetermined working days or hours)
  const handleQuickAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    setIsQuickAddingStaff(true);
    try {
      await createStaff({
        name: newStaffName.trim(),
        role: newStaffRole.trim() || 'Especialista',
        phone: newStaffPhone.trim(),
        color: '#1E3A8A',
        branchId: 'ambas',
        workingDays: [],
        workingHoursStart: '',
        workingHoursEnd: '',
        daySchedules: createEmptyWeeklySchedules('ambas'),
        blockedDates: [],
        active: true,
      });
      setNewStaffName('');
      setNewStaffRole('');
      setNewStaffPhone('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuickAddingStaff(false);
    }
  };

  // Handle Quick Add Service
  const handleQuickAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    setIsQuickAddingService(true);
    try {
      await createService({
        name: newServiceName.trim(),
        category: newServiceCategory.trim() || 'General',
        durationMinutes: Number(newServiceDuration) || 30,
        price: Number(newServicePrice) || 0,
        description: '',
        color: '#1E3A8A',
        active: true,
      });
      setNewServiceName('');
      setNewServicePrice(6000);
      setNewServiceDuration(45);
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuickAddingService(false);
    }
  };

  const executeClearSampleStaff = async () => {
    for (const member of staff) {
      if (
        member.id.startsWith('stf_sample') ||
        ['Camila Rossi', 'Valeria Gómez', 'Lucas Medina', 'Valentina Rivas', 'Lucía Fernández', 'Mateo Benítez'].some((n) => member.name.includes(n))
      ) {
        await deleteStaff(member.id);
      }
    }
    setConfirmClearSample(null);
  };

  const executeClearSampleServices = async () => {
    for (const srv of services) {
      if (
        srv.id.startsWith('srv_sample') ||
        [
          'Limpieza Facial Profunda',
          'Lifting de Pestañas + Tinte',
          'Semipermanente con Kapping',
          'Masaje Descontracturante / Relajante',
          'Tratamiento Corporal Reductor / Modelador',
          'Corte & Peinado',
          'Coloración Completa / Balayage',
          'Perfilado de Barba',
        ].some((n) => srv.name.includes(n))
      ) {
        await deleteService(srv.id);
      }
    }
    setConfirmClearSample(null);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    const cleanS1: BranchBusinessConfig = {
      name: 'Soham Montevideo',
      address: branchConfigs.sucursal_1.address.trim() || 'Montevideo 397, Rosario',
      phone: branchConfigs.sucursal_1.phone.trim(),
      whatsapp: branchConfigs.sucursal_1.whatsapp.trim(),
      cbuAlias: branchConfigs.sucursal_1.cbuAlias.trim(),
      mercadoPagoAlias: branchConfigs.sucursal_1.mercadoPagoAlias.trim(),
      mercadoPagoCvu: branchConfigs.sucursal_1.mercadoPagoCvu.trim(),
      mercadoPagoAccessToken: branchConfigs.sucursal_1.mercadoPagoAccessToken.trim(),
      enabledPaymentMethods:
        branchConfigs.sucursal_1.enabledPaymentMethods.length > 0
          ? branchConfigs.sucursal_1.enabledPaymentMethods
          : [...ENABLED_PAYMENT_METHOD_OPTIONS],
    };
    const cleanS2: BranchBusinessConfig = {
      name: 'Soham Rioja',
      address: branchConfigs.sucursal_2.address.trim() || 'Rioja 2954, Rosario',
      phone: branchConfigs.sucursal_2.phone.trim(),
      whatsapp: branchConfigs.sucursal_2.whatsapp.trim(),
      cbuAlias: branchConfigs.sucursal_2.cbuAlias.trim(),
      mercadoPagoAlias: branchConfigs.sucursal_2.mercadoPagoAlias.trim(),
      mercadoPagoCvu: branchConfigs.sucursal_2.mercadoPagoCvu.trim(),
      mercadoPagoAccessToken: branchConfigs.sucursal_2.mercadoPagoAccessToken.trim(),
      enabledPaymentMethods:
        branchConfigs.sucursal_2.enabledPaymentMethods.length > 0
          ? branchConfigs.sucursal_2.enabledPaymentMethods
          : [...ENABLED_PAYMENT_METHOD_OPTIONS],
    };

    await updateBusiness({
      name: name.trim() || 'Tu Agenda Lista',
      developerName: 'Iris Quiroz',
      tagline: 'Desarrollado por Iris Quiroz',
      themeColor,
      themeName,
      category: category.trim(),
      phone: cleanS1.phone,
      phoneCountryPrefix: phoneCountryPrefix.trim() || '+54',
      address: `${cleanS1.address} / ${cleanS2.address}`,
      currency: currency.trim() || '$',
      cbuAlias: cleanS1.cbuAlias,
      mercadoPagoAccessToken: cleanS1.mercadoPagoAccessToken,
      mercadoPagoAlias: cleanS1.mercadoPagoAlias,
      mercadoPagoCvu: cleanS1.mercadoPagoCvu,
      branchSettings: {
        sucursal_1: cleanS1,
        sucursal_2: cleanS2,
      },
      defaultDepositPercentage: Number(defaultDepositPercentage) || 30,
      defaultSlotMinutes: Number(defaultSlotMinutes),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const getServiceLinkedSummary = (srv: Service) => {
    const sourceApts = Array.isArray(allAppointments) ? allAppointments : appointments;
    const linkedTurns = sourceApts.filter(
      (a) => a.serviceId === srv.id || a.serviceName.trim().toLowerCase() === srv.name.trim().toLowerCase()
    );
    const linkedGiftCards = (allGiftCards || []).filter(
      (g) => g.serviceId === srv.id || (g.serviceName && g.serviceName.trim().toLowerCase() === srv.name.trim().toLowerCase())
    );
    const linkedCash = (allCashMovements || []).filter(
      (m) => m.description && m.description.toLowerCase().includes(srv.name.trim().toLowerCase())
    );
    return {
      turns: linkedTurns.length,
      giftCards: linkedGiftCards.length,
      cash: linkedCash.length,
      hasLinks: linkedTurns.length > 0 || linkedGiftCards.length > 0 || linkedCash.length > 0,
    };
  };

  const handleToggleServiceActive = async (srv: Service) => {
    await updateService({
      ...srv,
      active: !srv.active,
    });
  };

  const hasSampleStaff = staff.some(
    (s) =>
      s.id.startsWith('stf_sample') ||
      ['Camila Rossi', 'Valeria Gómez', 'Lucas Medina', 'Valentina Rivas', 'Lucía Fernández', 'Mateo Benítez'].some((n) => s.name.includes(n))
  );

  const hasSampleServices = services.some(
    (s) =>
      s.id.startsWith('srv_sample') ||
      [
        'Limpieza Facial Profunda',
        'Lifting de Pestañas + Tinte',
        'Semipermanente con Kapping',
        'Masaje Descontracturante / Relajante',
        'Tratamiento Corporal Reductor / Modelador',
        'Corte',
        'Balayage',
      ].some((n) => s.name.includes(n))
  );

  const serviceCategories = [
    'todos',
    ...Array.from(new Set([...SERVICE_CATEGORY_PRESETS, ...services.map((s) => s.category).filter(Boolean)])),
  ];
  const filteredServices = services.filter((s) => {
    if (selectedServiceCategory === 'todos') return true;
    return s.category === selectedServiceCategory;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-[#000000]">
      {/* Selector de sub-sección con alto contraste y bordes visibles */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-300 overflow-x-auto shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('suscripcion')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'suscripcion'
              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
              : 'bg-slate-100 text-[#0F172A] border-slate-300 hover:bg-white hover:border-slate-500'
          }`}
        >
          <Award className="w-4 h-4 stroke-[2.5] text-[#D4AF37]" />
          <span>Suscripción & Plan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profesionales')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'profesionales'
              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
              : 'bg-slate-100 text-[#0F172A] border-slate-300 hover:bg-white hover:border-slate-500'
          }`}
        >
          <UserCheck className="w-4 h-4 stroke-[2.5]" />
          <span>Gestionar Profesionales</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            activeTab === 'profesionales' ? 'bg-white text-[#1E3A8A]' : 'bg-slate-200 text-[#0F172A]'
          }`}>
            {staff.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('servicios')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'servicios'
              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
              : 'bg-slate-100 text-[#0F172A] border-slate-300 hover:bg-white hover:border-slate-500'
          }`}
        >
          <Sparkles className="w-4 h-4 stroke-[2.5]" />
          <span>Gestionar Servicios</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            activeTab === 'servicios' ? 'bg-white text-[#1E3A8A]' : 'bg-slate-200 text-[#0F172A]'
          }`}>
            {services.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('negocio')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'negocio'
              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
              : 'bg-slate-100 text-[#0F172A] border-slate-300 hover:bg-white hover:border-slate-500'
          }`}
        >
          <Building2 className="w-4 h-4 stroke-[2.5]" />
          <span>Datos del Local & Cobros</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('todos')}
          className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'todos'
              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
              : 'bg-slate-100 text-[#0F172A] border-slate-300 hover:bg-white hover:border-slate-500'
          }`}
        >
          <span>Ver Todo</span>
        </button>
      </div>

      {/* ========================================================
          SECCIÓN COMERCIAL: SUSCRIPCIÓN Y PLAN DE TU AGENDA LISTA
         ======================================================== */}
      {(activeTab === 'suscripcion' || activeTab === 'negocio' || activeTab === 'todos') && (
        <section
          aria-label="Suscripción comercial de Tu Agenda Lista"
          className="bg-white rounded-2xl border-2 border-[#D4AF37] p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-150"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#0F172A]">
                <Award className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Tu Agenda Lista</span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span>Desarrollado por Iris Quiroz</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                Suscripción Comercial: 7 días de prueba gratuita y luego $45.000 por mes
              </h2>

              <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                Probá todas las herramientas de gestión del sistema sin cargo durante 7 días. Al finalizar el período de prueba, el valor del plan mensual es de <strong className="font-black text-[#0F172A]">$45.000 por mes</strong>. La contratación y todas las consultas comerciales se coordinan directamente por el WhatsApp comercial de la propietaria (<strong className="font-black text-[#0F172A]">{OWNER_WHATSAPP_DISPLAY}</strong>).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <a
                href={SUBSCRIPTION_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-xl text-xs sm:text-sm font-black shadow-sm transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <WhatsAppIcon size={18} variant="monochrome" className="text-white" />
                <span>Contratar Plan ($45.000 / mes)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-90 shrink-0" />
              </a>

              <a
                href={CONSULTATION_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-[#0F172A] border-2 border-slate-300 hover:border-[#0F172A] rounded-xl text-xs sm:text-sm font-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <WhatsAppIcon size={17} variant="color" />
                <span>Consultas al {OWNER_WHATSAPP_DISPLAY}</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-[#1E3A8A] uppercase tracking-wider">
                <Clock className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Período Inicial</span>
              </div>
              <p className="text-lg font-black text-[#0F172A]">7 días de prueba gratuita</p>
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                Acceso completo a agenda, turnos, profesionales, clientes, caja diaria y reportes sin cargo inicial.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-[#1E3A8A] uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Abono Mensual</span>
              </div>
              <p className="text-lg font-black text-[#0F172A]">$45.000 por mes</p>
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                Valor mensual luego de los 7 días de prueba gratuita, sin débitos automáticos ni costos ocultos.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-[#1E3A8A] uppercase tracking-wider">
                <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Contacto Comercial Directo</span>
              </div>
              <p className="text-lg font-black text-[#0F172A]">WhatsApp {OWNER_WHATSAPP_DISPLAY}</p>
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                Contratación, activación de suscripción y consultas directas con la propietaria. Desarrollado por <strong className="font-black text-[#0F172A]">Iris Quiroz</strong>.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          PANEL 1: GESTIÓN DE PROFESIONALES (AJUSTES)
         ======================================================== */}
      {(activeTab === 'profesionales' || activeTab === 'todos') && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-slate-300 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-50 border-2 border-blue-200 rounded-xl text-[#1E3A8A]">
                    <UserCheck className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#000000] tracking-tight">
                      Gestión de Profesionales
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">
                      Crea, edita y elimina profesionales y especialidades. Se sincronizan en la Agenda y el modal de turnos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {hasSampleStaff && (
                  <button
                    type="button"
                    onClick={() => setConfirmClearSample('staff')}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 text-rose-800 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Eliminar profesionales de muestra para usar exclusivamente tu equipo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpiar ejemplos</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStaffToEdit(null);
                    setIsStaffModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-[#172554] active:scale-98 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Formulario Completo</span>
                </button>
              </div>
            </div>

            {confirmClearSample === 'staff' && (
              <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs font-black text-[#0F172A]">
                  ¿Confirmás eliminar los profesionales de muestra precargados?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClearSample(null)}
                    className="px-3.5 py-1.5 rounded-lg bg-white border-2 border-slate-400 text-[#0F172A] text-xs font-black cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={executeClearSampleStaff}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}

            {/* Formulario Rápido de Carga Directa (Quick-Add) */}
            <form onSubmit={handleQuickAddStaff} className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border-2 border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#1E3A8A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Agregar Profesional Rápido
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  Se guarda en almacenamiento permanente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-black text-[#0F172A] block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre y apellido del profesional"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-[#0F172A] block mb-1">Especialidad o Rol</label>
                  <input
                    type="text"
                    placeholder="Cosmetóloga, Masajista, Esteticista..."
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-[#0F172A] block mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="tel"
                    placeholder="Teléfono o WhatsApp (opcional)"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isQuickAddingStaff}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#1E3A8A] hover:bg-[#172554] active:scale-98 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isQuickAddingStaff ? 'Guardando...' : '+ Guardar Profesional'}</span>
                </button>
              </div>
            </form>

            {/* Listado de Profesionales Cargados */}
            {staff.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-8 space-y-3">
                <Users className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="font-black text-[#0F172A] text-base">No hay profesionales registrados</h3>
                <p className="text-xs font-bold text-slate-600 max-w-md mx-auto">
                  Agrega los nombres y especialidades de tu equipo para asignarlos a los turnos y filtrar la agenda diaria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {staff.map((member) => {
                  const sourceApts = Array.isArray(allAppointments) ? allAppointments : appointments;
                  const memberApts = sourceApts.filter(
                    (a) => a.staffId === member.id && a.status !== 'cancelado'
                  );

                  return (
                    <div
                      key={member.id}
                      className="bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-xs hover:shadow-md hover:border-[#1E3A8A] transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-lg shadow-sm border border-black/10 shrink-0"
                              style={{ backgroundColor: member.color || '#1E3A8A' }}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-black text-[#0F172A] text-base truncate">{member.name}</h4>
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-xs font-black bg-blue-100 text-[#1E3A8A] border border-blue-300 truncate max-w-full">
                                {member.role || 'Especialista'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setStaffToEdit(member);
                                setIsStaffModalOpen(true);
                              }}
                              className="p-2 hover:bg-blue-50 border-2 border-slate-300 hover:border-[#1E3A8A] rounded-xl text-[#0F172A] hover:text-[#1E3A8A] transition-colors cursor-pointer"
                              title="Editar profesional"
                            >
                              <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeleteStaffId(
                                  confirmDeleteStaffId === member.id ? null : member.id
                                )
                              }
                              className="p-2 hover:bg-rose-50 border-2 border-slate-300 hover:border-rose-400 rounded-xl text-rose-600 transition-colors cursor-pointer"
                              title="Eliminar profesional"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>

                        {confirmDeleteStaffId === member.id && (
                          <div className="mb-3 p-3 bg-rose-50 border-2 border-rose-400 rounded-xl space-y-2">
                            <p className="text-xs font-black text-[#0F172A]">
                              ¿Confirmás eliminar a "{member.name}"?
                            </p>
                            {memberApts.length > 0 && (
                              <p className="text-[11px] font-bold text-rose-800">
                                Tiene {memberApts.length} turno(s) activo(s) en la agenda.
                              </p>
                            )}
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteStaffId(null)}
                                className="px-3 py-1 rounded-lg bg-white border-2 border-slate-400 text-[#0F172A] text-xs font-black cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteStaff(member.id);
                                  setConfirmDeleteStaffId(null);
                                }}
                                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
                              >
                                Confirmar
                              </button>
                            </div>
                          </div>
                        )}

                        {member.phone && (
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <Phone className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                            <span className="truncate">{member.phone}</span>
                          </p>
                        )}

                        <div className="space-y-2 py-2.5 border-t border-slate-200 text-xs">
                          <div>
                            <span className="text-[11px] font-black text-slate-700 block mb-1">
                              Horarios y Sucursales:
                            </span>
                            <div className="space-y-1">
                              {ALL_WEEK_DAYS.some((d) => getStaffDaySchedule(member, d).active) ? (
                                ALL_WEEK_DAYS.map((d) => {
                                  const sched = getStaffDaySchedule(member, d);
                                  const effS1 = getStaffEffectiveShift(sched, 'sucursal_1');
                                  const effS2 = getStaffEffectiveShift(sched, 'sucursal_2');
                                  if (!sched.active || (!effS1.active && !effS2.active)) return null;

                                  return (
                                    <div key={d} className="flex items-center justify-between gap-1 text-[11px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                      <span className="font-black text-slate-800 shrink-0">{DAY_LABELS.find((l) => l.day === d)?.short}:</span>
                                      <div className="flex flex-wrap items-center justify-end gap-1 font-bold">
                                        {effS1.active && (
                                          <span className="text-[#1E3A8A] bg-blue-50 px-1.5 py-0.5 rounded text-[10px] border border-blue-200">
                                            Mvd ({formatShiftRanges(effS1.ranges)})
                                          </span>
                                        )}
                                        {effS2.active && (
                                          <span className="text-[#0F172A] bg-amber-50 px-1.5 py-0.5 rounded text-[10px] border border-[#D4AF37]">
                                            Rioja ({formatShiftRanges(effS2.ranges)})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-[11px] font-bold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                  Sin días ni horarios configurados. Haz clic en el botón de editar para asignarlos.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-bold">Turnos asignados:</span>
                        <span className="font-black text-[#0F172A] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
                          {memberApts.length} turnos
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          PANEL 2: GESTIÓN DE SERVICIOS (AJUSTES)
         ======================================================== */}
      {(activeTab === 'servicios' || activeTab === 'todos') && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-slate-300 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-50 border-2 border-[#D4AF37] rounded-xl text-[#0F172A]">
                    <Sparkles className="w-6 h-6 stroke-[2.5] text-[#D4AF37]" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                      Gestión de Servicios y Precios
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">
                      Crea, edita y elimina servicios del salón con su duración en minutos y precio automático.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {hasSampleServices && (
                  <button
                    type="button"
                    onClick={() => setConfirmClearSample('services')}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 text-rose-800 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Eliminar servicios de muestra para usar exclusivamente los tuyos"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpiar ejemplos</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setServiceToEdit(null);
                    setIsServiceModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-[#172554] active:scale-98 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Formulario Completo</span>
                </button>
              </div>
            </div>

            {confirmClearSample === 'services' && (
              <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs font-black text-[#0F172A]">
                  ¿Confirmás eliminar los servicios de muestra precargados?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClearSample(null)}
                    className="px-3.5 py-1.5 rounded-lg bg-white border-2 border-slate-400 text-[#0F172A] text-xs font-black cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={executeClearSampleServices}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}

            {/* Formulario Rápido de Carga Directa (Quick-Add Service) */}
            <form onSubmit={handleQuickAddService} className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 border-2 border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#1E3A8A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Agregar Servicio Rápido
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  Completa automáticamente precio y tiempo en los turnos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-[#0F172A] block mb-1">Nombre del Servicio *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Limpieza Facial, Masajes o Tratamiento Corporal"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-[#0F172A] block mb-1">Categoría / Rubro</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                  >
                    {SERVICE_CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat} className="text-[#0F172A] font-bold bg-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-black text-[#0F172A] block mb-1">Duración (min) *</label>
                    <input
                      type="number"
                      required
                      min="5"
                      step="5"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                      className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-[#0F172A] block mb-1">Precio ({business?.currency || '$'}) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(Number(e.target.value))}
                      className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isQuickAddingService}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#1E3A8A] hover:bg-[#172554] active:scale-98 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isQuickAddingService ? 'Guardando...' : '+ Guardar Servicio con Precio'}</span>
                </button>
              </div>
            </form>

            {/* Category pills (Preset system categories always preserved, including Estética Corporal) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {serviceCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedServiceCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap border-2 transition-all cursor-pointer ${
                    selectedServiceCategory === cat
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                      : 'bg-white border-slate-300 text-[#0F172A] hover:border-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'todos' ? 'Todos los Servicios' : cat}
                </button>
              ))}
            </div>

            {/* Grid of services */}
            {filteredServices.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-8 space-y-3">
                <Sparkles className="w-12 h-12 text-[#D4AF37] mx-auto" />
                <h3 className="font-black text-[#0F172A] text-base">No hay servicios en esta categoría</h3>
                <p className="text-xs font-bold text-slate-600 max-w-md mx-auto">
                  Agrega tratamientos y precios para que aparezcan en el desplegable al agendar turnos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service) => {
                  const linked = getServiceLinkedSummary(service);
                  const isConfirming = confirmDeleteServiceId === service.id;

                  return (
                    <div
                      key={service.id}
                      className={`bg-white rounded-2xl border-2 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                        service.active ? 'border-slate-300 hover:border-[#1E3A8A]' : 'border-slate-200 bg-slate-50 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border bg-blue-50 text-[#1E3A8A] border-blue-200">
                            {service.category}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setServiceToEdit(service);
                                setIsServiceModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-blue-50 border-2 border-slate-300 hover:border-[#1E3A8A] rounded-lg text-[#0F172A] hover:text-[#1E3A8A] transition-colors cursor-pointer"
                              title="Editar servicio"
                            >
                              <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeleteServiceId(isConfirming ? null : service.id)
                              }
                              className="px-2 py-1.5 hover:bg-rose-50 border-2 border-slate-300 hover:border-rose-400 rounded-lg text-rose-700 text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                              title="Eliminar servicio"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>

                        {isConfirming && (
                          <div className="mb-3 p-3.5 bg-rose-50 border-2 border-rose-400 rounded-xl space-y-2.5">
                            {linked.hasLinks ? (
                              <>
                                <p className="text-xs font-black text-[#0F172A]">
                                  Atención: "{service.name}" tiene registros vinculados
                                </p>
                                <p className="text-[11px] font-bold text-rose-900 leading-relaxed">
                                  Está asociado a {linked.turns} turno(s), {linked.giftCards} Gift
                                  Card(s) y {linked.cash} movimiento(s) de caja. Para proteger el
                                  historial y no alterar datos vinculados, podés desactivarlo para que
                                  ya no aparezca en nuevos turnos ni Gift Cards.
                                </p>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteServiceId(null)}
                                    className="px-3 py-1.5 rounded-lg bg-white border-2 border-slate-400 text-[#0F172A] text-xs font-black cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  {service.active && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await updateService({ ...service, active: false });
                                        setConfirmDeleteServiceId(null);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black cursor-pointer"
                                    >
                                      Desactivar servicio
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await deleteService(service.id);
                                      setConfirmDeleteServiceId(null);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-black cursor-pointer shadow-xs"
                                  >
                                    Eliminar de todos modos
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-xs font-black text-[#0F172A]">
                                  ¿Confirmás eliminar permanentemente el servicio "{service.name}"?
                                </p>
                                <p className="text-[11px] font-bold text-slate-700">
                                  No tiene turnos, ventas ni Gift Cards asociadas.
                                </p>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteServiceId(null)}
                                    className="px-3 py-1.5 rounded-lg bg-white border-2 border-slate-400 text-[#0F172A] text-xs font-black cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await deleteService(service.id);
                                      setConfirmDeleteServiceId(null);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
                                  >
                                    Confirmar eliminación
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        <h4 className="font-black text-[#0F172A] text-base mb-1.5 flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                            style={{ backgroundColor: service.color || '#1E3A8A' }}
                          />
                          <span className="truncate">{service.name}</span>
                        </h4>

                        {service.description && (
                          <p className="text-xs font-semibold text-slate-700 line-clamp-2 mb-3">
                            {service.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 py-2.5 border-t border-slate-200 text-xs mb-3">
                          <div className="flex items-center gap-1 font-bold text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-[#1E3A8A]" />
                            <span>{service.durationMinutes} minutos</span>
                          </div>
                          <div className="flex items-center gap-1 font-black text-[#0F172A] text-base ml-auto bg-slate-100 px-3 py-1 rounded-xl border-2 border-slate-300 shadow-2xs">
                            <span>{formatCurrency(service.price, business?.currency)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-[11px] font-black text-slate-700">
                          {service.active ? 'Disponible para turnos' : 'Inactivo'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleServiceActive(service)}
                          className={`text-xs font-black px-3 py-1 rounded-lg border-2 transition-colors cursor-pointer ${
                            service.active
                              ? 'bg-emerald-100 border-emerald-400 text-emerald-950 hover:bg-emerald-200'
                              : 'bg-slate-200 border-slate-400 text-slate-800 hover:bg-slate-300'
                          }`}
                        >
                          {service.active ? 'Activo' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          PANEL 3: CONFIGURACIÓN GENERAL DEL LOCAL Y COBROS
         ======================================================== */}
      {(activeTab === 'negocio' || activeTab === 'todos') && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Tarjetas de acceso rápido a Gestión de Profesionales y Servicios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6 text-[#1E3A8A]" />
                </div>
                <div>
                  <h4 className="font-black text-[#000000] text-sm">Gestionar Profesionales</h4>
                  <p className="text-xs font-bold text-slate-600">
                    {staff.length} profesional(es) activo(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profesionales')}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border-2 border-slate-400 hover:border-black text-[#000000] rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Administrar</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-[#D4AF37] flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="font-black text-[#0F172A] text-sm">Gestionar Servicios</h4>
                  <p className="text-xs font-bold text-slate-600">
                    {services.length} servicio(s) y precios
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('servicios')}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border-2 border-slate-400 hover:border-black text-[#0F172A] rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Administrar</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Identidad del Sistema y Sucursales Activas */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-[#D4AF37] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0F172A] tracking-tight">
                  Tu Agenda Lista · Sistema Multi-Sucursal Activo
                </h3>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  Desarrollado por Iris Quiroz · Soham Montevideo (Montevideo 397) & Soham Rioja (Rioja 2954)
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-900 border border-emerald-300 self-start sm:self-auto">
              Sincronización activa
            </span>
          </div>

          {/* Tarjeta Principal de Configuración */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 sm:p-8 shadow-sm space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-slate-100 text-[#000000] border-2 border-slate-300 rounded-2xl shrink-0">
                  <Building2 className="w-6 h-6 text-[#000000]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#000000] tracking-tight">
                    Configuración del Negocio
                  </h2>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                    Datos del local, medios de cobro, colores, teléfono y dirección.
                  </p>
                </div>
              </div>

              {isDemoMode && (
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
                >
                  Conectar Cuenta de Google
                </button>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-7">
              {/* 1. Datos Principales y Nombre del Local */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gray-50 border-2 border-slate-300 space-y-6">
                <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#D4AF37]" />
                  <span>Nombre y Marca del Local</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-black text-black uppercase tracking-wider block mb-2">
                      Nombre Principal del Negocio *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Tu Agenda Lista"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-sm px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none bg-white font-black text-[#000000] shadow-xs transition-all"
                    />
                    <span className="text-xs font-bold text-slate-700 mt-1.5 block">
                      Se muestra en la barra superior, reportes y comprobantes.
                    </span>
                  </div>

                  {/* Selector de Paleta de Color */}
                  <div>
                    <label className="text-xs font-black text-black uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Color Distintivo del Negocio
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {THEME_COLOR_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setThemeColor(opt.hex);
                            setThemeName(opt.name);
                          }}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all flex items-center gap-2 cursor-pointer ${
                            themeColor === opt.hex
                              ? 'border-black bg-white ring-2 ring-black shadow-xs'
                              : 'border-slate-300 bg-white hover:border-slate-500'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full shrink-0 border border-black/20"
                            style={{ backgroundColor: opt.hex }}
                          />
                          <span className="text-xs font-black text-[#000000] truncate">
                            {opt.name.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700 mt-1.5 block">
                      Color activo: <strong className="text-black font-black">{themeName}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Parámetros Generales del Negocio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                    Rubro o Especialidad del Salón
                  </label>
                  <input
                    type="text"
                    placeholder="Centro de Estética & Salud Integral"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm px-4 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-black text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                    Prefijo Telefónico País *
                  </label>
                  <select
                    value={phoneCountryPrefix}
                    onChange={(e) => setPhoneCountryPrefix(e.target.value)}
                    className="w-full text-sm px-3.5 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-black text-[#0F172A]"
                  >
                    <option value="+54" className="text-[#0F172A] font-bold bg-white">Argentina (+54)</option>
                    <option value="+598" className="text-[#0F172A] font-bold bg-white">Uruguay (+598)</option>
                    <option value="+56" className="text-[#0F172A] font-bold bg-white">Chile (+56)</option>
                    <option value="+595" className="text-[#0F172A] font-bold bg-white">Paraguay (+595)</option>
                    <option value="+34" className="text-[#0F172A] font-bold bg-white">España (+34)</option>
                    <option value="+52" className="text-[#0F172A] font-bold bg-white">México (+52)</option>
                    <option value="+1" className="text-[#0F172A] font-bold bg-white">EE.UU. / Canadá (+1)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                      Moneda
                    </label>
                    <input
                      type="text"
                      placeholder="$"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full text-sm px-3 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-black text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                      Seña (%)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      step="5"
                      value={defaultDepositPercentage}
                      onChange={(e) => setDefaultDepositPercentage(Number(e.target.value))}
                      className="w-full text-sm px-3 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-black text-[#0F172A]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Configuración Independiente por Sucursal */}
              <div className="p-5 sm:p-7 rounded-2xl bg-slate-50 border-2 border-slate-300 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-black text-[#0F172A] flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#1E3A8A]" />
                      <span>Configuración Independiente por Sucursal</span>
                    </h3>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                      Seleccioná la sucursal para configurar su dirección, teléfono, WhatsApp, alias, CVU, Mercado Pago y medios de pago habilitados.
                    </p>
                  </div>

                  {/* Branch Switcher */}
                  <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border-2 border-slate-300 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSettingsBranch('sucursal_1')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        settingsBranch === 'sucursal_1'
                          ? 'bg-[#1E3A8A] text-white shadow-xs'
                          : 'text-[#0F172A] hover:bg-slate-100'
                      }`}
                    >
                      Soham Montevideo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsBranch('sucursal_2')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        settingsBranch === 'sucursal_2'
                          ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                          : 'text-[#0F172A] hover:bg-slate-100'
                      }`}
                    >
                      Soham Rioja
                    </button>
                  </div>
                </div>

                {settingsError && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-xs font-black text-rose-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{settingsError}</span>
                  </div>
                )}

                {/* Dirección, Teléfono y WhatsApp de la sucursal */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                      Dirección ({currentBranchCfg.name}) *
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#1E3A8A] absolute left-3 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder={
                          settingsBranch === 'sucursal_1'
                            ? 'Montevideo 397, Rosario'
                            : 'Rioja 2954, Rosario'
                        }
                        value={currentBranchCfg.address}
                        onChange={(e) => updateCurrentBranchField('address', e.target.value)}
                        className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-black text-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                      Teléfono Fijo / Celular
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#1E3A8A] absolute left-3 top-3.5" />
                      <input
                        type="tel"
                        placeholder="Sin configurar (ingresar número real)"
                        value={currentBranchCfg.phone}
                        onChange={(e) => updateCurrentBranchField('phone', e.target.value)}
                        className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                      WhatsApp de la Sucursal
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-emerald-700 absolute left-3 top-3.5" />
                      <input
                        type="tel"
                        placeholder="Sin configurar (ingresar WhatsApp real)"
                        value={currentBranchCfg.whatsapp}
                        onChange={(e) => updateCurrentBranchField('whatsapp', e.target.value)}
                        className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Alias Bancario, Alias MP, CVU y Credenciales Mercado Pago por Sucursal */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-300 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <MercadoPagoIcon size={32} variant="badge" className="shadow-2xs" />
                    <div>
                      <h4 className="text-sm font-black text-[#0F172A]">
                        Datos Bancarios y Mercado Pago — {currentBranchCfg.name}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600">
                        Dejá vacíos los campos hasta contar con los datos reales de esta sucursal.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                        Alias / CBU Bancario ({currentBranchCfg.name})
                      </label>
                      <input
                        type="text"
                        placeholder="Sin configurar"
                        value={currentBranchCfg.cbuAlias}
                        onChange={(e) => updateCurrentBranchField('cbuAlias', e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-mono font-bold text-[#0F172A] placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                        Alias de Mercado Pago ({currentBranchCfg.name})
                      </label>
                      <input
                        type="text"
                        placeholder="Sin configurar"
                        value={currentBranchCfg.mercadoPagoAlias}
                        onChange={(e) => updateCurrentBranchField('mercadoPagoAlias', e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-mono font-bold text-[#0F172A] placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5">
                        CVU de Mercado Pago (22 dígitos)
                      </label>
                      <input
                        type="text"
                        placeholder="Sin configurar"
                        value={currentBranchCfg.mercadoPagoCvu}
                        onChange={(e) => updateCurrentBranchField('mercadoPagoCvu', e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-mono font-bold text-[#0F172A] placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-[#1E3A8A]" />
                        <span>Credencial / Access Token Mercado Pago</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          placeholder="Sin configurar"
                          value={currentBranchCfg.mercadoPagoAccessToken}
                          onChange={(e) =>
                            updateCurrentBranchField('mercadoPagoAccessToken', e.target.value)
                          }
                          className="w-full text-xs font-mono pl-3.5 pr-10 py-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-2.5 text-slate-700 hover:text-black cursor-pointer"
                          title={showToken ? 'Ocultar token' : 'Ver token'}
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medios de Pago Habilitados por Sucursal */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-300 space-y-3">
                  <div>
                    <h4 className="text-sm font-black text-[#0F172A] flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#1E3A8A]" />
                      <span>Medios de Pago Habilitados en {currentBranchCfg.name}</span>
                    </h4>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      Los turnos y movimientos de caja de esta sucursal mostrarán los medios seleccionados.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {ENABLED_PAYMENT_METHOD_OPTIONS.map((method) => {
                      const isChecked = currentBranchCfg.enabledPaymentMethods.includes(method);
                      return (
                        <label
                          key={method}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleBranchPaymentMethod(method);
                          }}
                          className={`p-3 rounded-xl border-2 flex items-center gap-2.5 cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-blue-50 border-[#1E3A8A] text-[#0F172A]'
                              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isChecked
                                ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                                : 'bg-white border-slate-400'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span className="text-xs font-black">{PAYMENT_METHOD_LABELS[method]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Botón Guardar Configuración */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-bold text-slate-600">
                  <span>Se guardan de forma independiente los datos de Soham Montevideo y Soham Rioja.</span>
                  <span className="hidden sm:inline text-slate-300">·</span>
                  <a
                    href={CONSULTATION_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1E3A8A] hover:underline font-black inline-flex items-center gap-1"
                  >
                    <span>Consultas comerciales: WhatsApp {OWNER_WHATSAPP_DISPLAY}</span>
                  </a>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-xl text-sm font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
                >
                  {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Settings className="w-4 h-4 text-white" />}
                  <span>{isSaved ? '¡Guardado correctamente!' : 'Guardar Cambios del Negocio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modales integrados en Ajustes para edición avanzada */}
      {isStaffModalOpen && (
        <StaffModal
          staffToEdit={staffToEdit}
          onClose={() => {
            setIsStaffModalOpen(false);
            setStaffToEdit(null);
          }}
          onSaved={() => {
            setIsStaffModalOpen(false);
            setStaffToEdit(null);
          }}
        />
      )}

      {isServiceModalOpen && (
        <ServiceModal
          serviceToEdit={serviceToEdit}
          onClose={() => {
            setIsServiceModalOpen(false);
            setServiceToEdit(null);
          }}
          onSaved={() => {
            setIsServiceModalOpen(false);
            setServiceToEdit(null);
          }}
        />
      )}
    </div>
  );
}

export default SettingsView;
