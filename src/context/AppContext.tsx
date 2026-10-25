import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  logOut,
  testConnection,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  Business,
  Client,
  Service,
  StaffMember,
  Appointment,
  CashMovement,
  BusinessConfigExport,
  BranchId,
  Branch,
  BRANCHES,
} from '../types';
import {
  getDefaultBusiness,
  getDefaultServices,
  getDefaultStaff,
  getDefaultClients,
  getDefaultAppointments,
  getDefaultCashMovements,
  getTodayDateString,
} from '../utils/initialData';

const LOCAL_STORAGE_KEY = 'tu_agenda_lista_data_v3';
const PREV_LOCAL_STORAGE_KEY = 'tu_agenda_lista_data_v2';

interface LocalStoredState {
  business: Business;
  services: Service[];
  staff: StaffMember[];
  clients: Client[];
  appointments: Appointment[];
  cashMovements: CashMovement[];
}

interface AppContextType {
  user: User | null;
  authLoading: boolean;
  isDemoMode: boolean;
  business: Business | null;
  clients: Client[];
  services: Service[];
  staff: StaffMember[];
  appointments: Appointment[];
  allAppointments: Appointment[];
  cashMovements: CashMovement[];
  allCashMovements: CashMovement[];
  selectedBranch: BranchId;
  setSelectedBranch: (branch: BranchId) => void;
  branches: Branch[];
  isLoadingData: boolean;
  hasFirestoreError: string | null;
  unreadRemindersCount: number;
  upcomingTodayAppointments: Appointment[];
  // Actions
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  enableDemoMode: () => void;
  updateBusiness: (updated: Partial<Business>) => Promise<void>;
  createAppointment: (apt: Omit<Appointment, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateAppointment: (apt: Appointment) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  markAppointmentCompleted: (apt: Appointment, collectedRemaining: number, paymentMethod: Appointment['paymentMethod']) => Promise<void>;
  createClient: (cli: Omit<Client, 'id' | 'businessId' | 'createdAt' | 'updatedAt' | 'totalVisits' | 'totalSpent'>) => Promise<string>;
  updateClient: (cli: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  createService: (srv: Omit<Service, 'id' | 'businessId' | 'createdAt'>) => Promise<string>;
  updateService: (srv: Service) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  createStaff: (stf: Omit<StaffMember, 'id' | 'businessId' | 'createdAt'>) => Promise<string>;
  updateStaff: (stf: StaffMember) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  createCashMovement: (mov: Omit<CashMovement, 'id' | 'businessId' | 'createdAt'>) => Promise<string>;
  deleteCashMovement: (id: string) => Promise<void>;
  resetToSampleData: () => Promise<void>;
  exportAppointmentsToCSV: (dateFilter?: string) => void;
  exportBusinessConfiguration: () => BusinessConfigExport;
  importBusinessConfiguration: (imported: BusinessConfigExport) => Promise<{ servicesCount: number; staffCount: number }>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rawAppointments, setRawAppointments] = useState<Appointment[]>([]);
  const [rawCashMovements, setRawCashMovements] = useState<CashMovement[]>([]);
  const setAppointments = setRawAppointments;
  const setCashMovements = setRawCashMovements;

  const [selectedBranch, setSelectedBranchState] = useState<BranchId>(() => {
    try {
      const saved = localStorage.getItem('tu_agenda_selected_branch');
      if (saved === 'sucursal_1' || saved === 'sucursal_2') return saved;
    } catch {}
    return 'sucursal_1';
  });

  const setSelectedBranch = useCallback((branch: BranchId) => {
    setSelectedBranchState(branch);
    try {
      localStorage.setItem('tu_agenda_selected_branch', branch);
    } catch {}
  }, []);

  // Filter automatically by selected branch
  const appointments = useMemo(() => {
    return rawAppointments.filter((apt) => (apt.branchId || 'sucursal_1') === selectedBranch);
  }, [rawAppointments, selectedBranch]);

  const cashMovements = useMemo(() => {
    return rawCashMovements.filter((mov) => (mov.branchId || 'sucursal_1') === selectedBranch);
  }, [rawCashMovements, selectedBranch]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasFirestoreError, setHasFirestoreError] = useState<string | null>(null);

  // Test Firestore connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen for Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setIsDemoMode(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Compute businessId: if signed in, derived from user.uid; if demo, "biz_local_active"
  const currentBusinessId = useMemo(() => {
    if (user) {
      return `biz_${user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
    }
    return 'biz_local_active';
  }, [user]);

  // Load from LocalStorage if not signed in
  useEffect(() => {
    if (authLoading) return;
    if (user) return; // Will sync from Firestore

    // Load local storage
    try {
      let stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        stored = localStorage.getItem(PREV_LOCAL_STORAGE_KEY);
      }

      if (stored) {
        const parsed: LocalStoredState = JSON.parse(stored);
        if (parsed.business) {
          if (!parsed.business.developerName || parsed.business.developerName === '[Tu Nombre]') {
            parsed.business.developerName = 'Iris Quiroz';
          }
          if (
            parsed.business.name === 'TU AGENDA LISTA' ||
            parsed.business.name === 'Tu Agenda Lista Pro' ||
            parsed.business.name === '[Tu Nombre o Marca]'
          ) {
            parsed.business.name = 'Tu Agenda Lista';
          }
          if (
            !parsed.business.tagline ||
            parsed.business.tagline === 'Gestión Profesional de Turnos' ||
            parsed.business.tagline === 'Desarrollado por [Tu Nombre]'
          ) {
            parsed.business.tagline = 'Desarrollado por Iris Quiroz';
          }
        }

        // Filter out any legacy hair salon or barber services
        const isHairSalon = (name: string, category: string) => {
          const n = (name || '').toLowerCase();
          const c = (category || '').toLowerCase();
          return (
            c.includes('peluquer') ||
            c.includes('barber') ||
            n.includes('corte') ||
            n.includes('balayage') ||
            n.includes('peinado') ||
            n.includes('barba') ||
            n.includes('coloración') ||
            n.includes('brushing')
          );
        };

        let validServices = (parsed.services || []).filter((s) => !isHairSalon(s.name, s.category));
        if (validServices.length === 0) {
          validServices = getDefaultServices('biz_local_active');
        }

        let validStaff = parsed.staff || [];
        const hasAestheticStaff = validStaff.some((st) =>
          ['Camila Rossi', 'Valeria Gómez', 'Lucas Medina'].includes(st.name)
        );
        const onlyHasOldSampleStaff = validStaff.length > 0 && validStaff.every((st) =>
          ['Valentina Rivas', 'Lucía Fernández', 'Mateo Benítez'].includes(st.name)
        );
        if (validStaff.length === 0 || (onlyHasOldSampleStaff && !hasAestheticStaff)) {
          validStaff = getDefaultStaff('biz_local_active');
        }

        setBusiness(parsed.business || getDefaultBusiness('local_owner', 'Tu Agenda Lista'));
        setServices(validServices);
        setStaff(validStaff);
        setClients(parsed.clients || getDefaultClients('biz_local_active'));
        setAppointments(parsed.appointments && parsed.appointments.length > 0 ? parsed.appointments : getDefaultAppointments('biz_local_active'));
        setCashMovements(parsed.cashMovements && parsed.cashMovements.length > 0 ? parsed.cashMovements : getDefaultCashMovements('biz_local_active'));
        setIsDemoMode(false);
        setIsLoadingData(false);
        return;
      }
    } catch (e) {
      console.warn('Could not read from local storage', e);
    }

    // Default initial seed if nothing stored
    const defaultBiz = getDefaultBusiness('local_owner', 'Tu Agenda Lista');
    defaultBiz.id = 'biz_local_active';
    setBusiness(defaultBiz);
    setServices(getDefaultServices('biz_local_active'));
    setStaff(getDefaultStaff('biz_local_active'));
    setClients(getDefaultClients('biz_local_active'));
    setAppointments(getDefaultAppointments('biz_local_active'));
    setCashMovements(getDefaultCashMovements('biz_local_active'));
    setIsLoadingData(false);
  }, [user, authLoading]);

  // Save to LocalStorage whenever state changes (offline & local first guarantee)
  useEffect(() => {
    if (!business) return;
    try {
      const stateToStore: LocalStoredState = {
        business,
        services,
        staff,
        clients,
        appointments: rawAppointments,
        cashMovements: rawCashMovements,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
    } catch (e) {
      console.warn('Error saving to localStorage', e);
    }
  }, [business, services, staff, clients, rawAppointments, rawCashMovements]);

  // Sync with Firestore when User is signed in
  useEffect(() => {
    if (!user || !currentBusinessId) return;

    setIsLoadingData(true);
    setHasFirestoreError(null);

    const bizDocRef = doc(db, 'businesses', currentBusinessId);
    const unsubs: (() => void)[] = [];

    const unsubBiz = onSnapshot(
      bizDocRef,
      async (snap) => {
        if (snap.exists()) {
          setBusiness(snap.data() as Business);
        } else {
          // Initialize business in Firestore using local state or defaults
          const initialBiz = business || getDefaultBusiness(user.uid, user.displayName ? `Agenda de ${user.displayName}` : 'Tu Agenda Lista');
          initialBiz.id = currentBusinessId;
          initialBiz.ownerId = user.uid;
          try {
            await setDoc(bizDocRef, initialBiz);
            setBusiness(initialBiz);

            const batch = writeBatch(db);
            const srvs = services.length > 0 ? services : getDefaultServices(currentBusinessId);
            srvs.forEach((srv) => {
              batch.set(doc(db, `businesses/${currentBusinessId}/services`, srv.id), { ...srv, businessId: currentBusinessId });
            });

            const stf = staff.length > 0 ? staff : getDefaultStaff(currentBusinessId);
            stf.forEach((s) => {
              batch.set(doc(db, `businesses/${currentBusinessId}/staff`, s.id), { ...s, businessId: currentBusinessId });
            });

            const cli = clients.length > 0 ? clients : getDefaultClients(currentBusinessId);
            cli.forEach((c) => {
              batch.set(doc(db, `businesses/${currentBusinessId}/clients`, c.id), { ...c, businessId: currentBusinessId });
            });

            const apt = appointments.length > 0 ? appointments : getDefaultAppointments(currentBusinessId);
            apt.forEach((a) => {
              batch.set(doc(db, `businesses/${currentBusinessId}/appointments`, a.id), { ...a, businessId: currentBusinessId });
            });

            const csh = cashMovements.length > 0 ? cashMovements : getDefaultCashMovements(currentBusinessId);
            csh.forEach((m) => {
              batch.set(doc(db, `businesses/${currentBusinessId}/cashMovements`, m.id), { ...m, businessId: currentBusinessId });
            });

            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `businesses/${currentBusinessId}`);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `businesses/${currentBusinessId}`);
      }
    );
    unsubs.push(unsubBiz);

    // Sync subcollections
    const clientsRef = collection(db, `businesses/${currentBusinessId}/clients`);
    const unsubClients = onSnapshot(
      clientsRef,
      (snapshot) => {
        const list: Client[] = [];
        snapshot.forEach((d) => list.push(d.data() as Client));
        if (list.length > 0) setClients(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `businesses/${currentBusinessId}/clients`);
      }
    );
    unsubs.push(unsubClients);

    const servicesRef = collection(db, `businesses/${currentBusinessId}/services`);
    const unsubServices = onSnapshot(
      servicesRef,
      (snapshot) => {
        const list: Service[] = [];
        snapshot.forEach((d) => list.push(d.data() as Service));
        if (list.length > 0) setServices(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `businesses/${currentBusinessId}/services`);
      }
    );
    unsubs.push(unsubServices);

    const staffRef = collection(db, `businesses/${currentBusinessId}/staff`);
    const unsubStaff = onSnapshot(
      staffRef,
      (snapshot) => {
        const list: StaffMember[] = [];
        snapshot.forEach((d) => list.push(d.data() as StaffMember));
        if (list.length > 0) setStaff(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `businesses/${currentBusinessId}/staff`);
      }
    );
    unsubs.push(unsubStaff);

    const appointmentsRef = collection(db, `businesses/${currentBusinessId}/appointments`);
    const unsubAppointments = onSnapshot(
      appointmentsRef,
      (snapshot) => {
        const list: Appointment[] = [];
        snapshot.forEach((d) => list.push(d.data() as Appointment));
        setAppointments(list);
        setIsLoadingData(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `businesses/${currentBusinessId}/appointments`);
      }
    );
    unsubs.push(unsubAppointments);

    const cashRef = collection(db, `businesses/${currentBusinessId}/cashMovements`);
    const unsubCash = onSnapshot(
      cashRef,
      (snapshot) => {
        const list: CashMovement[] = [];
        snapshot.forEach((d) => list.push(d.data() as CashMovement));
        setCashMovements(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `businesses/${currentBusinessId}/cashMovements`);
      }
    );
    unsubs.push(unsubCash);

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [user, currentBusinessId]);

  // Compute upcoming appointments for today and reminders
  const todayStr = getTodayDateString();
  const upcomingTodayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === todayStr && a.status !== 'cancelado')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, todayStr]);

  const unreadRemindersCount = useMemo(() => {
    return upcomingTodayAppointments.filter((a) => a.status === 'pendiente' || a.status === 'confirmado').length;
  }, [upcomingTodayAppointments]);

  // Auth methods
  const loginWithGoogle = useCallback(async () => {
    try {
      setHasFirestoreError(null);
      await signInWithGoogle();
      setIsDemoMode(false);
    } catch (err: unknown) {
      console.error('Login error:', err);
      throw err;
    }
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await logOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
  }, []);

  // Update business profile
  const updateBusiness = useCallback(
    async (updated: Partial<Business>) => {
      if (!business) return;
      const merged: Business = {
        ...business,
        ...updated,
        developerName: 'Iris Quiroz', // Protected master SaaS license - immutable
        tagline: 'Desarrollado por Iris Quiroz',
        updatedAt: getTodayDateString(),
      };
      setBusiness(merged);

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, 'businesses', currentBusinessId), merged, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}`);
        }
      }
    },
    [business, currentBusinessId, user]
  );

  // Appointments actions
  const createAppointment = useCallback(
    async (aptData: Omit<Appointment, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      const id = `apt_${Date.now()}`;
      const today = getTodayDateString();
      const newApt: Appointment = {
        ...aptData,
        id,
        businessId: currentBusinessId,
        branchId: aptData.branchId || selectedBranch,
        createdAt: today,
        updatedAt: today,
      };

      setAppointments((prev) => [newApt, ...prev]);

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/appointments`, id), newApt);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/appointments/${id}`);
        }
      }
      return id;
    },
    [currentBusinessId, user, selectedBranch]
  );

  const updateAppointment = useCallback(
    async (apt: Appointment) => {
      const updated: Appointment = {
        ...apt,
        updatedAt: getTodayDateString(),
      };
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? updated : a)));

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/appointments`, apt.id), updated);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/appointments/${apt.id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  const deleteAppointment = useCallback(
    async (id: string) => {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      if (user && currentBusinessId) {
        try {
          await deleteDoc(doc(db, `businesses/${currentBusinessId}/appointments`, id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `businesses/${currentBusinessId}/appointments/${id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  const markAppointmentCompleted = useCallback(
    async (apt: Appointment, collectedRemaining: number, paymentMethod: Appointment['paymentMethod']) => {
      const updatedApt: Appointment = {
        ...apt,
        status: 'completado',
        remainingBalance: Math.max(0, apt.remainingBalance - collectedRemaining),
        paymentMethod: paymentMethod,
        updatedAt: getTodayDateString(),
      };

      await updateAppointment(updatedApt);

      if (collectedRemaining > 0) {
        const cashId = `csh_${Date.now()}`;
        const mov: CashMovement = {
          id: cashId,
          businessId: currentBusinessId,
          branchId: apt.branchId || selectedBranch,
          date: apt.date,
          type: 'ingreso',
          category: 'saldo',
          amount: collectedRemaining,
          paymentMethod: paymentMethod,
          description: `Cobro turno ${apt.clientName} (${apt.serviceName})`,
          appointmentId: apt.id,
          createdAt: getTodayDateString(),
        };

        setCashMovements((prev) => [mov, ...prev]);

        if (user && currentBusinessId) {
          try {
            await setDoc(doc(db, `businesses/${currentBusinessId}/cashMovements`, cashId), mov);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/cashMovements/${cashId}`);
          }
        }
      }

      // Update client visit statistics
      if (apt.clientId) {
        const client = clients.find((c) => c.id === apt.clientId);
        if (client) {
          const updatedClient: Client = {
            ...client,
            totalVisits: (client.totalVisits || 0) + 1,
            totalSpent: (client.totalSpent || 0) + apt.price,
            updatedAt: getTodayDateString(),
          };
          setClients((prev) => prev.map((c) => (c.id === client.id ? updatedClient : c)));
          if (user && currentBusinessId) {
            try {
              await setDoc(doc(db, `businesses/${currentBusinessId}/clients`, client.id), updatedClient);
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/clients/${client.id}`);
            }
          }
        }
      }
    },
    [currentBusinessId, updateAppointment, user, clients]
  );

  // Client actions
  const createClient = useCallback(
    async (cliData: Omit<Client, 'id' | 'businessId' | 'createdAt' | 'updatedAt' | 'totalVisits' | 'totalSpent'>): Promise<string> => {
      const id = `cli_${Date.now()}`;
      const today = getTodayDateString();
      const newClient: Client = {
        ...cliData,
        id,
        businessId: currentBusinessId,
        totalVisits: 0,
        totalSpent: 0,
        createdAt: today,
        updatedAt: today,
      };

      setClients((prev) => [newClient, ...prev]);

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/clients`, id), newClient);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/clients/${id}`);
        }
      }
      return id;
    },
    [currentBusinessId, user]
  );

  const updateClient = useCallback(
    async (cli: Client) => {
      const updated: Client = {
        ...cli,
        updatedAt: getTodayDateString(),
      };
      setClients((prev) => prev.map((c) => (c.id === cli.id ? updated : c)));

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/clients`, cli.id), updated);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/clients/${cli.id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  const deleteClient = useCallback(
    async (id: string) => {
      setClients((prev) => prev.filter((c) => c.id !== id));
      if (user && currentBusinessId) {
        try {
          await deleteDoc(doc(db, `businesses/${currentBusinessId}/clients`, id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `businesses/${currentBusinessId}/clients/${id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  // Service actions
  const createService = useCallback(
    async (srvData: Omit<Service, 'id' | 'businessId' | 'createdAt'>): Promise<string> => {
      const id = `srv_${Date.now()}`;
      const today = getTodayDateString();
      const newService: Service = {
        ...srvData,
        id,
        businessId: currentBusinessId,
        createdAt: today,
      };

      setServices((prev) => [newService, ...prev]);

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/services`, id), newService);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/services/${id}`);
        }
      }
      return id;
    },
    [currentBusinessId, user]
  );

  const updateService = useCallback(
    async (srv: Service) => {
      setServices((prev) => prev.map((s) => (s.id === srv.id ? srv : s)));
      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/services`, srv.id), srv);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/services/${srv.id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  const deleteService = useCallback(
    async (id: string) => {
      setServices((prev) => prev.filter((s) => s.id !== id));
      if (user && currentBusinessId) {
        try {
          await deleteDoc(doc(db, `businesses/${currentBusinessId}/services`, id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `businesses/${currentBusinessId}/services/${id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  // Staff actions
  const createStaff = useCallback(
    async (stfData: Omit<StaffMember, 'id' | 'businessId' | 'createdAt'>): Promise<string> => {
      const id = `stf_${Date.now()}`;
      const today = getTodayDateString();
      const newStaff: StaffMember = {
        ...stfData,
        id,
        businessId: currentBusinessId,
        createdAt: today,
      };

      setStaff((prev) => [newStaff, ...prev]);

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/staff`, id), newStaff);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/staff/${id}`);
        }
      }
      return id;
    },
    [currentBusinessId, user]
  );

  const updateStaff = useCallback(
    async (stf: StaffMember) => {
      setStaff((prev) => prev.map((s) => (s.id === stf.id ? stf : s)));
      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/staff`, stf.id), stf);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/staff/${stf.id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  const deleteStaff = useCallback(
    async (id: string) => {
      setStaff((prev) => prev.filter((s) => s.id !== id));
      if (user && currentBusinessId) {
        try {
          await deleteDoc(doc(db, `businesses/${currentBusinessId}/staff`, id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `businesses/${currentBusinessId}/staff/${id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  // Cash movement actions
  const createCashMovement = useCallback(
    async (movData: Omit<CashMovement, 'id' | 'businessId' | 'createdAt'>): Promise<string> => {
      const id = `csh_${Date.now()}`;
      const today = getTodayDateString();
      const newMovement: CashMovement = {
        ...movData,
        id,
        businessId: currentBusinessId,
        branchId: movData.branchId || selectedBranch,
        createdAt: today,
      };

      setCashMovements((prev) => [newMovement, ...prev]);

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/cashMovements`, id), newMovement);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/cashMovements/${id}`);
        }
      }
      return id;
    },
    [currentBusinessId, user, selectedBranch]
  );

  const deleteCashMovement = useCallback(
    async (id: string) => {
      setCashMovements((prev) => prev.filter((m) => m.id !== id));
      if (user && currentBusinessId) {
        try {
          await deleteDoc(doc(db, `businesses/${currentBusinessId}/cashMovements`, id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `businesses/${currentBusinessId}/cashMovements/${id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  // Reset to default sample data
  const resetToSampleData = useCallback(async () => {
    const demoBiz = getDefaultBusiness(user ? user.uid : 'local_owner', 'Tu Agenda Lista');
    demoBiz.id = currentBusinessId;
    const defaultSrvs = getDefaultServices(currentBusinessId);
    const defaultStf = getDefaultStaff(currentBusinessId);
    const defaultCli = getDefaultClients(currentBusinessId);
    const defaultApt = getDefaultAppointments(currentBusinessId);
    const defaultCsh = getDefaultCashMovements(currentBusinessId);

    setBusiness(demoBiz);
    setServices(defaultSrvs);
    setStaff(defaultStf);
    setClients(defaultCli);
    setAppointments(defaultApt);
    setCashMovements(defaultCsh);

    if (user && currentBusinessId) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'businesses', currentBusinessId), demoBiz);
        defaultSrvs.forEach((s) => batch.set(doc(db, `businesses/${currentBusinessId}/services`, s.id), s));
        defaultStf.forEach((s) => batch.set(doc(db, `businesses/${currentBusinessId}/staff`, s.id), s));
        defaultCli.forEach((c) => batch.set(doc(db, `businesses/${currentBusinessId}/clients`, c.id), c));
        defaultApt.forEach((a) => batch.set(doc(db, `businesses/${currentBusinessId}/appointments`, a.id), a));
        defaultCsh.forEach((m) => batch.set(doc(db, `businesses/${currentBusinessId}/cashMovements`, m.id), m));
        await batch.commit();
      } catch (err) {
        console.error('Error writing batch to firestore', err);
      }
    }
  }, [currentBusinessId, user]);

  // Export to Excel / CSV with UTF-8 BOM
  const exportAppointmentsToCSV = useCallback((dateFilter?: string) => {
    let toExport = [...appointments];
    if (dateFilter) {
      toExport = toExport.filter((a) => a.date === dateFilter);
    }
    toExport.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    const headers = ['Fecha', 'Hora', 'Cliente', 'Teléfono', 'Servicio', 'Duración (min)', 'Profesional', 'Precio', 'Seña', 'Saldo Pendiente', 'Estado', 'Medio de Pago', 'Notas'];

    const rows = toExport.map((apt) => [
      `"${apt.date}"`,
      `"${apt.time}"`,
      `"${apt.clientName.replace(/"/g, '""')}"`,
      `"${apt.clientPhone.replace(/"/g, '""')}"`,
      `"${apt.serviceName.replace(/"/g, '""')}"`,
      apt.durationMinutes,
      `"${apt.staffName.replace(/"/g, '""')}"`,
      apt.price,
      apt.depositAmount,
      apt.remainingBalance,
      `"${apt.status}"`,
      `"${apt.paymentMethod}"`,
      `"${(apt.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tu_Agenda_Lista_${dateFilter || 'completa'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [appointments]);

  // Export full business configuration (White-Label multi-client JSON)
  const exportBusinessConfiguration = useCallback((): BusinessConfigExport => {
    return {
      version: '2.0',
      schema: 'TuAgendaLista_Config',
      exportedAt: new Date().toISOString(),
      business: {
        name: business?.name || 'Tu Agenda Lista',
        category: business?.category || 'Centro de Estética & Belleza',
        phone: business?.phone || '',
        phoneCountryPrefix: business?.phoneCountryPrefix || '+54',
        address: business?.address || '',
        currency: business?.currency || '$',
        cbuAlias: business?.cbuAlias || '',
        mercadoPagoAccessToken: business?.mercadoPagoAccessToken || '',
        mercadoPagoAlias: business?.mercadoPagoAlias || '',
        mercadoPagoCvu: business?.mercadoPagoCvu || '',
        defaultDepositPercentage: business?.defaultDepositPercentage || 30,
        defaultSlotMinutes: business?.defaultSlotMinutes || 30,
        openingHour: business?.openingHour || '08:00',
        closingHour: business?.closingHour || '20:00',
        themeColor: business?.themeColor || '#D4AF37',
        themeName: business?.themeName || 'Oro Metálico & Obsidian (Oficial)',
      },
      colors: {
        primary: business?.themeColor || '#D4AF37',
        themeName: business?.themeName || 'Oro Metálico & Obsidian (Oficial)',
        palette: [
          business?.themeColor || '#D4AF37',
          '#2563eb',
          '#059669',
          '#ec4899',
          '#7c3aed',
          '#334155',
        ],
      },
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        durationMinutes: s.durationMinutes,
        price: s.price,
        description: s.description,
        color: s.color,
        active: s.active,
      })),
      staff: staff.map((st) => ({
        id: st.id,
        name: st.name,
        role: st.role,
        phone: st.phone,
        color: st.color,
        workingDays: st.workingDays,
        workingHoursStart: st.workingHoursStart,
        workingHoursEnd: st.workingHoursEnd,
        blockedDates: st.blockedDates,
        active: st.active,
      })),
      license: {
        developer: 'Iris Quiroz',
        type: 'SaaS Multi-Cliente PRO',
        status: 'ACTIVE_VERIFIED',
        protected: true,
      },
    };
  }, [business, services, staff]);

  // Import full business configuration (White-Label multi-client JSON)
  const importBusinessConfiguration = useCallback(
    async (imported: BusinessConfigExport): Promise<{ servicesCount: number; staffCount: number }> => {
      if (!imported || !imported.business) {
        throw new Error('El archivo JSON no tiene un formato válido de configuración.');
      }

      const today = getTodayDateString();
      const updatedBusiness: Business = {
        ...(business || getDefaultBusiness(user ? user.uid : 'local_owner')),
        name: imported.business.name || 'Tu Agenda Lista',
        category: imported.business.category || 'Centro de Estética & Belleza',
        phone: imported.business.phone || '',
        phoneCountryPrefix: imported.business.phoneCountryPrefix || '+54',
        address: imported.business.address || '',
        currency: imported.business.currency || '$',
        cbuAlias: imported.business.cbuAlias || '',
        mercadoPagoAccessToken: imported.business.mercadoPagoAccessToken || '',
        mercadoPagoAlias: imported.business.mercadoPagoAlias || imported.business.cbuAlias || '',
        mercadoPagoCvu: imported.business.mercadoPagoCvu || '',
        defaultDepositPercentage: imported.business.defaultDepositPercentage || 30,
        defaultSlotMinutes: imported.business.defaultSlotMinutes || 30,
        openingHour: imported.business.openingHour || '08:00',
        closingHour: imported.business.closingHour || '20:00',
        themeColor: imported.business.themeColor || imported.colors?.primary || '#D4AF37',
        themeName: imported.business.themeName || imported.colors?.themeName || 'Oro Metálico & Obsidian (Oficial)',
        developerName: 'Iris Quiroz',
        tagline: 'Desarrollado por Iris Quiroz',
        updatedAt: today,
      };

      const newServices: Service[] = (imported.services || []).map((s, idx) => ({
        id: s.id || `srv_${Date.now()}_${idx}`,
        businessId: currentBusinessId,
        name: s.name,
        category: s.category || 'General',
        durationMinutes: Number(s.durationMinutes) || 30,
        price: Number(s.price) || 0,
        description: s.description || '',
        color: s.color || '#3b82f6',
        active: s.active !== false,
        createdAt: today,
      }));

      const newStaff: StaffMember[] = (imported.staff || []).map((st, idx) => ({
        id: st.id || `stf_${Date.now()}_${idx}`,
        businessId: currentBusinessId,
        name: st.name,
        role: st.role || 'Especialista',
        phone: st.phone || '',
        color: st.color || '#0284c7',
        workingDays: Array.isArray(st.workingDays) ? st.workingDays : [1, 2, 3, 4, 5, 6],
        workingHoursStart: st.workingHoursStart || '08:00',
        workingHoursEnd: st.workingHoursEnd || '20:00',
        blockedDates: Array.isArray(st.blockedDates) ? st.blockedDates : [],
        active: st.active !== false,
        createdAt: today,
      }));

      setBusiness(updatedBusiness);
      if (newServices.length > 0) setServices(newServices);
      if (newStaff.length > 0) setStaff(newStaff);

      if (user && currentBusinessId) {
        try {
          const batch = writeBatch(db);
          batch.set(doc(db, 'businesses', currentBusinessId), updatedBusiness, { merge: true });
          newServices.forEach((s) => batch.set(doc(db, `businesses/${currentBusinessId}/services`, s.id), s));
          newStaff.forEach((st) => batch.set(doc(db, `businesses/${currentBusinessId}/staff`, st.id), st));
          await batch.commit();
        } catch (err) {
          console.error('Error writing imported config to firestore', err);
        }
      }

      return {
        servicesCount: newServices.length,
        staffCount: newStaff.length,
      };
    },
    [business, currentBusinessId, user]
  );

  const value = {
    user,
    authLoading,
    isDemoMode,
    business,
    clients,
    services,
    staff,
    appointments,
    allAppointments: rawAppointments,
    cashMovements,
    allCashMovements: rawCashMovements,
    selectedBranch,
    setSelectedBranch,
    branches: BRANCHES,
    isLoadingData,
    hasFirestoreError,
    unreadRemindersCount,
    upcomingTodayAppointments,
    loginWithGoogle,
    logoutUser,
    enableDemoMode,
    updateBusiness,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    markAppointmentCompleted,
    createClient,
    updateClient,
    deleteClient,
    createService,
    updateService,
    deleteService,
    createStaff,
    updateStaff,
    deleteStaff,
    createCashMovement,
    deleteCashMovement,
    resetToSampleData,
    exportAppointmentsToCSV,
    exportBusinessConfiguration,
    importBusinessConfiguration,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
