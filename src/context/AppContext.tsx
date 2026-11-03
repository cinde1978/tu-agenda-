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
  StaffBranchScope,
  Branch,
  BRANCHES,
  Resource,
  GiftCard,
} from '../types';
import {
  getDefaultBusiness,
  getDefaultBranchSettings,
  getTodayDateString,
} from '../utils/initialData';
import {
  normalizeStaffMember,
  checkStaffAvailability,
  timeToMinutes,
} from '../utils/staffSchedule';

const LOCAL_STORAGE_KEY = 'tu_agenda_lista_data_v4_clean';
const LEGACY_LOCAL_STORAGE_KEYS = ['tu_agenda_lista_data_v3', 'tu_agenda_lista_data_v2'];
const LOCAL_BACKUP_KEY = 'tu_agenda_backup_pre_clean_v1';
const CLEAN_START_VERSION = '2026-10-31';

function sanitizeBusinessConfig(biz: Business): Business {
  const sanitized: Business = { ...biz };
  if (!sanitized.developerName || sanitized.developerName === '[Tu Nombre]') {
    sanitized.developerName = 'Iris Quiroz';
  }
  if (
    !sanitized.name ||
    sanitized.name === 'TU AGENDA LISTA' ||
    sanitized.name === 'Tu Agenda Lista Pro' ||
    sanitized.name === '[Tu Nombre o Marca]'
  ) {
    sanitized.name = 'Tu Agenda Lista';
  }
  if (
    !sanitized.tagline ||
    sanitized.tagline === 'Gestión Profesional de Turnos' ||
    sanitized.tagline === 'Desarrollado por [Tu Nombre]'
  ) {
    sanitized.tagline = 'Desarrollado por Iris Quiroz';
  }
  function isFictitiousOrSample(val?: string | null): boolean {
    if (!val) return false;
    const v = val.toLowerCase().trim();
    return (
      v === 'agenda.turnos.mp' ||
      v === '0000003100085492109482' ||
      v === 'app_usr-78219401284-102914-tuagenda-prod' ||
      v.includes('ejemplo') ||
      v.includes('ficticio') ||
      v.includes('sample') ||
      v === '+54 9 11 4567-8901' ||
      v === '1145678901' ||
      v === '1234567890' ||
      v === 'test'
    );
  }

  if (isFictitiousOrSample(sanitized.phone)) sanitized.phone = '';
  if (isFictitiousOrSample(sanitized.cbuAlias)) sanitized.cbuAlias = '';
  if (isFictitiousOrSample(sanitized.mercadoPagoAlias)) sanitized.mercadoPagoAlias = '';
  if (isFictitiousOrSample(sanitized.mercadoPagoCvu)) sanitized.mercadoPagoCvu = '';
  if (isFictitiousOrSample(sanitized.mercadoPagoAccessToken)) sanitized.mercadoPagoAccessToken = '';

  const defaultBranches = getDefaultBranchSettings();
  const sanitizeBranchEntry = (branchId: BranchId) => {
    const base = defaultBranches[branchId];
    const raw = sanitized.branchSettings?.[branchId];
    if (!raw) {
      if (branchId === 'sucursal_1' && !sanitized.branchSettings) {
        return {
          ...base,
          phone: isFictitiousOrSample(sanitized.phone) ? '' : (sanitized.phone || ''),
          whatsapp: isFictitiousOrSample(sanitized.phone) ? '' : (sanitized.phone || ''),
          cbuAlias: isFictitiousOrSample(sanitized.cbuAlias) ? '' : (sanitized.cbuAlias || ''),
          mercadoPagoAlias: isFictitiousOrSample(sanitized.mercadoPagoAlias) ? '' : (sanitized.mercadoPagoAlias || ''),
          mercadoPagoCvu: isFictitiousOrSample(sanitized.mercadoPagoCvu) ? '' : (sanitized.mercadoPagoCvu || ''),
          mercadoPagoAccessToken: isFictitiousOrSample(sanitized.mercadoPagoAccessToken) ? '' : (sanitized.mercadoPagoAccessToken || ''),
        };
      }
      return base;
    }
    return {
      ...base,
      ...raw,
      name: raw.name || base.name,
      address: raw.address || base.address,
      phone: isFictitiousOrSample(raw.phone) ? '' : (raw.phone ?? ''),
      whatsapp: isFictitiousOrSample(raw.whatsapp) ? '' : (raw.whatsapp ?? ''),
      cbuAlias: isFictitiousOrSample(raw.cbuAlias) ? '' : (raw.cbuAlias ?? ''),
      mercadoPagoAlias: isFictitiousOrSample(raw.mercadoPagoAlias) ? '' : (raw.mercadoPagoAlias ?? ''),
      mercadoPagoCvu: isFictitiousOrSample(raw.mercadoPagoCvu) ? '' : (raw.mercadoPagoCvu ?? ''),
      mercadoPagoAccessToken: isFictitiousOrSample(raw.mercadoPagoAccessToken)
        ? ''
        : (raw.mercadoPagoAccessToken ?? ''),
      enabledPaymentMethods:
        Array.isArray(raw.enabledPaymentMethods) && raw.enabledPaymentMethods.length > 0
          ? raw.enabledPaymentMethods
          : base.enabledPaymentMethods,
    };
  };

  sanitized.branchSettings = {
    sucursal_1: sanitizeBranchEntry('sucursal_1'),
    sucursal_2: sanitizeBranchEntry('sucursal_2'),
  };

  return sanitized;
}

