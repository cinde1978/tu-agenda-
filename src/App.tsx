import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ViewTab, AgendaMode, StaffSubMode, BranchId, Appointment } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { UpcomingTodayWidget } from './components/UpcomingTodayWidget';
import { AgendaHeader } from './components/agenda/AgendaHeader';
import { AgendaDayView } from './components/agenda/AgendaDayView';
import { AgendaWeekView } from './components/agenda/AgendaWeekView';
import { AgendaMonthView } from './components/agenda/AgendaMonthView';
import { ClientsView } from './components/clients/ClientsView';
import { AgendaStaffView } from './components/agenda/AgendaStaffView';
import { ServicesView } from './components/services/ServicesView';
import { StaffView } from './components/staff/StaffView';
import { CashView } from './components/cash/CashView';
import { GiftCardsView } from './components/giftcards/GiftCardsView';
import { ResourcesView } from './components/resources/ResourcesView';
import { ReportsView } from './components/reports/ReportsView';
import { ExportView } from './components/export/ExportView';
import { SettingsView } from './components/SettingsView';
import { AppointmentModal } from './components/AppointmentModal';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { RemindersModal } from './components/reminders/RemindersModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { getTodayDateString } from './utils/initialData';
import { Sparkles, LogIn, Plus, X } from 'lucide-react';

