import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Phone,
  MapPin,
  DollarSign,
  CreditCard,
  Check,
  RefreshCw,
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
import { THEME_COLOR_OPTIONS, StaffMember, Service, StaffBranchScope } from '../types';
import { StaffModal } from './staff/StaffModal';
import { ServiceModal } from './services/ServiceModal';
import { formatCurrency } from '../utils/formatters';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const SERVICE_CATEGORY_PRESETS = [
  'Estética Facial',
  'Estética Corporal',
  'Cosmetología',
  'Masajes',
  'Manicuría & Pestañas',
  'General',
];

// Enlaces directos a WhatsApp de Iris Quiroz (Soporte Técnico y Suscripción)
const IRIS_WHATSAPP_NUMBER = '5493413540643';
const SUPPORT_MESSAGE = 'Hola Iris, necesito ayuda con Tu Agenda Lista';
const SUBSCRIPTION_MESSAGE = 'Hola Iris, quiero abonar mi suscripción mensual de $45.000 de Tu Agenda Lista';

const SUPPORT_WHATSAPP_URL = `https://wa.me/${IRIS_WHATSAPP_NUMBER}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`;
const SUBSCRIPTION_WHATSAPP_URL = `https://wa.me/${IRIS_WHATSAPP_NUMBER}?text=${encodeURIComponent(SUBSCRIPTION_MESSAGE)}`;

/**
 * SettingsView - Gestor integral dentro de la pestaña "Ajustes":
 * 1. GESTIÓN DE PROFESIONALES: crear, editar y eliminar nombres, especialidades y horarios.
 *    Reemplazo de profesionales de muestra por los propios y sincronización en tiempo real con la Agenda y Nuevo Turno.
 * 2. GESTIÓN DE SERVICIOS: crear, editar y eliminar servicios (nombre, duración en minutos y precio).
 *    Completado automático de duración y precio al agendar.
 * 3. DATOS DEL LOCAL Y COBROS: nombre, dirección, teléfono, Mercado Pago y colores.
 */
