import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  FileText,
  Clock,
  Edit2,
  Trash2,
  DollarSign,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Client, Appointment } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateSpanishLong, getStatusBadge } from '../../utils/formatters';
import { WhatsAppModal } from '../WhatsAppModal';

interface ClientDetailDrawerProps {
  client: Client;
  onClose: () => void;
  onEditClient: (client: Client) => void;
  onSelectAppointment: (appointment: Appointment) => void;
}

export function ClientDetailDrawer({
  client,
  onClose,
  onEditClient,
  onSelectAppointment,
}: ClientDetailDrawerProps) {
  const { business, appointments, deleteClient } = useApp();
  const [selectedWhatsAppApt, setSelectedWhatsAppApt] = useState<Appointment | null>(null);

  // Filter client appointments
  const clientAppointments = appointments.filter((a) => a.clientId === client.id || a.clientName.toLowerCase() === client.name.toLowerCase());
  // Sort descending by date
  clientAppointments.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  // Compute calculated visits & total spent from appointments
  const completedAppointments = clientAppointments.filter((a) => a.status === 'completado');
  const calculatedTotalSpent = completedAppointments.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const totalVisitsCount = completedAppointments.length || client.totalVisits || 0;
  const displayTotalSpent = calculatedTotalSpent || client.totalSpent || 0;

  const handleDelete = async () => {
    if (confirm(`¿Estás seguro de eliminar el cliente "${client.name}"?`)) {
      await deleteClient(client.id);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
        <div className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900">{client.name}</h3>
                <p className="text-xs text-slate-500">Cliente registrado</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEditClient(client)}
                className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-600 transition-colors"
                title="Editar cliente"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                title="Eliminar cliente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">
                  Visitas Realizadas
                </div>
                <div className="text-2xl font-extrabold text-blue-900">{totalVisitsCount}</div>
                <div className="text-xs text-blue-500 mt-0.5">Turnos completados</div>
              </div>

              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100">
                <div className="text-xs text-sky-700 font-semibold uppercase tracking-wider mb-1">
                  Total Facturado
                </div>
                <div className="text-2xl font-extrabold text-sky-900">
                  {formatCurrency(displayTotalSpent, business?.currency)}
                </div>
                <div className="text-xs text-sky-600 mt-0.5">Inversión acumulada</div>
              </div>
            </div>

            {/* Contact info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{client.phone || 'Sin teléfono guardado'}</span>
                </div>
                {client.phone && business && (
                  <button
                    type="button"
                    onClick={() => {
                      // Create dummy appointment for WhatsApp modal
                      const dummyApt: Appointment = {
                        id: 'dummy',
                        businessId: business.id,
                        clientId: client.id,
                        clientName: client.name,
                        clientPhone: client.phone,
                        staffId: '',
                        staffName: 'Equipo',
                        serviceId: '',
                        serviceName: 'Consulta general',
                        date: new Date().toISOString().split('T')[0],
                        time: '10:00',
                        durationMinutes: 30,
                        price: 0,
                        depositAmount: 0,
                        remainingBalance: 0,
                        status: 'confirmado',
                        paymentMethod: 'efectivo',
                        notes: '',
                        createdAt: '',
                        updatedAt: '',
                      };
                      setSelectedWhatsAppApt(dummyApt);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>

              {client.email && (
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{client.email}</span>
                </div>
              )}

              {client.birthday && (
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Cumpleaños: {client.birthday}</span>
                </div>
              )}
            </div>

            {/* Technical Notes / Formulas */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Ficha Técnica & Preferencias
              </h4>
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#0F172A] leading-relaxed font-sans font-medium">
                {client.notes ? (
                  client.notes
                ) : (
                  <span className="italic text-slate-500">Sin notas técnicas o preferencias cargadas aún.</span>
                )}
              </div>
            </div>

            {/* Appointment History */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Historial de Turnos ({clientAppointments.length})
                </h4>
              </div>

              {clientAppointments.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  Este cliente aún no tiene turnos registrados en la agenda.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {clientAppointments.map((apt) => {
                    const status = getStatusBadge(apt.status);
                    return (
                      <div
                        key={apt.id}
                        onClick={() => {
                          onClose();
                          onSelectAppointment(apt);
                        }}
                        className="p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-xs bg-white cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800 group-hover:text-blue-600">
                              {apt.serviceName}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.bg}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{formatDateSpanishLong(apt.date)} a las {apt.time} hs</span>
                            <span>•</span>
                            <span>Con {apt.staffName}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-sm text-slate-900">
                            {formatCurrency(apt.price, business?.currency)}
                          </div>
                          {apt.remainingBalance > 0 && (
                            <div className="text-[10px] text-[#0F172A] font-bold">
                              Saldo: {formatCurrency(apt.remainingBalance, business?.currency)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedWhatsAppApt && business && (
        <WhatsAppModal
          appointment={selectedWhatsAppApt}
          business={business}
          onClose={() => setSelectedWhatsAppApt(null)}
        />
      )}
    </>
  );
}