interface LocalStoredState {
  business: Business;
  services: Service[];
  staff: StaffMember[];
  clients: Client[];
  appointments: Appointment[];
  cashMovements: CashMovement[];
  giftCards?: GiftCard[];
  resources?: Resource[];
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
  giftCards: GiftCard[];
  allGiftCards: GiftCard[];
  resources: Resource[];
  selectedBranch: StaffBranchScope;
  activeSingleBranch: BranchId;
  setSelectedBranch: (branch: StaffBranchScope) => void;
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
  createGiftCard: (gc: Omit<GiftCard, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>, registerCashMovement?: boolean) => Promise<string>;
  redeemGiftCard: (code: string, redemptionData: { staffId?: string; staffName?: string; branchId: BranchId; notes?: string }) => Promise<{ success: boolean; giftCard: GiftCard }>;
  deleteGiftCard: (id: string) => Promise<void>;
  createResource: (res: Omit<Resource, 'id' | 'businessId' | 'createdAt'>) => Promise<string>;
  updateResource: (res: Resource) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  resetToSampleData: () => Promise<void>;
  exportAppointmentsToCSV: (dateFilter?: string, branchFilter?: StaffBranchScope) => void;
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
  const [rawGiftCards, setRawGiftCards] = useState<GiftCard[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const setAppointments = setRawAppointments;
  const setCashMovements = setRawCashMovements;

  const [selectedBranch, setSelectedBranchState] = useState<StaffBranchScope>(() => {
    try {
      const saved = localStorage.getItem('tu_agenda_selected_branch');
      if (saved === 'sucursal_1' || saved === 'sucursal_2' || saved === 'ambas') return saved;
    } catch {}
    return 'sucursal_1';
  });

  const activeSingleBranch: BranchId = selectedBranch === 'sucursal_2' ? 'sucursal_2' : 'sucursal_1';

  const setSelectedBranch = useCallback((branch: StaffBranchScope) => {
    setSelectedBranchState(branch);
    try {
      localStorage.setItem('tu_agenda_selected_branch', branch);
    } catch {}
  }, []);

  const sortedStaff = useMemo(() => {
    return [...staff].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
    );
  }, [staff]);

  // Filter automatically by selected branch (or show combined when 'ambas')
  const appointments = useMemo(() => {
    if (selectedBranch === 'ambas') return rawAppointments;
    return rawAppointments.filter((apt) => (apt.branchId || 'sucursal_1') === selectedBranch);
  }, [rawAppointments, selectedBranch]);

  const cashMovements = useMemo(() => {
    if (selectedBranch === 'ambas') return rawCashMovements;
    return rawCashMovements.filter((mov) => (mov.branchId || 'sucursal_1') === selectedBranch);
  }, [rawCashMovements, selectedBranch]);

  const giftCards = useMemo(() => {
    if (selectedBranch === 'ambas') return rawGiftCards;
    return rawGiftCards.filter((gc) => !gc.branchId || gc.branchId === 'ambas' || gc.branchId === selectedBranch);
  }, [rawGiftCards, selectedBranch]);

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
   // Shared business: Iris owns the account and Soham operates the same agenda.
  const IRIS_OWNER_UID = '7s53P27wzQWuTYCbDxvCSlIM58n2';
  const SHARED_BUSINESS_ID = 'biz_7s53P27wzQWuTYCbDxvC';