function MainAppContent() {
  const { user, loginWithGoogle, business, unreadRemindersCount, staff } = useApp();

  const [currentTab, setCurrentTab] = useState<ViewTab>('agenda');
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());
  const [agendaMode, setAgendaMode] = useState<AgendaMode>('dia');
  const [staffSubMode, setStaffSubMode] = useState<StaffSubMode>('dia');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('todos');

  const safeCurrentDate = /^\d{4}-\d{2}-\d{2}$/.test(currentDate)
    ? currentDate
    : getTodayDateString();

  const handleSafeDateChange = (nextDate: string) => {
    if (nextDate && /^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      setCurrentDate(nextDate);
    }
  };

  // Reset staff filter if deleted
  React.useEffect(() => {
    if (selectedStaffId !== 'todos' && !staff.some((s) => s.id === selectedStaffId)) {
      setSelectedStaffId('todos');
    }
  }, [staff, selectedStaffId]);

  // Dismissible cloud sync prompt
  const [isCloudBannerDismissed, setIsCloudBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('cloud_sync_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // Modals state
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [selectedAppointmentForDetail, setSelectedAppointmentForDetail] = useState<Appointment | null>(null);
  const [appointmentForWhatsApp, setAppointmentForWhatsApp] = useState<Appointment | null>(null);
  const [slotInitialTime, setSlotInitialTime] = useState<string | undefined>(undefined);
  const [slotInitialStaffId, setSlotInitialStaffId] = useState<string | undefined>(undefined);
  const [slotInitialClientId, setSlotInitialClientId] = useState<string | undefined>(undefined);
  const [slotInitialBranchId, setSlotInitialBranchId] = useState<BranchId | undefined>(undefined);

  const handleOpenNewAppointment = (
    date?: string,
    time?: string,
    staffId?: string,
    clientId?: string,
    branchId?: BranchId
  ) => {
    setAppointmentToEdit(null);
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setCurrentDate(date);
    }
    setSlotInitialTime(time);
    setSlotInitialStaffId(staffId);
    setSlotInitialClientId(clientId);
    setSlotInitialBranchId(branchId);
    setIsAppointmentModalOpen(true);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setSelectedAppointmentForDetail(null);
    setAppointmentToEdit(apt);
    setIsAppointmentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white flex text-[#0F172A] font-sans antialiased">
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onNewAppointment={() => handleOpenNewAppointment()}
        onOpenReminders={() => setIsRemindersModalOpen(true)}
      />

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-0">
        {/* PWA Install Suggestion Banner */}
        <PWAInstallBanner />

        {/* Optional cloud sync banner (dismissible) */}
        {!user && !isCloudBannerDismissed && (
          <div className="no-print bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white text-xs py-1.5 px-4 shadow-xs">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                <span className="truncate">
                  <strong>Sincronización en la nube:</strong> Tus turnos se guardan de forma instantánea. Conecta Google para sincronizar en tiempo real.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-900 rounded-lg font-bold text-[11px] shrink-0 flex items-center gap-1 transition-colors shadow-xs"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Conectar Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCloudBannerDismissed(true);
                    try {
                      sessionStorage.setItem('cloud_sync_banner_dismissed', 'true');
                    } catch {}
                  }}
                  className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition-colors"
                  title="Cerrar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Header & Mobile Nav Bar */}
        <Header
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onNewAppointment={() => handleOpenNewAppointment()}
          onOpenReminders={() => setIsRemindersModalOpen(true)}
        />

        {/* Main Workspace Body with safe bottom padding for mobile navigation */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8 space-y-6">
          {currentTab === 'agenda' && (
            <div className="space-y-6">
              {/* Upcoming Appointments of the Day Widget */}
              <UpcomingTodayWidget
                onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
                onOpenWhatsApp={(apt) => setAppointmentForWhatsApp(apt)}
                onNewAppointment={() => handleOpenNewAppointment()}
              />

              {/* Agenda Navigation Bar */}
              <AgendaHeader
                currentDate={safeCurrentDate}
                onDateChange={handleSafeDateChange}
                agendaMode={agendaMode}
                onModeChange={setAgendaMode}
                staffSubMode={staffSubMode}
                onStaffSubModeChange={setStaffSubMode}
                selectedStaffId={selectedStaffId}
                onStaffChange={setSelectedStaffId}
                onNewAppointment={() => handleOpenNewAppointment()}
              />

              {/* Views */}
              {agendaMode === 'dia' && (
                <AgendaDayView
                  currentDate={safeCurrentDate}
                  selectedStaffId={selectedStaffId}
                  onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
                  onSlotClick={(time, staffIdFromSlot, branchIdFromSlot) =>
                    handleOpenNewAppointment(safeCurrentDate, time, staffIdFromSlot, undefined, branchIdFromSlot)
                  }
                  onOpenWhatsApp={(apt) => setAppointmentForWhatsApp(apt)}
                  onNewAppointment={() => handleOpenNewAppointment(safeCurrentDate)}
                  onGoToStaff={() => setCurrentTab('profesionales')}
                />
              )}

              {agendaMode === 'semana' && (
                <AgendaWeekView
                  currentDate={safeCurrentDate}
                  selectedStaffId={selectedStaffId}
                  onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
                  onDayClick={(dayDate) => {
                    handleSafeDateChange(dayDate);
                    setAgendaMode('dia');
                  }}
                  onNewAppointment={(dayDate) => handleOpenNewAppointment(dayDate || safeCurrentDate)}
                  onGoToStaff={() => setCurrentTab('profesionales')}
                />
              )}

              {agendaMode === 'mes' && (
                <AgendaMonthView
                  currentDate={safeCurrentDate}
                  selectedStaffId={selectedStaffId}
                  onSelectDay={(dayDate) => {
                    handleSafeDateChange(dayDate);
                    setAgendaMode('dia');
                  }}
                  onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
                  onNewAppointment={(dayDate) => handleOpenNewAppointment(dayDate || safeCurrentDate)}
                  onGoToStaff={() => setCurrentTab('profesionales')}
                />
              )}

              {agendaMode === 'staff' && (
                <AgendaStaffView
                  currentDate={safeCurrentDate}
                  staffSubMode={staffSubMode}
                  onStaffSubModeChange={setStaffSubMode}
                  onDateChange={handleSafeDateChange}
                  onSelectAppointment={(apt) => {
                    setSelectedAppointmentForDetail(apt);
                  }}
                  onSelectSlot={(staffId, time, slotDate, slotBranch) => {
                    handleOpenNewAppointment(
                      slotDate || safeCurrentDate,
                      time,
                      staffId,
                      undefined,
                      slotBranch
                    );
                  }}
                  onNewAppointment={() => handleOpenNewAppointment(safeCurrentDate)}
                />
              )}
            </div>
          )}

          {currentTab === 'clientes' && (
            <ClientsView
              onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
              onNewAppointmentForClient={(cliId) => {
                handleOpenNewAppointment(undefined, undefined, undefined, cliId);
              }}
            />
          )}

          {currentTab === 'servicios' && <ServicesView />}

          {currentTab === 'profesionales' && <StaffView />}

          {currentTab === 'recursos' && <ResourcesView />}

          {currentTab === 'caja' && <CashView />}

          {currentTab === 'giftcards' && <GiftCardsView />}

          {currentTab === 'reportes' && <ReportsView />}

          {currentTab === 'exportar' && <ExportView />}

          {currentTab === 'configuracion' && <SettingsView />}
        </main>

        {/* Footer (Professional Whitelabel SaaS - Fixed & Protected Iris Quiroz Credits) */}
        <footer className="no-print mt-auto border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-[#0F172A]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <strong className="text-[#0F172A] font-extrabold">{business?.name || 'Tu Agenda Lista'}</strong>
              <span className="text-slate-500 font-semibold">© {new Date().getFullYear()}</span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-[#0F172A] font-bold">
                Desarrollado por <strong className="text-[#0F172A] font-black tracking-tight">Iris Quiroz</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#0F172A] justify-center sm:justify-end">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0F172A] bg-white px-3 py-1 rounded-lg border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                <span>Soham Montevideo · Soham Rioja</span>
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating Action Button for Mobile screens (shown only on Agenda tab so it doesn't overlap tables) */}
      {currentTab === 'agenda' && (
        <div className="fixed lg:hidden bottom-20 right-4 z-30">
          <button
            type="button"
            onClick={() => handleOpenNewAppointment()}
            className="w-14 h-14 rounded-full bg-[#0F172A] hover:bg-black text-white shadow-2xl shadow-slate-900/40 border-2 border-white/20 flex items-center justify-center transition-transform active:scale-90 hover:scale-105 cursor-pointer"
            title="Nuevo Turno"
            aria-label="Nuevo Turno"
          >
            <Plus className="w-7 h-7 text-white stroke-[3.5]" />
          </button>
        </div>
      )}

      {/* Modals */}
      {isAppointmentModalOpen && (
        <AppointmentModal
          initialDate={safeCurrentDate}
          initialTime={slotInitialTime}
          initialStaffId={slotInitialStaffId || (selectedStaffId !== 'todos' ? selectedStaffId : undefined)}
          initialClientId={slotInitialClientId}
          initialBranchId={slotInitialBranchId}
          appointmentToEdit={appointmentToEdit}
          onClose={() => {
            setIsAppointmentModalOpen(false);
            setAppointmentToEdit(null);
            setSlotInitialTime(undefined);
            setSlotInitialStaffId(undefined);
            setSlotInitialClientId(undefined);
            setSlotInitialBranchId(undefined);
          }}
          onSaved={(savedApt) => {
            setIsAppointmentModalOpen(false);
            setAppointmentToEdit(null);
            setSlotInitialTime(undefined);
            setSlotInitialStaffId(undefined);
            setSlotInitialClientId(undefined);
            setSlotInitialBranchId(undefined);
            if (savedApt.date) {
              handleSafeDateChange(savedApt.date);
            }
            if (selectedStaffId !== 'todos' && savedApt.staffId && selectedStaffId !== savedApt.staffId) {
              setSelectedStaffId('todos');
            }
            // Open the detail modal for review and WhatsApp OK confirmation
            setSelectedAppointmentForDetail(savedApt);
          }}
        />
      )}

      {selectedAppointmentForDetail && (
        <AppointmentDetailModal
          appointment={selectedAppointmentForDetail}
          onClose={() => setSelectedAppointmentForDetail(null)}
          onEdit={handleEditAppointment}
        />
      )}

      {appointmentForWhatsApp && business && (
        <WhatsAppModal
          appointment={appointmentForWhatsApp}
          business={business}
          onClose={() => setAppointmentForWhatsApp(null)}
        />
      )}

      {isRemindersModalOpen && (
        <RemindersModal
          onClose={() => setIsRemindersModalOpen(false)}
          onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
          onOpenWhatsApp={(apt) => setAppointmentForWhatsApp(apt)}
        />
      )}
    </div>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Error inesperado de renderizado' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 max-w-md w-full space-y-4 text-center shadow-lg">
            <h2 className="text-lg font-black text-[#0F172A]">Se recuperó la vista automáticamente</h2>
            <p className="text-xs text-slate-600 font-semibold">{this.state.errorMessage}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="px-4 py-2.5 bg-[#1E3A8A] text-white rounded-xl text-xs font-black cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </AppErrorBoundary>
  );
}
