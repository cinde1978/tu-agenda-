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
  AlertCircle,
  Plus,
  Save
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
  onNewAppointmentForClient?: (clientId: string) => void;
}

export function ClientDetailDrawer({
  client,
  onClose,
  onEditClient,
  onSelectAppointment,
  onNewAppointmentForClient,
}: ClientDetailDrawerProps) {
  const { business, allAppointments, deleteClient, staff, treatmentRecords, createTreatmentRecord } = useApp();
  const [selectedWhatsAppApt, setSelectedWhatsAppApt] = useState<Appointment | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [savingTreatment, setSavingTreatment] = useState(false);
  const [treatmentError, setTreatmentError] = useState('');
  const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [treatmentDate, setTreatmentDate] = useState(localToday);
  const [professionalId, setProfessionalId] = useState('');
  const [treatmentName, setTreatmentName] = useState('');
  const [treatmentZones, setTreatmentZones] = useState('');
  const [treatmentObservations, setTreatmentObservations] = useState('');
  const clientTreatmentRecords = treatmentRecords
    .filter((record) => record.clientId === client.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const handleSaveTreatment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const professional = staff.find((member) => member.id === professionalId);
    if (!professional) {
      setTreatmentError('Seleccioná la profesional que realizó la sesión.');
      return;
    }
    setSavingTreatment(true);
    setTreatmentError('');
    try {
      await createTreatmentRecord({
        clientId: client.id,
        date: treatmentDate,
        professionalId: professional.id,
        professionalName: professional.name,
        treatmentName,
        zones: treatmentZones,
        observations: treatmentObservations,
      });
      setTreatmentName('');
      setTreatmentZones('');
      setTreatmentObservations('');
      setTreatmentDate(localToday());
      setProfessionalId('');
      setShowTreatmentForm(false);
    } catch (error) {
      setTreatmentError(error instanceof Error ? error.message : 'No se pudo guardar la sesión. Revisá la conexión e intentá nuevamente.');
    } finally {
      setSavingTreatment(false);
    }
  };

  // Filter client appointments across both branches
  const clientAppointments = allAppointments.filter(
    (a) => a.clientId === client.id || a.clientName.toLowerCase() === client.name.toLowerCase()
  );
  // Sort descending by date
  clientAppointments.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  // Compute calculated visits & total spent from appointments
  const completedAppointments = clientAppointments.filter((a) => a.status === 'completado');
  const calculatedTotalSpent = completedAppointments.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const totalVisitsCount = completedAppointments.length || client.totalVisits || 0;
  const displayTotalSpent = calculatedTotalSpent || client.totalSpent || 0;
  const hasLinkedHistory = clientAppointments.length > 0 || clientTreatmentRecords.length > 0 || Boolean(client.notes?.trim());

  const handleConfirmDelete = async (deleteTreatmentHistory: boolean = false) => {
    if (deletingClient) return;
    setDeletingClient(true);
    setDeleteError('');
    try {
      await deleteClient(client.id, deleteTreatmentHistory);
      setConfirmingDelete(false);
      onClose();
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      let detail = rawMessage;
      try {
        const parsed = JSON.parse(rawMessage);
        if (typeof parsed.error === 'string') detail = parsed.error;
      } catch {
        // Keep the original message when it is not structured.
      }
      if (detail.includes('permission-denied')) {
        setDeleteError('No se pudo eliminar porque la cuenta no tiene permiso. Avisale a Iris para revisar el acceso.');
      } else if (detail.includes('unavailable') || detail.includes('offline') || detail.includes('network')) {
        setDeleteError('No se pudo conectar. Revisá internet e intentá nuevamente. La ficha sigue guardada.');
      } else {
        setDeleteError('No se pudo eliminar la ficha. No se borraron los datos. Intentá nuevamente y, si continúa, avisale a Iris.');
      }
    } finally {
      setDeletingClient(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/45 backdrop-blur-xs">
        <div className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 text-[#0F172A]">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center font-black text-lg shadow-sm">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-black text-xl text-[#0F172A]">{client.name}</h3>
                <p className="text-xs text-slate-600 font-semibold">Cliente registrado</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onEditClient(client)}
                className="p-2 hover:bg-slate-100 rounded-xl text-[#0F172A] border border-slate-200 transition-colors cursor-pointer"
                title="Editar cliente"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete((prev) => !prev)}
                className="p-2 bg-red-700 hover:bg-red-800 text-white rounded-xl border border-red-800 transition-colors cursor-pointer shadow-xs"
                title="Eliminar cliente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl text-[#0F172A] transition-colors cursor-pointer"
                title="Cerrar ficha"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {confirmingDelete && (
            <div className="mx-6 mt-4 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <div className="text-xs text-[#0F172A] space-y-1">
                  <p className="font-black text-sm text-rose-950">
                    ¿Eliminar la ficha de "{client.name}"?
                  </p>
                  {clientTreatmentRecords.length > 0 ? (
                    <p className="font-semibold text-rose-900">
                      Esta clienta tiene <strong>{clientTreatmentRecords.length} sesión(es) de tratamiento</strong> registradas.
                      Para proteger su historial, no se puede eliminar esta ficha.
                    </p>
                  ) : hasLinkedHistory ? (
                    <p className="font-semibold text-rose-900">
                      Atención: este cliente registra{' '}
                      <strong>{clientAppointments.length} turno(s)</strong> en el historial
                      {client.notes?.trim() ? ' y notas técnicas guardadas' : ''}. Si lo eliminás,
                      los turnos existentes conservarán su nombre pero se borrará su ficha de contacto.
                    </p>
                  ) : (
                    <p className="font-semibold text-slate-700">
                      Este cliente no tiene turnos ni notas técnicas vinculadas.
                    </p>
                  )}
                </div>
              </div>
              {deleteError && <p role="alert" className="text-xs font-bold text-red-800">{deleteError}</p>}
              {clientTreatmentRecords.length > 0 && (
                <p className="text-xs font-bold text-red-900 bg-rose-50 border border-rose-200 rounded-lg p-2">
                  Atención: se eliminarán permanentemente la ficha y sus {clientTreatmentRecords.length} sesiones de tratamiento. Los turnos de agenda no se borrarán.
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setConfirmingDelete(false); setDeleteError(''); }}
                  disabled={deletingClient}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#1E3A8A] border-2 border-[#1E3A8A] text-xs font-black cursor-pointer shadow-2xs transition-colors"
                >
                  Cancelar
                </button>
                {clientTreatmentRecords.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleConfirmDelete(true)}
                    disabled={deletingClient}
                    className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white border-2 border-red-800 text-xs font-black cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingClient ? 'Eliminando...' : `Eliminar ficha y ${clientTreatmentRecords.length} sesión(es)`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConfirmDelete(false)}
                    disabled={deletingClient}
                    className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white border-2 border-red-800 text-xs font-black cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingClient ? 'Eliminando...' : 'Confirmar eliminación'}
                  </button>
                )}
              </div>
            </div>
          )}

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
                Antecedentes, alergias y observaciones
              </h4>
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#0F172A] leading-relaxed font-sans font-medium">
                {client.notes ? (
                  client.notes
                ) : (
                  <span className="italic text-slate-500">Sin notas técnicas o preferencias cargadas aún.</span>
                )}
              </div>
            </div>

            {/* Treatment History */}
            <div className="border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Historial de tratamientos ({clientTreatmentRecords.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">Registro compartido de cada sesión realizada.</p>
                </div>
                <button type="button" onClick={() => { setTreatmentError(''); setShowTreatmentForm((value) => !value); }} className="px-3 py-2 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Agregar sesión
                </button>
              </div>

              {showTreatmentForm && (
                <form onSubmit={handleSaveTreatment} className="mb-4 p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-slate-700 space-y-1 block">
                      Fecha
                      <input required type="date" value={treatmentDate} onChange={(e) => setTreatmentDate(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" />
                    </label>
                    <label className="text-xs font-bold text-slate-700 space-y-1 block">
                      Profesional
                      <select required value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">
                        <option value="">Seleccionar profesional</option>
                        {staff.filter((member) => member.active).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="text-xs font-bold text-slate-700 space-y-1 block">
                    Tratamiento realizado
                    <input required value={treatmentName} onChange={(e) => setTreatmentName(e.target.value)} placeholder="Ej.: maderoterapia, limpieza facial..." className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" />
                  </label>
                  <label className="text-xs font-bold text-slate-700 space-y-1 block">
                    Zonas trabajadas
                    <input value={treatmentZones} onChange={(e) => setTreatmentZones(e.target.value)} placeholder="Ej.: abdomen, piernas, rostro..." className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" />
                  </label>
                  <label className="text-xs font-bold text-slate-700 space-y-1 block">
                    Observaciones y evolución
                    <textarea value={treatmentObservations} onChange={(e) => setTreatmentObservations(e.target.value)} rows={3} placeholder="Anotar productos utilizados, respuesta de la piel, evolución y recomendaciones..." className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm resize-y" />
                  </label>
                  {treatmentError && <p role="alert" className="text-xs font-bold text-red-700">{treatmentError}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowTreatmentForm(false)} className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold">Cancelar</button>
                    <button type="submit" disabled={savingTreatment} className="px-3 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                      <Save className="w-3.5 h-3.5" /> {savingTreatment ? 'Guardando...' : 'Guardar sesión'}
                    </button>
                  </div>
                </form>
              )}

              {clientTreatmentRecords.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  Todavía no hay sesiones cargadas para esta clienta.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {clientTreatmentRecords.map((record) => (
                    <article key={record.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-sm text-slate-800">{record.treatmentName}</strong>
                        <span className="text-[11px] text-slate-500 shrink-0">{formatDateSpanishLong(record.date)}</span>
                      </div>
                      <p className="text-xs text-blue-800 font-bold">Profesional: {record.professionalName}</p>
                      {record.zones && <p className="text-xs text-slate-700"><strong>Zonas:</strong> {record.zones}</p>}
                      {record.observations && <p className="text-xs text-slate-600 whitespace-pre-wrap">{record.observations}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Appointment History */}
            <div>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Historial de Turnos ({clientAppointments.length})
                </h4>
                {onNewAppointmentForClient && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNewAppointmentForClient(client.id);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>+ Agendar Turno</span>
                  </button>
                )}
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
                          <div className="text-xs text-slate-600 font-semibold flex items-center gap-2 flex-wrap">
                            <span>{formatDateSpanishLong(apt.date)} a las {apt.time} hs</span>
                            <span>•</span>
                            <span>Con {apt.staffName}</span>
                            <span>•</span>
                            <span className="text-[#1E3A8A] font-bold">
                              {apt.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'}
                            </span>
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
