import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ViewTab, AgendaMode, Appointment } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { UpcomingTodayWidget } from './components/UpcomingTodayWidget';
import { AgendaHeader } from './components/agenda/AgendaHeader';
import { AgendaDayView } from './components/agenda/AgendaDayView';
import { AgendaWeekView } from './components/agenda/AgendaWeekView';
import { AgendaMonthView } from './components/agenda/AgendaMonthView';
import { ClientsView } from './components/clients/ClientsView';import { AgendaStaffView } from './components/agenda/AgendaStaffView';
import { ServicesView } from './components/services/ServicesView';
import { StaffView } from './components/staff/StaffView';
import { CashView } from './components/cash/CashView';
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
  const [selectedStaffId, setSelectedStaffId] = useState<string>('todos');

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

  const handleOpenNewAppointment = (date?: string, time?: string, staffId?: string) => {
    setAppointmentToEdit(null);
    if (date) setCurrentDate(date);
    setSlotInitialTime(time);
    setSlotInitialStaffId(staffId);
    setIsAppointmentModalOpen(true);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setSelectedAppointmentForDetail(null);
    setAppointmentToEdit(apt);
    setIsAppointmentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#e6edf5] flex text-slate-900 font-sans antialiased">
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
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                agendaMode={agendaMode}
                onModeChange={setAgendaMode}
                selectedStaffId={selectedStaffId}
                onStaffChange={setSelectedStaffId}
                onNewAppointment={() => handleOpenNewAppointment()}
              />

              {/* Views */}
              {agendaMode === 'dia' && (
                <AgendaDayView
                  currentDate={currentDate}
                  selectedStaffId={selectedStaffId}
                  onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
                  onSlotClick={(time) => handleOpenNewAppointment(currentDate, time)}
                  onOpenWhatsApp={(apt) => setAppointmentForWhatsApp(apt)}
                />
              )}

              {agendaMode === 'semana' && (
                <AgendaWeekView
                  currentDate={currentDate}
                  selectedStaffId={selectedStaffId}
                  onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
                  onDayClick={(dayDate) => {
                    setCurrentDate(dayDate);
                    setAgendaMode('dia');
                  }}
                />
              )}

              {agendaMode === 'mes' && (
                <AgendaMonthView
                  currentDate={currentDate}
                  selectedStaffId={selectedStaffId}
                  onSelectDay={(dayDate) => {
                    setCurrentDate(dayDate);
                    setAgendaMode('dia');
                  }}
                  onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
                />
              )}  
              {agendaMode === 'staff' && (
                <AgendaStaffView
                  currentDate={currentDate}
                  onSelectAppointment={(apt) => {
                    setSelectedAppointmentForDetail(apt);
                  }}
                  onSelectSlot={(staffId, time) => {
                    handleOpenNewAppointment(currentDate, time, staffId);
                  }}
                />
              )}
            </div>
          )}

          {currentTab === 'clientes' && (
            <ClientsView
              onSelectAppointment={(apt) => setSelectedAppointmentForDetail(apt)}
            />
          )}

          {currentTab === 'servicios' && <ServicesView />}

          {currentTab === 'profesionales' && <StaffView />}

          {currentTab === 'caja' && <CashView />}

          {currentTab === 'reportes' && <ReportsView />}

          {currentTab === 'exportar' && <ExportView />}

          {currentTab === 'configuracion' && <SettingsView />}
        </main>

        {/* Footer (Professional Whitelabel SaaS - Fixed & Protected Iris Quiroz Credits) */}
        <footer className="no-print mt-auto border-t-2 border-slate-300 bg-[#e2e8f0] py-4 px-6 text-center text-xs text-slate-700">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <strong className="text-slate-900 font-extrabold">{business?.name || 'Tu Agenda Lista'}</strong>
              <span className="text-slate-400">© {new Date().getFullYear()}</span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-slate-700 font-bold">
                Desarrollado por <strong className="text-slate-950 font-black tracking-tight">Iris Quiroz</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 justify-center sm:justify-end">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                <span>Período de Prueba Activo (7 Días Gratis) · $45.000 / mes</span>
              </span>
              <span className="hidden md:inline text-[11px] text-slate-700 font-bold">Web & Celular</span>
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
          initialDate={currentDate}
          initialTime={slotInitialTime}
          initialStaffId={slotInitialStaffId || (selectedStaffId !== 'todos' ? selectedStaffId : undefined)}
          appointmentToEdit={appointmentToEdit}
          onClose={() => {
            setIsAppointmentModalOpen(false);
            setAppointmentToEdit(null);
            setSlotInitialTime(undefined);
            setSlotInitialStaffId(undefined);
          }}
          onSaved={(savedApt) => {
            setIsAppointmentModalOpen(false);
            setAppointmentToEdit(null);
            setSlotInitialTime(undefined);
            setSlotInitialStaffId(undefined);
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

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}


  
         
            
       
        
        
    





          
    

        

     
  
 
           

      


                  
       
    
         
           
         
    


  