export function SettingsView() {
  const {
    business,
    updateBusiness,
    resetToSampleData,
    loginWithGoogle,
    isDemoMode,
    staff,
    createStaff,
    updateStaff,
    deleteStaff,
    services,
    createService,
    updateService,
    deleteService,
    appointments,
  } = useApp();

  // Navigation tab inside Settings: defaults to 'profesionales' so user sees it right away
  const [activeTab, setActiveTab] = useState<'profesionales' | 'servicios' | 'negocio' | 'todos'>('profesionales');

  // Quick inline add states for Staff
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffBranch, setNewStaffBranch] = useState<StaffBranchScope>('sucursal_1');
  const [isQuickAddingStaff, setIsQuickAddingStaff] = useState(false);

  // Quick inline add states for Services
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState(SERVICE_CATEGORY_PRESETS[0]);
  const [newServiceDuration, setNewServiceDuration] = useState(45);
  const [newServicePrice, setNewServicePrice] = useState(6000);
  const [isQuickAddingService, setIsQuickAddingService] = useState(false);

  // Modals inside Settings for advanced editing
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('todos');

  // Local form state for business settings
  const [name, setName] = useState(business?.name || 'Tu Agenda Lista');
  const [category, setCategory] = useState(business?.category || 'Centro de Estética & Belleza');
  const [phone, setPhone] = useState(business?.phone || '+54 9 11 4567-8901');
  const [phoneCountryPrefix, setPhoneCountryPrefix] = useState(business?.phoneCountryPrefix || '+54');
  const [address, setAddress] = useState(business?.address || 'Av. Principal 1234');
  const [currency, setCurrency] = useState(business?.currency || '$');
  const [cbuAlias, setCbuAlias] = useState(business?.cbuAlias || 'agenda.turnos.mp');
  const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState(business?.mercadoPagoAccessToken || '');
  const [mercadoPagoAlias, setMercadoPagoAlias] = useState(business?.mercadoPagoAlias || business?.cbuAlias || 'agenda.turnos.mp');
  const [mercadoPagoCvu, setMercadoPagoCvu] = useState(business?.mercadoPagoCvu || '0000003100085492109482');
  const [defaultDepositPercentage, setDefaultDepositPercentage] = useState(business?.defaultDepositPercentage || 30);
  const [showToken, setShowToken] = useState(false);
  const [defaultSlotMinutes, setDefaultSlotMinutes] = useState(business?.defaultSlotMinutes || 30);
  const [themeColor, setThemeColor] = useState(business?.themeColor || '#D4AF37');
  const [themeName, setThemeName] = useState(business?.themeName || 'Oro Metálico & Obsidian (Oficial)');

  const [isSaved, setIsSaved] = useState(false);

  // Sync state whenever business updates
  useEffect(() => {
    if (business) {
      setName(business.name || 'Tu Agenda Lista');
      setCategory(business.category || 'Centro de Estética & Belleza');
      setPhone(business.phone || '+54 9 11 4567-8901');
      setPhoneCountryPrefix(business.phoneCountryPrefix || '+54');
      setAddress(business.address || 'Av. Principal 1234');
      setCurrency(business.currency || '$');
      setCbuAlias(business.cbuAlias || 'agenda.turnos.mp');
      setMercadoPagoAccessToken(business.mercadoPagoAccessToken || '');
      setMercadoPagoAlias(business.mercadoPagoAlias || business.cbuAlias || 'agenda.turnos.mp');
      setMercadoPagoCvu(business.mercadoPagoCvu || '0000003100085492109482');
      setDefaultDepositPercentage(business.defaultDepositPercentage || 30);
      setDefaultSlotMinutes(business.defaultSlotMinutes || 30);
      setThemeColor(business.themeColor || '#D4AF37');
      setThemeName(business.themeName || 'Oro Metálico & Obsidian (Oficial)');
    }
  }, [business]);

  // Handle Quick Add Staff
  const handleQuickAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    setIsQuickAddingStaff(true);
    try {
      await createStaff({
        name: newStaffName.trim(),
        role: newStaffRole.trim() || 'Especialista',
        phone: newStaffPhone.trim(),
        color: '#2563eb',
        branchId: newStaffBranch,
        workingDays: [1, 2, 3, 4, 5, 6],
        workingHoursStart: '09:00',
        workingHoursEnd: '20:00',
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

  // Replace / Clear Sample Staff
  const handleClearSampleStaff = async () => {
    if (confirm('¿Eliminar los profesionales de muestra precargados para dejar únicamente tu propio equipo de estética?')) {
      for (const member of staff) {
        if (
          member.id.startsWith('stf_sample') ||
          ['Camila Rossi', 'Valeria Gómez', 'Lucas Medina', 'Valentina Rivas', 'Lucía Fernández', 'Mateo Benítez'].some((n) => member.name.includes(n))
        ) {
          await deleteStaff(member.id);
        }
      }
    }
  };

  // Replace / Clear Sample Services
  const handleClearSampleServices = async () => {
    if (confirm('¿Eliminar los servicios de muestra para cargar únicamente tu propia lista de tratamientos y precios?')) {
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
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBusiness({
      name: name.trim() || 'Tu Agenda Lista',
      developerName: 'Iris Quiroz',
      tagline: 'Desarrollado por Iris Quiroz',
      themeColor,
      themeName,
      category: category.trim(),
      phone: phone.trim(),
      phoneCountryPrefix: phoneCountryPrefix.trim() || '+54',
      address: address.trim(),
      currency: currency.trim(),
      cbuAlias: cbuAlias.trim(),
      mercadoPagoAccessToken: mercadoPagoAccessToken.trim(),
      mercadoPagoAlias: mercadoPagoAlias.trim(),
      mercadoPagoCvu: mercadoPagoCvu.trim(),
      defaultDepositPercentage: Number(defaultDepositPercentage) || 30,
      defaultSlotMinutes: Number(defaultSlotMinutes),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (confirm(`¿Estás seguro de eliminar a "${staffName}" del equipo de profesionales?`)) {
      await deleteStaff(id);
    }
  };

  const handleDeleteService = async (id: string, srvName: string) => {
    if (confirm(`¿Estás seguro de eliminar el servicio "${srvName}"?`)) {
      await deleteService(id);
    }
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

  const serviceCategories = ['todos', ...Array.from(new Set(services.map((s) => s.category)))];
  const filteredServices = services.filter((s) => {
    if (selectedServiceCategory === 'todos') return true;
    return s.category === selectedServiceCategory;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-white">
      {/* Selector de sub-sección con alto contraste y bordes visibles */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-300 overflow-x-auto shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('profesionales')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'profesionales'
              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
              : 'bg-white text-[#000000] border-slate-300 hover:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4 stroke-[2.5]" />
          <span>Gestionar Profesionales</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            activeTab === 'profesionales' ? 'bg-white text-[#1E3A8A]' : 'bg-slate-200 text-[#000000]'
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
              : 'bg-white text-[#000000] border-slate-300 hover:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 stroke-[2.5]" />
          <span>Gestionar Servicios</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            activeTab === 'servicios' ? 'bg-white text-[#1E3A8A]' : 'bg-slate-200 text-[#000000]'
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
              : 'bg-white text-[#000000] border-slate-300 hover:border-slate-700 hover:bg-slate-50'
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
              : 'bg-white text-[#000000] border-slate-300 hover:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Ver Todo</span>
        </button>
      </div>

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
                    onClick={handleClearSampleStaff}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sofía Gómez"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Especialidad o Rol</label>
                  <input
                    type="text"
                    placeholder="Ej. Colorista, Estilista..."
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="tel"
                    placeholder="Ej. +54 9 11 1234-5678"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Sucursal Asignada</label>
                  <select
                    value={newStaffBranch}
                    onChange={(e) => setNewStaffBranch(e.target.value as StaffBranchScope)}
                    className="w-full text-xs sm:text-sm font-bold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 outline-none cursor-pointer"
                  >
                    <option value="sucursal_1">Sucursal 1</option>
                    <option value="sucursal_2">Sucursal 2</option>
                    <option value="ambas">Ambas Sucursales</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isQuickAddingStaff}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
                <h3 className="font-black text-black text-base">No hay profesionales registrados</h3>
                <p className="text-xs font-bold text-slate-600 max-w-md mx-auto">
                  Agrega los nombres y especialidades de tu equipo para asignarlos a los turnos y filtrar la agenda diaria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {staff.map((member) => {
                  const memberApts = appointments.filter(
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
                              <h4 className="font-bold text-slate-900 text-base truncate">{member.name}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  {member.role || 'Especialista'}
                                </span>
                                {member.branchId === 'sucursal_2' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    Sucursal 2
                                  </span>
                                ) : member.branchId === 'ambas' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Ambas
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Sucursal 1
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setStaffToEdit(member);
                                setIsStaffModalOpen(true);
                              }}
                              className="p-2 hover:bg-blue-50 border-2 border-slate-300 hover:border-[#1E3A8A] rounded-xl text-[#000000] hover:text-[#1E3A8A] transition-colors cursor-pointer"
                              title="Editar profesional"
                            >
                              <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(member.id, member.name)}
                              className="p-2 hover:bg-rose-50 border-2 border-slate-300 hover:border-rose-400 rounded-xl text-rose-600 transition-colors cursor-pointer"
                              title="Eliminar profesional"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>

                        {member.phone && (
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <Phone className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                            <span className="truncate">{member.phone}</span>
                          </p>
                        )}

                        <div className="space-y-2 py-2.5 border-t border-slate-200 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span className="flex items-center gap-1 text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-[#1E3A8A]" />
                              Horario:
                            </span>
                            <span className="font-black text-black">
                              {member.workingHoursStart} - {member.workingHoursEnd} hs
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] font-black text-slate-700 block mb-1">
                              Días de atención:
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                                const isWorking = member.workingDays.includes(d);
                                return (
                                  <span
                                    key={d}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${
                                      isWorking
                                        ? 'bg-blue-100 border-blue-400 text-blue-950'
                                        : 'bg-slate-100 border-slate-200 text-slate-400 opacity-50'
                                    }`}
                                  >
                                    {DAY_NAMES[d]}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-bold">Turnos asignados:</span>
                        <span className="font-black text-black bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
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
                  <div className="p-2.5 bg-purple-50 border-2 border-purple-200 rounded-xl text-purple-700">
                    <Sparkles className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#000000] tracking-tight">
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
                    onClick={handleClearSampleServices}
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

            {/* Formulario Rápido de Carga Directa (Quick-Add Service) */}
            <form onSubmit={handleQuickAddService} className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border-2 border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Agregar Servicio Rápido
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  Completa automáticamente precio y tiempo en los turnos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-[#000000] block mb-1">Nombre del Servicio *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Limpieza Facial, Masajes o Tratamiento Corporal"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-[#000000] block mb-1">Categoría / Rubro</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
                  >
                    {SERVICE_CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat} className="text-[#000000] font-bold bg-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-black text-[#000000] block mb-1">Duración (min) *</label>
                    <input
                      type="number"
                      required
                      min="5"
                      step="5"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                      className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-[#000000] block mb-1">Precio ({business?.currency || '$'}) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(Number(e.target.value))}
                      className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
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

            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {serviceCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedServiceCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap border-2 transition-all capitalize cursor-pointer ${
                    selectedServiceCategory === cat
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                      : 'bg-white border-slate-300 text-[#000000] hover:border-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'todos' ? 'Todos los Servicios' : cat}
                </button>
              ))}
            </div>

            {/* Grid of services */}
            {filteredServices.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-8 space-y-3">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto" />
                <h3 className="font-black text-black text-base">No hay servicios en esta categoría</h3>
                <p className="text-xs font-bold text-slate-600 max-w-md mx-auto">
                  Agrega tratamientos y precios para que aparezcan en el desplegable al agendar turnos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className={`bg-white rounded-2xl border-2 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                      service.active ? 'border-slate-300 hover:border-[#1E3A8A]' : 'border-slate-200 bg-slate-50 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border"
                          style={{
                            backgroundColor: `${service.color || '#1E3A8A'}15`,
                            color: service.color || '#1E3A8A',
                            borderColor: `${service.color || '#1E3A8A'}40`,
                          }}
                        >
                          {service.category}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setServiceToEdit(service);
                              setIsServiceModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-blue-50 border-2 border-slate-300 hover:border-[#1E3A8A] rounded-lg text-[#000000] hover:text-[#1E3A8A] transition-colors cursor-pointer"
                            title="Editar servicio"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(service.id, service.name)}
                            className="p-1.5 hover:bg-rose-50 border-2 border-slate-300 hover:border-rose-400 rounded-lg text-rose-600 transition-colors cursor-pointer"
                            title="Eliminar servicio"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-black text-[#000000] text-base mb-1.5 flex items-center gap-2">
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
                        <div className="flex items-center gap-1 font-black text-[#000000] text-base ml-auto bg-slate-100 px-3 py-1 rounded-xl border-2 border-slate-300 shadow-2xs">
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
                ))}
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
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border-2 border-purple-200 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <h4 className="font-black text-[#000000] text-sm">Gestionar Servicios</h4>
                  <p className="text-xs font-bold text-slate-600">
                    {services.length} servicio(s) y precios
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('servicios')}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border-2 border-slate-400 hover:border-black text-[#000000] rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Administrar</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Sección Licencia / Estado del Servicio */}
          <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-lg font-black text-[#000000] tracking-tight">
                      Licencia / Estado del Servicio
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      Período de Prueba Activo (7 Días Gratis)
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    Estado del Abono: <strong className="text-black font-black">Período de Prueba Activo (7 Días Gratis)</strong>. Al finalizar la prueba, el abono mensual es de <strong className="text-black font-black">$45.000 / mes</strong>.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <a
                  href={SUBSCRIPTION_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer"
                  title="Coordinar suscripción por WhatsApp con Iris Quiroz"
                >
                  <WhatsAppIcon className="w-5 h-5 text-white" />
                  <span>Coordinar suscripción por WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Tarjetas informativas de Licencia y Abono */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Estado del Abono
                </span>
                <div className="flex items-center gap-2 pt-0.5">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-black text-[#000000]">
                    Período de Prueba Activo (7 Días Gratis)
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 pt-1">
                  Acceso completo a turnos ilimitados, WhatsApp, caja y reportes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Costo del Abono Mensual
                </span>
                <div className="text-lg font-black text-[#000000] pt-0.5">
                  $45.000 / mes
                </div>
                <p className="text-xs font-bold text-slate-700 pt-1">
                  Tarifa mensual al finalizar los 7 días de prueba gratis.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Gestión de Pago y Facturación
                </span>
                <div className="pt-0.5">
                  <a
                    href={SUBSCRIPTION_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 hover:text-emerald-950 underline"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Coordinar suscripción por WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-xs font-bold text-slate-700 pt-1">
                  Habilitación inmediata por transferencia bancaria o Mercado Pago.
                </p>
              </div>
            </div>
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

              {/* 2. Rubro y Teléfono de Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-black text-black uppercase tracking-wider block mb-1.5">
                    Rubro o Especialidad del Salón
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Centro de Estética, Salud Integral, Consultorio, Spa..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm px-4 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-black focus:ring-2 focus:ring-black/10 outline-none font-black text-[#000000]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-black uppercase tracking-wider block mb-1.5">
                    Teléfono / WhatsApp de Contacto
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-black absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      placeholder="+54 9 11 4567-8901"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-black focus:ring-2 focus:ring-black/10 outline-none font-black text-[#000000]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Prefijo Telefónico y Recordatorios */}
              <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <WhatsAppIcon size={34} variant="badge" className="shadow-xs" />
                    <div>
                      <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wider">
                        WhatsApp & Envíos Directos
                      </h4>
                      <p className="text-xs font-bold text-emerald-900 mt-0.5">
                        Prefijo para enviar mensajes y recordatorios con 1 solo toque.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 border border-emerald-400">
                    wa.me activo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-emerald-950 uppercase tracking-wider block mb-1.5">
                      Prefijo / País Predeterminado *
                    </label>
                    <select
                      value={phoneCountryPrefix}
                      onChange={(e) => setPhoneCountryPrefix(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border-2 border-emerald-500 bg-white focus:border-emerald-700 outline-none font-black text-[#000000]"
                    >
                      <option value="+54" className="text-[#000000] font-bold bg-white">🇦🇷 Argentina (+54)</option>
                      <option value="+34" className="text-[#000000] font-bold bg-white">🇪🇸 España (+34)</option>
                      <option value="+52" className="text-[#000000] font-bold bg-white">🇲🇽 México (+52)</option>
                      <option value="+56" className="text-[#000000] font-bold bg-white">🇨🇱 Chile (+56)</option>
                      <option value="+598" className="text-[#000000] font-bold bg-white">🇺🇾 Uruguay (+598)</option>
                      <option value="+57" className="text-[#000000] font-bold bg-white">🇨🇴 Colombia (+57)</option>
                      <option value="+51" className="text-[#000000] font-bold bg-white">🇵🇪 Perú (+51)</option>
                      <option value="+595" className="text-[#000000] font-bold bg-white">🇵🇾 Paraguay (+595)</option>
                      <option value="+591" className="text-[#000000] font-bold bg-white">🇧🇴 Bolivia (+591)</option>
                      <option value="+1" className="text-[#000000] font-bold bg-white">🇺🇸 Estados Unidos / Canadá (+1)</option>
                      <option value="+55" className="text-[#000000] font-bold bg-white">🇧🇷 Brasil (+55)</option>
                    </select>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border-2 border-emerald-300 text-xs space-y-1">
                    <span className="font-black text-emerald-950 block">Mensaje de confirmación:</span>
                    <p className="text-[#000000] font-bold italic bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      "Hola [Nombre], te confirmamos tu turno para [Servicio] el día [Fecha] a las [Hora] hs."
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Dirección del Local y Símbolo de Moneda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-black uppercase tracking-wider block mb-1.5">
                    Dirección del Local / Sucursal
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-black absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Ej. Av. Santa Fe 2340, CABA"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-black focus:ring-2 focus:ring-black/10 outline-none font-black text-[#000000]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-black uppercase tracking-wider block mb-1.5">
                    Símbolo de Moneda
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-black absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="$, ARS, USD, EUR, MXN..."
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-black focus:ring-2 focus:ring-black/10 outline-none font-black text-[#000000]"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Cobros con Mercado Pago */}
              <div className="p-5 sm:p-7 rounded-2xl bg-sky-50 border-2 border-sky-300 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-200 pb-4">
                  <div className="flex items-center gap-3">
                    <MercadoPagoIcon size={40} variant="badge" className="shadow-xs" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-black tracking-tight">
                          Cobros y Señas con Mercado Pago
                        </h4>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#009EE3] text-white">
                          Oficial
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        Permite generar links de pago de seña, botones directos y cobro por QR.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-black text-sky-950 bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-300">
                    <QrCode className="w-3.5 h-3.5 text-sky-800" />
                    <span>Link & QR Automático</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Access Token */}
                  <div>
                    <label className="text-xs font-black text-black uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-sky-700" />
                      Mercado Pago Access Token
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        placeholder="APP_USR-xxxxxx o TEST-xxxxxx"
                        value={mercadoPagoAccessToken}
                        onChange={(e) => setMercadoPagoAccessToken(e.target.value)}
                        className="w-full text-xs font-mono pl-3.5 pr-10 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-black outline-none font-bold text-[#000000]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-3 text-slate-700 hover:text-black cursor-pointer"
                        title={showToken ? 'Ocultar token' : 'Ver token'}
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-xs font-bold text-slate-700 mt-1 block">
                      Panel de Mercado Pago Developers &gt; Tus Credenciales.
                    </span>
                  </div>

                  {/* Alias */}
                  <div>
                    <label className="text-xs font-black text-black uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-sky-700" />
                      Alias de Mercado Pago
                    </label>
                    <input
                      type="text"
                      placeholder="agenda.turnos.mp"
                      value={mercadoPagoAlias}
                      onChange={(e) => {
                        setMercadoPagoAlias(e.target.value);
                        setCbuAlias(e.target.value);
                      }}
                      className="w-full text-sm px-4 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-black outline-none font-black text-[#000000] font-mono"
                    />
                    <span className="text-xs font-bold text-slate-700 mt-1 block">
                      Alias para transferencias inmediatas de señas sin comisiones.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  {/* CVU */}
                  <div>
                    <label className="text-xs font-black text-black uppercase tracking-wider block mb-1.5">
                      CVU de Mercado Pago (22 dígitos opcionales)
                    </label>
                    <input
                      type="text"
                      placeholder="0000003100085492109482"
                      value={mercadoPagoCvu}
                      onChange={(e) => setMercadoPagoCvu(e.target.value)}
                      className="w-full text-xs font-mono px-4 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-black outline-none font-bold text-[#000000]"
                    />
                  </div>

                  {/* Porcentaje sugerido de Seña */}
                  <div>
                    <label className="text-xs font-black text-black uppercase tracking-wider block mb-1.5">
                      Porcentaje sugerido de seña (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="10"
                        max="100"
                        step="5"
                        value={defaultDepositPercentage}
                        onChange={(e) => setDefaultDepositPercentage(Number(e.target.value))}
                        className="w-28 text-sm px-4 py-3 rounded-xl border-2 border-slate-300 bg-white focus:border-black outline-none font-black text-[#000000]"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        (% calculado automáticamente al agendar cada turno, ej. 30% o 50%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción y Soporte Técnico WhatsApp */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('¿Restablecer los datos de ejemplo del salón?')) {
                        await resetToSampleData();
                      }
                    }}
                    className="text-xs font-black text-slate-900 hover:text-black flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-900" />
                    <span>Restaurar datos de muestra</span>
                  </button>

                  <a
                    href={SUPPORT_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-black text-emerald-900 hover:text-emerald-950 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer"
                    title="Abrir soporte técnico por WhatsApp con Iris Quiroz"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                    <span>Soporte Técnico</span>
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