  const currentBusinessId = useMemo(() => {
    if (!user) return 'biz_local_active';

    if (user.uid === IRIS_OWNER_UID) {
      return SHARED_BUSINESS_ID;
    }

    if (
      user.email === 'rosariosoham@gmail.com' &&
      user.emailVerified
    ) {
      return SHARED_BUSINESS_ID;
    }

    return `biz_${user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
  }, [user]);

  // Load from LocalStorage if not signed in
  useEffect(() => {
    if (authLoading) return;
    if (user) return; // Will sync from Firestore

    try {
      // Back up and purge any legacy demo/test keys once
      const legacySnapshots: Record<string, unknown> = {};
      let foundLegacy = false;
      for (const legacyKey of LEGACY_LOCAL_STORAGE_KEYS) {
        const rawLegacy = localStorage.getItem(legacyKey);
        if (rawLegacy) {
          foundLegacy = true;
          try {
            legacySnapshots[legacyKey] = JSON.parse(rawLegacy);
          } catch {
            legacySnapshots[legacyKey] = rawLegacy;
          }
          localStorage.removeItem(legacyKey);
        }
      }
      if (foundLegacy && !localStorage.getItem(LOCAL_BACKUP_KEY)) {
        localStorage.setItem(
          LOCAL_BACKUP_KEY,
          JSON.stringify({
            backedUpAt: new Date().toISOString(),
            legacyData: legacySnapshots,
          })
        );
      }

      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: LocalStoredState = JSON.parse(stored);
        const loadedStaff = (Array.isArray(parsed.staff) ? parsed.staff : []).map((member) =>
          normalizeStaffMember(member)
        );

        const baseBiz = parsed.business
          ? sanitizeBusinessConfig(parsed.business)
          : getDefaultBusiness('local_owner', 'Tu Agenda Lista');
        if (!baseBiz.id) {
          baseBiz.id = 'biz_local_active';
        }

        setBusiness(baseBiz);
        setServices(Array.isArray(parsed.services) ? parsed.services : []);
        setStaff(loadedStaff);
        setClients(Array.isArray(parsed.clients) ? parsed.clients : []);
        setAppointments(Array.isArray(parsed.appointments) ? parsed.appointments : []);
        setCashMovements(Array.isArray(parsed.cashMovements) ? parsed.cashMovements : []);
        setRawGiftCards(Array.isArray(parsed.giftCards) ? parsed.giftCards : []);
        setResources(Array.isArray(parsed.resources) ? parsed.resources : []);
        setIsDemoMode(false);
        setIsLoadingData(false);
        return;
      }
    } catch (e) {
      console.warn('Could not read from local storage', e);
    }

    // Clean initial state if nothing stored (zero sample records)
    const defaultBiz = getDefaultBusiness('local_owner', 'Tu Agenda Lista');
    defaultBiz.id = 'biz_local_active';
    setBusiness(defaultBiz);
    setServices([]);
    setStaff([]);
    setClients([]);
    setAppointments([]);
    setCashMovements([]);
    setRawGiftCards([]);
    setResources([]);
    setIsDemoMode(false);
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
        giftCards: rawGiftCards,
        resources,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
    } catch (e) {
      console.warn('Error saving to localStorage', e);
    }
  }, [business, services, staff, clients, rawAppointments, rawCashMovements, rawGiftCards, resources]);

  // Sync with Firestore when User is signed in
  useEffect(() => {
    if (!user || !currentBusinessId) return;

    setIsLoadingData(true);
    setHasFirestoreError(null);

    const bizDocRef = doc(db, 'businesses', currentBusinessId);
    const subcollectionUnsubs: (() => void)[] = [];
    let subcollectionsAttached = false;
    let isCancelled = false;

    const attachSubcollections = () => {
      if (subcollectionsAttached || isCancelled) return;
      subcollectionsAttached = true;

      const reportListenerError = (err: unknown, op: OperationType, path: string) => {
        const msg = err instanceof Error ? err.message : String(err);
        setHasFirestoreError(msg);
        setIsLoadingData(false);
        try {
          handleFirestoreError(err, op, path);
        } catch {
          // Logged by handleFirestoreError; prevent uncaught async crash from blanking UI
        }
      };

      const clientsRef = collection(db, `businesses/${currentBusinessId}/clients`);
      subcollectionUnsubs.push(
        onSnapshot(
          clientsRef,
          (snapshot) => {
            const list: Client[] = [];
            snapshot.forEach((d) => list.push(d.data() as Client));
            setClients(list);
          },
          (error) => {
            reportListenerError(error, OperationType.LIST, `businesses/${currentBusinessId}/clients`);
          }
        )
      );

      const servicesRef = collection(db, `businesses/${currentBusinessId}/services`);
      subcollectionUnsubs.push(
        onSnapshot(
          servicesRef,
          (snapshot) => {
            const list: Service[] = [];
            snapshot.forEach((d) => list.push(d.data() as Service));
            setServices(list);
          },
          (error) => {
            reportListenerError(error, OperationType.LIST, `businesses/${currentBusinessId}/services`);
          }
        )
      );

      const staffRef = collection(db, `businesses/${currentBusinessId}/staff`);
      subcollectionUnsubs.push(
        onSnapshot(
          staffRef,
          (snapshot) => {
            const list: StaffMember[] = [];
            snapshot.forEach((d) => {
              const raw = d.data() as StaffMember;
              list.push(normalizeStaffMember(raw));
            });
            setStaff(list);
          },
          (error) => {
            reportListenerError(error, OperationType.LIST, `businesses/${currentBusinessId}/staff`);
          }
        )
      );

      const appointmentsRef = collection(db, `businesses/${currentBusinessId}/appointments`);
      subcollectionUnsubs.push(
        onSnapshot(
          appointmentsRef,
          (snapshot) => {
            const list: Appointment[] = [];
            snapshot.forEach((d) => list.push(d.data() as Appointment));
            setAppointments(list);
            setIsLoadingData(false);
          },
          (error) => {
            reportListenerError(error, OperationType.LIST, `businesses/${currentBusinessId}/appointments`);
          }
        )
      );

      const cashRef = collection(db, `businesses/${currentBusinessId}/cashMovements`);
      subcollectionUnsubs.push(
        onSnapshot(
          cashRef,
          (snapshot) => {
            const list: CashMovement[] = [];
            snapshot.forEach((d) => list.push(d.data() as CashMovement));
            setCashMovements(list);
          },
          (error) => {
            reportListenerError(error, OperationType.LIST, `businesses/${currentBusinessId}/cashMovements`);
          }
        )
      );

      const giftCardsRef = collection(db, `businesses/${currentBusinessId}/giftCards`);
      subcollectionUnsubs.push(
        onSnapshot(
          giftCardsRef,
          (snapshot) => {
            const list: GiftCard[] = [];
            snapshot.forEach((d) => list.push(d.data() as GiftCard));
            setRawGiftCards(list);
          },
          (error) => {
            reportListenerError(error, OperationType.LIST, `businesses/${currentBusinessId}/giftCards`);
          }
        )
      );

      const resourcesRef = collection(db, `businesses/${currentBusinessId}/resources`);
      subcollectionUnsubs.push(
        onSnapshot(
          resourcesRef,
          (snapshot) => {
            const list: Resource[] = [];
            snapshot.forEach((d) => list.push(d.data() as Resource));
            setResources(list);
          },
          (error) => {
            reportListenerError(error, OperationType.LIST, `businesses/${currentBusinessId}/resources`);
          }
        )
      );
    };

    const unsubBiz = onSnapshot(
      bizDocRef,
      async (snap) => {
        if (snap.exists()) {
          const remoteBiz = snap.data() as Business;
          setBusiness(sanitizeBusinessConfig(remoteBiz));
          attachSubcollections();
        } else {
          // Initialize clean business in Firestore without sample data
          const baseBiz = business
            ? sanitizeBusinessConfig(business)
            : getDefaultBusiness(user.uid, 'Tu Agenda Lista');
          const initialBiz: Business = JSON.parse(
            JSON.stringify({
              ...baseBiz,
              id: currentBusinessId,
              ownerId: user.uid,
              name: (baseBiz.name || 'Tu Agenda Lista').slice(0, 100),
              cleanStartVersion: CLEAN_START_VERSION,
            })
          );
          try {
            await setDoc(bizDocRef, initialBiz);
            if (isCancelled) return;
            setBusiness(initialBiz);

            const batch = writeBatch(db);
            let opCount = 0;

            services.forEach((srv) => {
              batch.set(
                doc(db, `businesses/${currentBusinessId}/services`, srv.id),
                JSON.parse(JSON.stringify({ ...srv, businessId: currentBusinessId }))
              );
              opCount++;
            });

            staff.forEach((s) => {
              batch.set(
                doc(db, `businesses/${currentBusinessId}/staff`, s.id),
                JSON.parse(JSON.stringify({ ...s, businessId: currentBusinessId }))
              );
              opCount++;
            });

            clients.forEach((c) => {
              batch.set(
                doc(db, `businesses/${currentBusinessId}/clients`, c.id),
                JSON.parse(JSON.stringify({ ...c, businessId: currentBusinessId }))
              );
              opCount++;
            });

            rawAppointments.forEach((a) => {
              batch.set(
                doc(db, `businesses/${currentBusinessId}/appointments`, a.id),
                JSON.parse(JSON.stringify({ ...a, businessId: currentBusinessId }))
              );
              opCount++;
            });

            rawCashMovements.forEach((m) => {
              batch.set(
                doc(db, `businesses/${currentBusinessId}/cashMovements`, m.id),
                JSON.parse(JSON.stringify({ ...m, businessId: currentBusinessId }))
              );
              opCount++;
            });

            rawGiftCards.forEach((gc) => {
              batch.set(
                doc(db, `businesses/${currentBusinessId}/giftCards`, gc.id),
                JSON.parse(JSON.stringify({ ...gc, businessId: currentBusinessId }))
              );
              opCount++;
            });

            resources.forEach((r) => {
              batch.set(
                doc(db, `businesses/${currentBusinessId}/resources`, r.id),
                JSON.parse(JSON.stringify({ ...r, businessId: currentBusinessId }))
              );
              opCount++;
            });

            if (opCount > 0) {
              await batch.commit();
            }
            attachSubcollections();
            setIsLoadingData(false);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `businesses/${currentBusinessId}`);
          }
        }
      },
      (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        setHasFirestoreError(msg);
        setIsLoadingData(false);
        try {
          handleFirestoreError(error, OperationType.GET, `businesses/${currentBusinessId}`);
        } catch {
          // Handled safely
        }
      }
    );

    return () => {
      isCancelled = true;
      unsubBiz();
      subcollectionUnsubs.forEach((unsub) => unsub());
    };
  }, [user, currentBusinessId]);

  // Compute upcoming appointments for today and reminders
  const todayStr = getTodayDateString();
  const upcomingTodayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === todayStr && a.status !== 'cancelado')
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
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
      const targetBranch: BranchId = aptData.branchId || activeSingleBranch;
      const duration = Math.max(5, Number(aptData.durationMinutes || 30));
      const targetStatus = aptData.status || 'confirmado';

      if (targetStatus !== 'cancelado') {
        const chosenStaff = staff.find((s) => s.id === aptData.staffId);
        if (!chosenStaff) {
          throw new Error('Debes seleccionar un profesional válido y disponible.');
        }

        const avail = checkStaffAvailability(
          chosenStaff,
          aptData.date,
          aptData.time,
          duration,
          targetBranch,
          rawAppointments
        );

        if (!avail.available) {
          throw new Error(avail.message || 'El profesional no está disponible en ese día u horario.');
        }

        if (aptData.resourceId) {
          const slotStart = timeToMinutes(aptData.time);
          const slotEnd = slotStart + duration;
          const conflictingResourceApt = rawAppointments.find((a) => {
            if (a.status === 'cancelado') return false;
            if (a.date !== aptData.date || a.resourceId !== aptData.resourceId) return false;
            const aStart = timeToMinutes(a.time);
            const aEnd = aStart + (a.durationMinutes || 30);
            return Math.max(slotStart, aStart) < Math.min(slotEnd, aEnd);
          });
          if (conflictingResourceApt) {
            const resObj = resources.find((r) => r.id === aptData.resourceId);
            throw new Error(
              `Conflicto de cabina/equipo: "${resObj?.name || 'El recurso'}" ya está reservado a las ${conflictingResourceApt.time} hs con ${conflictingResourceApt.clientName}.`
            );
          }
        }
      }

      const rawApt: Appointment = {
        id,
        businessId: currentBusinessId,
        clientId: aptData.clientId || '',
        clientName: aptData.clientName || 'Cliente',
        clientPhone: aptData.clientPhone || '',
        serviceId: aptData.serviceId || '',
        serviceName: aptData.serviceName || 'Servicio',
        staffId: aptData.staffId || '',
        staffName: aptData.staffName || 'Personal',
        branchId: targetBranch,
        ...(aptData.resourceId ? { resourceId: aptData.resourceId } : {}),
        ...(aptData.resourceName ? { resourceName: aptData.resourceName } : {}),
        ...(aptData.giftCardCode ? { giftCardCode: aptData.giftCardCode } : {}),
        date: aptData.date,
        time: aptData.time,
        durationMinutes: duration,
        price: Number(aptData.price || 0),
        depositAmount: Number(aptData.depositAmount || 0),
        remainingBalance: Math.max(0, Number(aptData.price || 0) - Number(aptData.depositAmount || 0)),
        color: aptData.color || '#2563eb',
        status: targetStatus,
        paymentMethod: aptData.paymentMethod || 'pendiente',
        notes: aptData.notes || '',
        createdAt: today,
        updatedAt: today,
      };
      const newApt: Appointment = JSON.parse(JSON.stringify(rawApt));

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/appointments`, id), newApt);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/appointments/${id}`);
        }
      }

      setAppointments((prev) => {
        if (prev.some((a) => a.id === id)) return prev;
        return [newApt, ...prev];
      });

      // Switch active branch if viewing a single branch and booked into the other branch
      if (selectedBranch !== 'ambas' && targetBranch !== selectedBranch) {
        setSelectedBranch(targetBranch);
      }

      return id;
    },
    [currentBusinessId, user, selectedBranch, activeSingleBranch, setSelectedBranch, staff, rawAppointments, resources]
  );

  const updateAppointment = useCallback(
    async (apt: Appointment) => {
      const existing = rawAppointments.find((a) => a.id === apt.id);
      const scheduleFieldsChanged =
        !existing ||
        existing.date !== apt.date ||
        existing.time !== apt.time ||
        existing.staffId !== apt.staffId ||
        (existing.branchId || 'sucursal_1') !== (apt.branchId || 'sucursal_1') ||
        Number(existing.durationMinutes || 30) !== Number(apt.durationMinutes || 30) ||
        (existing.status === 'cancelado' && apt.status !== 'cancelado');

      if (apt.status !== 'cancelado' && scheduleFieldsChanged) {
        const chosenStaff = staff.find((s) => s.id === apt.staffId);
        if (!chosenStaff) {
          throw new Error('Debes seleccionar un profesional válido y disponible.');
        }

        const duration = Math.max(5, Number(apt.durationMinutes || 30));
        const targetBranch: BranchId = apt.branchId || activeSingleBranch;
        const avail = checkStaffAvailability(
          chosenStaff,
          apt.date,
          apt.time,
          duration,
          targetBranch,
          rawAppointments,
          apt.id
        );

        if (!avail.available) {
          throw new Error(avail.message || 'El profesional no está disponible en ese día u horario.');
        }

        if (apt.resourceId) {
          const slotStart = timeToMinutes(apt.time);
          const slotEnd = slotStart + duration;
          const conflictingResourceApt = rawAppointments.find((a) => {
            if (a.id === apt.id || a.status === 'cancelado') return false;
            if (a.date !== apt.date || a.resourceId !== apt.resourceId) return false;
            const aStart = timeToMinutes(a.time);
            const aEnd = aStart + (a.durationMinutes || 30);
            return Math.max(slotStart, aStart) < Math.min(slotEnd, aEnd);
          });
          if (conflictingResourceApt) {
            const resObj = resources.find((r) => r.id === apt.resourceId);
            throw new Error(
              `Conflicto de cabina/equipo: "${resObj?.name || 'El recurso'}" ya está reservado a las ${conflictingResourceApt.time} hs con ${conflictingResourceApt.clientName}.`
            );
          }
        }
      }

      const updated: Appointment = JSON.parse(
        JSON.stringify({
          ...apt,
          updatedAt: getTodayDateString(),
        })
      );
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? updated : a)));

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/appointments`, apt.id), updated);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/appointments/${apt.id}`);
        }
      }
    },
    [currentBusinessId, user, rawAppointments, staff, activeSingleBranch, resources]
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
          branchId: apt.branchId || activeSingleBranch,
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
    [currentBusinessId, updateAppointment, user, clients, activeSingleBranch]
  );

  // Client actions
  const createClient = useCallback(
    async (cliData: Omit<Client, 'id' | 'businessId' | 'createdAt' | 'updatedAt' | 'totalVisits' | 'totalSpent'>): Promise<string> => {
      const cleanName = (cliData.name || '').trim();
      const cleanPhone = (cliData.phone || '').trim();
      const cleanDigits = cleanPhone.replace(/\D/g, '');

      // Check if client already exists (case-insensitive name or exact digits match)
      const existing = clients.find((c) => {
        const cName = (c.name || '').trim().toLowerCase();
        if (cleanName && cName === cleanName.toLowerCase()) return true;
        if (cleanDigits && cleanDigits.length >= 6) {
          const cDigits = (c.phone || '').replace(/\D/g, '');
          const cWaDigits = ((c as any).whatsapp || '').replace(/\D/g, '');
          if (cDigits && cDigits === cleanDigits) return true;
          if (cWaDigits && cWaDigits === cleanDigits) return true;
        }
        return false;
      });

      if (existing) {
        // Return existing client ID to avoid duplicates
        return existing.id;
      }

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

      const cleanClient: Client = JSON.parse(JSON.stringify(newClient));

      setClients((prev) => {
        // Double check inside state updater
        if (prev.some((c) => c.id === id || (cleanName && c.name.trim().toLowerCase() === cleanName.toLowerCase()))) {
          return prev;
        }
        const nextClients = [cleanClient, ...prev];
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.clients = nextClients;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Sync client create to localStorage failed', e);
        }
        return nextClients;
      });

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/clients`, id), cleanClient);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/clients/${id}`);
        }
      }
      return id;
    },
    [currentBusinessId, user, clients]
  );

  const updateClient = useCallback(
    async (cli: Client) => {
      const updated: Client = {
        ...cli,
        updatedAt: getTodayDateString(),
      };
      const cleanClient: Client = JSON.parse(JSON.stringify(updated));

      setClients((prev) => {
        const nextClients = prev.map((c) => (c.id === cleanClient.id ? cleanClient : c));
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.clients = nextClients;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Sync client update to localStorage failed', e);
        }
        return nextClients;
      });

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/clients`, cleanClient.id), cleanClient);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/clients/${cleanClient.id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  const deleteClient = useCallback(
    async (id: string) => {
      setClients((prev) => {
        const nextClients = prev.filter((c) => c.id !== id);
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.clients = nextClients;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Sync client delete to localStorage failed', e);
        }
        return nextClients;
      });

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
      const rawStaff: StaffMember = normalizeStaffMember({
        ...stfData,
        id,
        businessId: currentBusinessId,
        createdAt: today,
      });
      const cleanStaff: StaffMember = JSON.parse(JSON.stringify(rawStaff));

      setStaff((prev) => {
        const nextStaff = [cleanStaff, ...prev];
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.staff = nextStaff;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Sync staff create to localStorage failed', e);
        }
        return nextStaff;
      });

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/staff`, id), cleanStaff);
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
      const cleanStaff: StaffMember = JSON.parse(JSON.stringify(normalizeStaffMember(stf)));
      setStaff((prev) => {
        const nextStaff = prev.map((s) => (s.id === cleanStaff.id ? cleanStaff : s));
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.staff = nextStaff;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Sync staff update to localStorage failed', e);
        }
        return nextStaff;
      });

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/staff`, cleanStaff.id), cleanStaff);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/staff/${cleanStaff.id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  const deleteStaff = useCallback(
    async (id: string) => {
      setStaff((prev) => {
        const nextStaff = prev.filter((s) => s.id !== id);
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.staff = nextStaff;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Sync staff delete to localStorage failed', e);
        }
        return nextStaff;
      });

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
      const targetBranch: BranchId = movData.branchId || activeSingleBranch;
      const newMovement: CashMovement = JSON.parse(
        JSON.stringify({
          ...movData,
          id,
          businessId: currentBusinessId,
          branchId: targetBranch,
          date: movData.date || today,
          amount: Number(movData.amount || 0),
          paymentMethod: movData.paymentMethod || 'efectivo',
          description: (movData.description || '').trim() || (movData.type === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado'),
          createdAt: today,
        })
      );

      setCashMovements((prev) => {
        if (prev.some((m) => m.id === id)) return prev;
        return [newMovement, ...prev];
      });

      if (user && currentBusinessId) {
        try {
          await setDoc(doc(db, `businesses/${currentBusinessId}/cashMovements`, id), newMovement);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/cashMovements/${id}`);
        }
      }

      if (selectedBranch !== 'ambas' && targetBranch !== selectedBranch) {
        setSelectedBranch(targetBranch);
      }

      return id;
    },
    [currentBusinessId, user, selectedBranch, activeSingleBranch, setSelectedBranch]
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

  // Gift Card actions
  const createGiftCard = useCallback(
    async (
      gcData: Omit<GiftCard, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>,
      registerCashMovement: boolean = true
    ): Promise<string> => {
      const id = `gc_${Date.now()}`;
      const today = getTodayDateString();
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = gcData.code && gcData.code.trim().length > 0 ? gcData.code.trim().toUpperCase() : `SOHAM-${randomSuffix}`;

      const newCard: GiftCard = {
        ...gcData,
        id,
        businessId: currentBusinessId,
        code,
        status: gcData.status || 'activa',
        issueDate: gcData.issueDate || today,
        createdAt: today,
        updatedAt: today,
      };

      setRawGiftCards((prev) => [newCard, ...prev]);

      if (user && currentBusinessId) {
        try {
          const sanitized = JSON.parse(JSON.stringify(newCard));
          await setDoc(doc(db, `businesses/${currentBusinessId}/giftCards`, id), sanitized);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/giftCards/${id}`);
        }
      }

      // Automatically register cash movement if requested and amount exists
      if (registerCashMovement && (newCard.amount || 0) > 0) {
        const branchForCash: BranchId =
          newCard.branchId === 'sucursal_1' || newCard.branchId === 'sucursal_2'
            ? newCard.branchId
            : activeSingleBranch;
        await createCashMovement({
          date: today,
          branchId: branchForCash,
          type: 'ingreso',
          category: 'otro',
          amount: newCard.amount || 0,
          paymentMethod: newCard.paymentMethod,
          description: `Venta Gift Card ${code} (${newCard.recipientName} - De: ${newCard.buyerName})`,
          giftCardId: id,
        });
      }

      return id;
    },
    [currentBusinessId, user, activeSingleBranch, createCashMovement]
  );

  const redeemGiftCard = useCallback(
    async (
      codeToRedeem: string,
      redemptionData: { staffId?: string; staffName?: string; branchId: BranchId; notes?: string }
    ): Promise<{ success: boolean; giftCard: GiftCard }> => {
      const cleanCode = codeToRedeem.trim().toUpperCase();
      const targetCard = rawGiftCards.find(
        (c) => c.code.trim().toUpperCase() === cleanCode
      );

      if (!targetCard) {
        throw new Error(`No se encontró ningún voucher con el código "${cleanCode}". Verificá que esté bien escrito.`);
      }

      if (targetCard.status === 'canjeada') {
        const branchName = targetCard.redeemedBranchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo';
        throw new Error(`¡Este voucher ya fue canjeado! Fecha: ${targetCard.redeemedDate || 'anteriormente'} en ${branchName}. No puede ser utilizado nuevamente.`);
      }

      if (targetCard.status === 'vencida') {
        throw new Error(`Este voucher se encuentra marcado como vencido (fecha de vencimiento: ${targetCard.expiryDate || 'N/A'}).`);
      }

      if (targetCard.branchId !== 'ambas' && targetCard.branchId !== redemptionData.branchId) {
        const validBranchName =
          targetCard.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo';
        throw new Error(
          `Este voucher es válido únicamente en ${validBranchName}. Cambiá la sucursal de atención para canjearlo.`
        );
      }

      const today = getTodayDateString();
      const updatedCard: GiftCard = {
        ...targetCard,
        status: 'canjeada',
        redeemedDate: today,
        redeemedBranchId: redemptionData.branchId,
        redeemedStaffId: redemptionData.staffId || '',
        redeemedStaffName: redemptionData.staffName || '',
        redeemedNotes: redemptionData.notes || '',
        updatedAt: today,
      };

      setRawGiftCards((prev) => prev.map((c) => (c.id === targetCard.id ? updatedCard : c)));

      if (user && currentBusinessId) {
        try {
          const sanitized = JSON.parse(JSON.stringify(updatedCard));
          await setDoc(doc(db, `businesses/${currentBusinessId}/giftCards`, targetCard.id), sanitized);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/giftCards/${targetCard.id}`);
        }
      }

      return { success: true, giftCard: updatedCard };
    },
    [rawGiftCards, currentBusinessId, user]
  );

  const deleteGiftCard = useCallback(
    async (id: string) => {
      setRawGiftCards((prev) => prev.filter((c) => c.id !== id));
      if (user && currentBusinessId) {
        try {
          await deleteDoc(doc(db, `businesses/${currentBusinessId}/giftCards`, id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `businesses/${currentBusinessId}/giftCards/${id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  // Resource actions (Cabinas & Equipos)
  const createResource = useCallback(
    async (resData: Omit<Resource, 'id' | 'businessId' | 'createdAt'>): Promise<string> => {
      const id = `res_${Date.now()}`;
      const today = getTodayDateString();
      const newResource: Resource = {
        ...resData,
        id,
        businessId: currentBusinessId,
        createdAt: today,
      };

      setResources((prev) => [newResource, ...prev]);

      if (user && currentBusinessId) {
        try {
          const sanitized = JSON.parse(JSON.stringify(newResource));
          await setDoc(doc(db, `businesses/${currentBusinessId}/resources`, id), sanitized);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${currentBusinessId}/resources/${id}`);
        }
      }
      return id;
    },
    [currentBusinessId, user]
  );

  const updateResource = useCallback(
    async (res: Resource) => {
      setResources((prev) => prev.map((r) => (r.id === res.id ? res : r)));
      if (user && currentBusinessId) {
        try {
          const sanitized = JSON.parse(JSON.stringify(res));
          await setDoc(doc(db, `businesses/${currentBusinessId}/resources`, res.id), sanitized);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${currentBusinessId}/resources/${res.id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  const deleteResource = useCallback(
    async (id: string) => {
      setResources((prev) => prev.filter((r) => r.id !== id));
      if (user && currentBusinessId) {
        try {
          await deleteDoc(doc(db, `businesses/${currentBusinessId}/resources`, id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `businesses/${currentBusinessId}/resources/${id}`);
        }
      }
    },
    [currentBusinessId, user]
  );

  // Reset base business settings without re-injecting sample records
  const resetToSampleData = useCallback(async () => {
    const cleanBiz = getDefaultBusiness(user ? user.uid : 'local_owner', 'Tu Agenda Lista');
    cleanBiz.id = currentBusinessId;
    cleanBiz.cleanStartVersion = CLEAN_START_VERSION;
    setBusiness(cleanBiz);

    if (user && currentBusinessId) {
      try {
        await setDoc(doc(db, 'businesses', currentBusinessId), cleanBiz, { merge: true });
      } catch (err) {
        console.error('Error updating business config in firestore', err);
      }
    }
  }, [currentBusinessId, user]);

  // Export to Excel / CSV with UTF-8 BOM and branch filter support
  const exportAppointmentsToCSV = useCallback(
    (dateFilter?: string, branchFilter?: StaffBranchScope) => {
      const effectiveBranch = branchFilter || selectedBranch;
      let toExport =
        effectiveBranch === 'ambas'
          ? [...rawAppointments]
          : rawAppointments.filter((a) => (a.branchId || 'sucursal_1') === effectiveBranch);
      if (dateFilter) {
        toExport = toExport.filter((a) => a.date === dateFilter);
      }
      toExport.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

      const headers = [
        'Fecha',
        'Hora',
        'Sucursal',
        'Cliente',
        'Teléfono',
        'Servicio',
        'Duración (min)',
        'Profesional',
        'Precio',
        'Seña',
        'Saldo Pendiente',
        'Estado',
        'Medio de Pago',
        'Notas',
      ];

      const rows = toExport.map((apt) => {
        const branchLabel = apt.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo';
        return [
          `"${apt.date}"`,
          `"${apt.time}"`,
          `"${branchLabel}"`,
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
        ];
      });

      const branchSuffix =
        effectiveBranch === 'sucursal_1'
          ? 'Montevideo'
          : effectiveBranch === 'sucursal_2'
          ? 'Rioja'
          : 'Ambas_Sucursales';
      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Tu_Agenda_Lista_${branchSuffix}_${dateFilter || 'completa'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [rawAppointments, selectedBranch]
  );

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
        branchSettings: business?.branchSettings,
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
      staff: sortedStaff.map((st) => ({
        id: st.id,
        name: st.name,
        role: st.role,
        phone: st.phone,
        color: st.color,
        branchId: st.branchId,
        commissionPercentage: st.commissionPercentage,
        workingDays: st.workingDays,
        workingHoursStart: st.workingHoursStart,
        workingHoursEnd: st.workingHoursEnd,
        daySchedules: st.daySchedules,
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
  }, [business, services, sortedStaff]);

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

      const newStaff: StaffMember[] = (imported.staff || []).map((st, idx) =>
        normalizeStaffMember({
          id: st.id || `stf_${Date.now()}_${idx}`,
          businessId: currentBusinessId,
          name: st.name,
          role: st.role || 'Especialista',
          phone: st.phone || '',
          color: st.color || '#0284c7',
          branchId: st.branchId || 'ambas',
          commissionPercentage: st.commissionPercentage,
          workingDays: Array.isArray(st.workingDays) ? st.workingDays : [],
          workingHoursStart: st.workingHoursStart || '',
          workingHoursEnd: st.workingHoursEnd || '',
          daySchedules: st.daySchedules,
          blockedDates: Array.isArray(st.blockedDates) ? st.blockedDates : [],
          active: st.active !== false,
          createdAt: today,
        })
      );

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
    staff: sortedStaff,
    appointments,
    allAppointments: rawAppointments,
    cashMovements,
    allCashMovements: rawCashMovements,
    giftCards,
    allGiftCards: rawGiftCards,
    resources,
    selectedBranch,
    activeSingleBranch,
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
    createGiftCard,
    redeemGiftCard,
    deleteGiftCard,
    createResource,
    updateResource,
    deleteResource,
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
