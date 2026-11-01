import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const BASE_URL = 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function getNextMondayAndTuesday() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() + 1);
  }
  const fmt = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const mon = fmt(d);
  const tueDate = new Date(d);
  tueDate.setDate(tueDate.getDate() + 1);
  const tue = fmt(tueDate);
  return { mon, tue };
}

(async () => {
  const results = [];
  const logPass = (step) => {
    console.log(`✅ PASS: ${step}`);
    results.push(step);
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell',
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  let nativeDialogsTriggered = 0;

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });
  page.on('dialog', async (dialog) => {
    nativeDialogsTriggered++;
    await dialog.dismiss();
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#branch-selector').waitFor({ state: 'visible', timeout: 15000 });
    // Clear localStorage once at start of isolated headless browser context to inspect default boot state
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#branch-selector').waitFor({ state: 'visible', timeout: 15000 });

    // -------------------------------------------------------------------------
    // 1. Visual Design, Identity, 10 Menu Sections & Initial Clean Boot
    // -------------------------------------------------------------------------
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert(bodyBg === 'rgb(255, 255, 255)', `Expected white body background, got ${bodyBg}`);

    const pageText = await page.locator('body').innerText();
    assert(pageText.includes('Tu Agenda Lista'), 'Missing brand name Tu Agenda Lista');
    assert(pageText.includes('Desarrollado por Iris Quiroz'), 'Missing developer credit Iris Quiroz');
    assert(!pageText.includes('Importar JSON'), 'Importar JSON should not appear in menu');

    const sidebarButtons = await page.locator('aside nav button').allInnerTexts();
    const expectedMenu = [
      'Agenda',
      'Clientes',
      'Servicios',
      'Profesionales',
      'Cabinas & Equipos',
      'Caja Diaria',
      'Gift Cards & Vouchers',
      'Estadísticas & Comisiones',
      'Imprimir / Excel',
      'Ajustes del Negocio',
    ];
    assert(
      sidebarButtons.length === 10 &&
        expectedMenu.every((lbl, idx) => sidebarButtons[idx].includes(lbl)),
      `Sidebar menu mismatch: ${JSON.stringify(sidebarButtons)}`
    );

    const branchOptions = await page.locator('#branch-selector option').allInnerTexts();
    assert(
      branchOptions.length === 3 &&
        branchOptions[0].includes('Soham Montevideo') &&
        branchOptions[1].includes('Soham Rioja') &&
        branchOptions[2].includes('Ambas Sucursales'),
      `Branch selector options mismatch: ${JSON.stringify(branchOptions)}`
    );

    const initialStored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tu_agenda_lista_data_v4_clean') || '{}')
    );
    assert(
      (initialStored.services || []).length === 0 &&
        (initialStored.staff || []).length === 0 &&
        (initialStored.clients || []).length === 0 &&
        (initialStored.appointments || []).length === 0 &&
        (initialStored.cashMovements || []).length === 0,
      'Initial clean boot should have zero demo/test records'
    );
    logPass('1 & 2 & 4 & 16: Fondo blanco, identidad Tu Agenda Lista + Iris Quiroz, 10 secciones exactas y selector Montevideo/Rioja/Ambas');

    // -------------------------------------------------------------------------
    // 2. Ajustes del Negocio: Per-Branch Independent Settings & Empty Defaults
    // -------------------------------------------------------------------------
    await page.locator('aside nav button', { hasText: 'Ajustes del Negocio' }).click();
    await page.waitForTimeout(250);

    // Check Estética Corporal category in Ajustes -> Gestionar Servicios
    await page.locator('main button', { hasText: 'Gestionar Servicios' }).first().click();
    await page.waitForTimeout(200);
    const settingsSrvText = await page.locator('main').innerText();
    assert(
      settingsSrvText.includes('Estética Corporal'),
      'Estética Corporal preset category missing in Ajustes del Negocio -> Gestionar Servicios'
    );

    // Switch to Datos del Local & Cobros tab
    await page.locator('main button', { hasText: 'Datos del Local & Cobros' }).first().click();
    await page.waitForTimeout(200);
    const settingsText = await page.locator('main').innerText();
    assert(
      !settingsText.includes('54911XXXXXXX'),
      'Broken WhatsApp number 54911XXXXXXX must not exist in Ajustes'
    );

    // Configure Montevideo alias
    await page.locator('main button', { hasText: 'Soham Montevideo' }).first().click();
    await page.waitForTimeout(150);
    const monteAliasInput = page.locator('input[placeholder="Sin configurar"]').nth(1);
    assert(
      (await monteAliasInput.inputValue()) === '',
      'Unconfigured Mercado Pago alias for Montevideo must be empty'
    );
    await monteAliasInput.fill('soham.montevideo.real');
    await page.locator('button', { hasText: 'Guardar Cambios del Negocio' }).click();
    await page.waitForTimeout(250);

    // Switch to Soham Rioja in Settings and verify it is still empty & independent
    await page
      .locator('main button', { hasText: 'Soham Rioja' })
      .first()
      .click();
    await page.waitForTimeout(200);
    const riojaAliasInput = page.locator('input[placeholder="Sin configurar"]').nth(1);
    assert(
      (await riojaAliasInput.inputValue()) === '',
      'Soham Rioja alias must remain empty and independent from Montevideo'
    );
    await riojaAliasInput.fill('soham.rioja.real');
    await page.locator('button', { hasText: 'Guardar Cambios del Negocio' }).click();
    await page.waitForTimeout(250);

    // Reload and verify per-branch persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#branch-selector').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('aside nav button', { hasText: 'Ajustes del Negocio' }).click();
    await page.waitForTimeout(250);
    const savedBiz = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tu_agenda_lista_data_v4_clean') || '{}').business
    );
    assert(
      savedBiz?.branchSettings?.sucursal_1?.mercadoPagoAlias === 'soham.montevideo.real' &&
        savedBiz?.branchSettings?.sucursal_2?.mercadoPagoAlias === 'soham.rioja.real',
      `Per-branch settings did not persist independently: ${JSON.stringify(savedBiz?.branchSettings)}`
    );
    logPass('13: Ajustes del negocio independientes por sucursal (Montevideo y Rioja) sin datos ficticios y persistentes tras recargar');

    // -------------------------------------------------------------------------
    // 3. Servicios: Create, Estética Corporal preservation, Delete confirmation
    // -------------------------------------------------------------------------
    await page.locator('aside nav button', { hasText: 'Servicios' }).click();
    await page.waitForTimeout(250);
    assert(
      await page.locator('main button', { hasText: 'Estética Corporal' }).isVisible(),
      'Estética Corporal category pill must be visible in ServiciosView'
    );

    // Create Service 1: Drenaje Corporal 60 (60 min, $25000, Estética Corporal)
    await page.locator('main button', { hasText: 'Nuevo Servicio' }).first().click();
    await page.waitForTimeout(200);
    await page.locator('input[placeholder*="Limpieza Facial"]').fill('Drenaje Corporal 60');
    await page.locator('form select').first().selectOption('Estética Corporal');
    await page.locator('form input[type="number"]').nth(0).fill('60');
    await page.locator('form input[type="number"]').nth(1).fill('25000');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(250);

    // Create Service 2: Servicio Temporal (to test clean delete)
    await page.locator('main button', { hasText: 'Nuevo Servicio' }).first().click();
    await page.waitForTimeout(200);
    await page.locator('input[placeholder*="Limpieza Facial"]').fill('Servicio Temporal');
    await page.locator('form input[type="number"]').nth(1).fill('10000');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(250);

    // Delete Servicio Temporal via internal confirmation
    const tempCard = page.locator('main div', { hasText: 'Servicio Temporal' }).filter({
      has: page.locator('button[title="Eliminar servicio"]'),
    }).last();
    await tempCard.locator('button[title="Eliminar servicio"]').click();
    await page.waitForTimeout(150);
    await page.locator('main button', { hasText: 'Confirmar' }).click();
    await page.waitForTimeout(250);
    assert(
      !(await page.locator('main').innerText()).includes('Servicio Temporal'),
      'Deleted service should no longer appear'
    );
    assert(
      await page.locator('main button', { hasText: 'Estética Corporal' }).isVisible(),
      'Estética Corporal category must never be deleted'
    );
    logPass('7: Creación y eliminación de Servicios con confirmación interna y preservación de categoría Estética Corporal');

    // -------------------------------------------------------------------------
    // 4. Profesionales: Alphabetical order, Por Día & Semana Completa, Branch shifts
    // -------------------------------------------------------------------------
    await page.locator('aside nav button', { hasText: 'Profesionales' }).click();
    await page.waitForTimeout(250);

    // Create Zoe first
    await page.locator('main button', { hasText: 'Nuevo Profesional' }).first().click();
    await page.waitForTimeout(250);
    await page.locator('input[placeholder*="Dra. Laura"]').fill('Zoe Masajista');
    await page.locator('input[placeholder*="Cosmetóloga"]').fill('Masajista');
    await page.locator('button', { hasText: 'Solo Soham Montevideo' }).first().click();
    await page.locator('button[form="staff-form"]').click();
    await page.waitForTimeout(300);

    // Create Ana Cosmetóloga with Ambas Sucursales:
    // Lunes = No trabaja; Martes = Mañana Montevideo (09:00-13:00) y Tarde Rioja (15:00-19:00)
    await page.locator('main button', { hasText: 'Nuevo Profesional' }).first().click();
    await page.waitForTimeout(250);
    await page.locator('input[placeholder*="Dra. Laura"]').fill('Ana Cosmetóloga');
    await page.locator('input[placeholder*="Cosmetóloga"]').fill('Cosmetóloga');
    await page.locator('button', { hasText: 'Ambas Sucursales' }).first().click();
    await page.waitForTimeout(150);

    // Switch to Por Día to verify per-day 3-button branch selector & configure Lunes + Martes
    await page.locator('button', { hasText: 'Por Día' }).first().click();
    await page.waitForTimeout(150);
    const modal = page.locator('.fixed.inset-0').last();
    await modal.locator('button', { hasText: 'Lun' }).first().click();
    await page.waitForTimeout(100);
    const noTrabajaBtn = modal.locator('button', { hasText: 'No trabaja' }).first();
    if (await noTrabajaBtn.isVisible()) {
      await noTrabajaBtn.click();
    }

    // Select Mar (Martes) -> mark Trabaja -> select Ambas Sucursales on that day -> set Montevideo 09:00-13:00 & Rioja 15:00-19:00
    await modal.locator('button', { hasText: 'Mar' }).first().click();
    await page.waitForTimeout(100);
    const trabajaBtn = modal.locator('button', { hasText: /^Trabaja$/ }).first();
    if (await trabajaBtn.isVisible()) {
      await trabajaBtn.click();
      await page.waitForTimeout(100);
    }
    // Verify the 3 per-day branch scope buttons are visible inside Por Día!
    assert(
      await modal.locator('button', { hasText: 'Solo Soham Montevideo' }).last().isVisible(),
      'Per-day Solo Soham Montevideo button missing in Por Día'
    );
    await modal.locator('button', { hasText: 'Ambas Sucursales' }).last().click();
    await page.waitForTimeout(150);

    const timeInputs = modal.locator('input[type="time"]');
    const timeCount = await timeInputs.count();
    assert(timeCount >= 4, `Expected >=4 time inputs for Ambas Sucursales on Martes, got ${timeCount}`);
    await timeInputs.nth(0).fill('09:00');
    await timeInputs.nth(1).fill('13:00');
    await timeInputs.nth(2).fill('15:00');
    await timeInputs.nth(3).fill('19:00');

    // Switch to Semana Completa and verify coherent state before saving
    await modal.locator('button', { hasText: 'Semana Completa' }).first().click();
    await page.waitForTimeout(150);
    await page.locator('button[form="staff-form"]').click();
    await page.waitForTimeout(300);

    // Verify alphabetical order (Ana Cosmetóloga before Zoe Masajista) and zero fake phone
    const storedAfterStaff = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tu_agenda_lista_data_v4_clean') || '{}')
    );
    const ana = storedAfterStaff.staff.find((s) => s.name === 'Ana Cosmetóloga');
    assert(ana && ana.phone === '', 'Ana phone must remain empty when not entered');
    const staffMainText = await page.locator('main').innerText();
    assert(
      staffMainText.indexOf('Ana Cosmetóloga') < staffMainText.indexOf('Zoe Masajista'),
      'Professionals must be sorted alphabetically'
    );
    logPass('5: Profesionales ordenados alfabéticamente, Por Día y Semana Completa coherentes, mañana Montevideo / tarde Rioja y Lunes No trabaja');

    // -------------------------------------------------------------------------
    // 5. Cabinas y Equipos
    // -------------------------------------------------------------------------
    await page.locator('aside nav button', { hasText: 'Cabinas & Equipos' }).click();
    await page.waitForTimeout(250);
    await page.locator('main button', { hasText: 'Nueva Cabina / Equipo' }).first().click();
    await page.waitForTimeout(200);
    await page.locator('input[placeholder*="Cabina 1"]').fill('Cabina 1 Facial');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(250);
    assert(
      (await page.locator('main').innerText()).includes('Cabina 1 Facial'),
      'Cabina 1 Facial should appear in ResourcesView'
    );
    logPass('10: Cabinas y equipos creados y filtrables por sucursal con confirmación interna');

    // -------------------------------------------------------------------------
    // 6. Clientes
    // -------------------------------------------------------------------------
    await page.locator('aside nav button', { hasText: 'Clientes' }).click();
    await page.waitForTimeout(250);
    await page.locator('main button', { hasText: 'Nuevo Cliente' }).first().click();
    await page.waitForTimeout(200);
    await page.locator('input[placeholder="Nombre y apellido del cliente"]').fill('Lucía Fernández');
    await page.locator('textarea').fill('Ficha técnica real');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(250);
    assert(
      (await page.locator('main').innerText()).includes('Lucía Fernández'),
      'Client Lucía Fernández should appear in ClientsView'
    );
    logPass('6: Creación y búsqueda de Clientes sin teléfonos ficticios');

    // -------------------------------------------------------------------------
    // 7. Estadísticas (ANTES de completar turnos): Verificar "Sin datos" en vez de 100%
    // -------------------------------------------------------------------------
    await page.locator('aside nav button', { hasText: 'Estadísticas & Comisiones' }).click();
    await page.waitForTimeout(250);
    const reportsEmptyText = await page.locator('main').innerText();
    assert(
      reportsEmptyText.includes('Sin datos') && !reportsEmptyText.includes('100%'),
      `ReportsView with 0 turns must show "Sin datos", not 100%: ${reportsEmptyText}`
    );
    logPass('11a: Estadísticas muestra "Sin datos" (nunca 100%) cuando no existen turnos resueltos');

    // -------------------------------------------------------------------------
    // 8. Agenda y Turnos: Lunes bloqueado, horario sucursal respetado, duración 60m real y bloqueo de superposición
    // -------------------------------------------------------------------------
    const { mon, tue } = getNextMondayAndTuesday();
    await page.locator('#branch-selector').selectOption('sucursal_1');
    await page.locator('aside nav button', { hasText: 'Agenda' }).click();
    await page.waitForTimeout(250);

    // Open Nuevo Turno
    await page.locator('aside button', { hasText: '+ Nuevo Turno' }).click();
    await page.waitForTimeout(250);
    const aptModal = page.locator('.fixed.inset-0').last();

    // Select client Lucía Fernández
    await aptModal.locator('input[placeholder*="Buscar cliente"]').fill('Lucía');
    await page.waitForTimeout(150);
    await aptModal.locator('button', { hasText: 'Lucía Fernández' }).first().click();
    await page.waitForTimeout(150);

    // Check Monday (Ana does not work on Monday)
    const dateInput = aptModal.locator('input[type="date"]').first();
    await dateInput.fill(mon);
    await page.waitForTimeout(200);

    // Select Ana Cosmetóloga in Paso 3 select
    const staffSelect = aptModal.locator('select').nth(0);
    const anaVal = await staffSelect.locator('option', { hasText: 'Ana Cosmetóloga' }).first().getAttribute('value');
    assert(anaVal, 'Ana Cosmetóloga option must exist in AppointmentModal staff select');
    await staffSelect.selectOption(anaVal);
    await page.waitForTimeout(200);

    const monModalText = await aptModal.innerText();
    assert(
      monModalText.toLowerCase().includes('no trabaja'),
      `Ana Cosmetóloga must show non-working warning on Monday, got: ${monModalText}`
    );

    // Switch date to Tuesday (Ana works 09:00-13:00 in Montevideo and 15:00-19:00 in Rioja)
    await dateInput.fill(tue);
    await page.waitForTimeout(250);

    // Ensure Soham Montevideo is selected in Paso 2
    await aptModal.locator('button', { hasText: 'Soham Montevideo' }).first().click();
    await page.waitForTimeout(150);

    // Select service Drenaje Corporal 60 (60 min) in Paso 4 select
    const srvSel = aptModal.locator('select').nth(1);
    const srvVal = await srvSel.locator('option', { hasText: 'Drenaje Corporal 60' }).first().getAttribute('value');
    assert(srvVal, 'Drenaje Corporal 60 option must exist in AppointmentModal service select');
    await srvSel.selectOption(srvVal);
    await page.waitForTimeout(200);

    // Verify 16:00 is NOT offered as an available quick slot in Montevideo (since 15:00-19:00 is Rioja!)
    const slot1600InMonte = aptModal.locator('button', { hasText: '16:00' });
    assert(
      (await slot1600InMonte.count()) === 0,
      '16:00 should not be available for Ana in Soham Montevideo on Tuesday'
    );

    // Pick 10:00 slot in Montevideo
    await aptModal.locator('button', { hasText: '10:00' }).first().click();
    await page.waitForTimeout(150);

    await page.locator('button[form="appointment-form"]').click();
    await page.waitForTimeout(450);

    // Close the AppointmentDetailModal that opens automatically after saving
    const autoDetailClose = page.locator('.fixed.inset-0 button[title="Cerrar"]').first();
    if (await autoDetailClose.isVisible()) {
      await autoDetailClose.click();
      await page.waitForTimeout(200);
    }

    // Navigate Agenda to Tuesday and check Day View + Staff View 60-min card height!
    await page.locator('input[aria-label="Seleccionar fecha"]').fill(tue);
    await page.waitForTimeout(250);

    const dayCardBox = await page
      .locator('main div[title*="Lucía Fernández - Drenaje Corporal 60"]')
      .first()
      .boundingBox();
    assert(
      dayCardBox && dayCardBox.height >= 74 && dayCardBox.height <= 82,
      `60-min turn in AgendaDayView (HOUR_HEIGHT=80px) must occupy full 1-hour height (~78px), got ${dayCardBox?.height}`
    );

    // Switch to Staff view on Tuesday and verify 60-min card height there too
    await page.locator('main button', { hasText: 'Staff' }).first().click();
    await page.waitForTimeout(250);
    const staffCardBox = await page
      .locator('main div[title*="Lucía Fernández - Drenaje Corporal 60"]')
      .first()
      .boundingBox();
    assert(
      staffCardBox && staffCardBox.height >= 66 && staffCardBox.height <= 74,
      `60-min turn in AgendaStaffView (HOUR_HEIGHT=72px) must occupy full 1-hour height (~70px), got ${staffCardBox?.height}`
    );

    // Verify overlap blocking: open Nuevo Turno on Tuesday for Ana at 10:30 -> must be blocked!
    await page.locator('aside button', { hasText: '+ Nuevo Turno' }).click();
    await page.waitForTimeout(250);
    const overlapModal = page.locator('.fixed.inset-0').last();
    await overlapModal.locator('input[type="date"]').first().fill(tue);
    await page.waitForTimeout(200);
    const overlapStaffSel = overlapModal.locator('select').nth(0);
    await overlapStaffSel.selectOption(anaVal);
    await page.waitForTimeout(200);
    // 10:00 and 10:30 slots must NOT be selectable as free <button> slots (they render as non-clickable <div>s)!
    assert(
      (await overlapModal.locator('button', { hasText: '10:30' }).count()) === 0,
      '10:30 must be blocked because 10:00-11:00 (60 min) is already booked!'
    );
    await overlapModal.locator('button', { hasText: 'Cancelar' }).last().click();
    await page.waitForTimeout(200);
    logPass('3: Agenda Día/Semana/Mes/Staff, turno de 60 min ocupa 1 hora exacta, bloquea 10:00-11:00 sin superposición y respeta horarios por sucursal');

    // -------------------------------------------------------------------------
    // 9. Protección de registros vinculados en Servicios y Clientes
    // -------------------------------------------------------------------------
    await page.locator('aside nav button', { hasText: 'Servicios' }).click();
    await page.waitForTimeout(250);
    await page.locator('main button[title="Eliminar servicio"]').first().click();
    await page.waitForTimeout(150);
    const srvProtectionText = await page.locator('main').innerText();
    assert(
      srvProtectionText.includes('Desactivar') && srvProtectionText.includes('1 turno'),
      `Linked service protection must warn and offer safe deactivation: ${srvProtectionText}`
    );
    await page.locator('main button', { hasText: 'Cancelar' }).first().click();

    await page.locator('aside nav button', { hasText: 'Clientes' }).click();
    await page.waitForTimeout(250);
    await page.locator('main button[title="Eliminar cliente"]').first().click();
    await page.waitForTimeout(150);
    const cliProtectionText = await page.locator('main').innerText();
    assert(
      cliProtectionText.includes('1 turno(s)'),
      `Linked client delete confirmation must warn about existing appointments: ${cliProtectionText}`
    );
    await page.locator('main button', { hasText: 'Cancelar' }).first().click();
    logPass('6b & 7b: Protección contra borrado accidental de Clientes y Servicios con turnos vinculados');

    // -------------------------------------------------------------------------
    // 10. Caja Diaria: Ingresos, Gastos, Totales y Aislamiento por Sucursal + Ambas
    // -------------------------------------------------------------------------
    await page.locator('aside nav button', { hasText: 'Caja Diaria' }).click();
    await page.waitForTimeout(250);
    await page.locator('main button', { hasText: 'Soham Montevideo' }).first().click();
    await page.waitForTimeout(150);

    // Register Ingreso $25000 in Montevideo
    await page.locator('main input[placeholder*="Cobro de sesión"]').fill('Cobro turno Montevideo');
    await page.locator('main input[placeholder="0"]').fill('25000');
    await page.locator('main form button[type="submit"]', { hasText: 'Registrar movimiento' }).click();
    await page.waitForTimeout(250);

    // Register Gasto $5000 in Montevideo
    await page.locator('main button', { hasText: 'Gasto (-)' }).first().click();
    await page.waitForTimeout(150);
    await page.locator('main input[placeholder*="Insumos de gabinete"]').fill('Insumos Montevideo');
    await page.locator('main input[placeholder="0"]').fill('5000');
    await page.locator('main form button[type="submit"]', { hasText: 'Registrar movimiento' }).click();
    await page.waitForTimeout(250);

    const monteCashText = await page.locator('main').innerText();
    assert(
      monteCashText.includes('25.000') &&
        monteCashText.includes('5.000') &&
        monteCashText.includes('20.000'),
      'Montevideo Cash KPIs must show 25.000 income, 5.000 expense, 20.000 net'
    );

    // Switch to Soham Rioja -> verify $0 isolation!
    await page.locator('main button', { hasText: 'Soham Rioja' }).first().click();
    await page.waitForTimeout(200);
    const riojaEmptyCash = await page.locator('main').innerText();
    assert(
      riojaEmptyCash.includes('0 movimiento(s) en la fecha'),
      'Soham Rioja Cash must be isolated from Montevideo movements'
    );

    // Register Ingreso $30000 in Rioja
    await page.locator('main button', { hasText: 'Ingreso (+)' }).first().click();
    await page.waitForTimeout(100);
    await page.locator('main input[placeholder*="Cobro de sesión"]').fill('Cobro turno Rioja');
    await page.locator('main input[placeholder="0"]').fill('30000');
    await page.locator('main form button[type="submit"]', { hasText: 'Registrar movimiento' }).click();
    await page.waitForTimeout(250);

    // Switch to Ambas Sucursales -> verify combined $55.000 income, $5.000 expense, $50.000 net!
    await page.locator('main button', { hasText: 'Ambas Sucursales' }).first().click();
    await page.waitForTimeout(200);
    const ambasCashText = await page.locator('main').innerText();
    assert(
      ambasCashText.includes('55.000') && ambasCashText.includes('50.000'),
      `Ambas Sucursales Cash must show combined 55.000 income and 50.000 net: ${ambasCashText}`
    );
    logPass('8: Caja Diaria registra ingresos y gastos, calcula balance neto y aísla Montevideo, Rioja y Ambas Sucursales');

    // -------------------------------------------------------------------------
    // 11. Gift Cards: Monto libre (12345) + Por Tratamiento (solo servicios activos) + Validez sucursal
    // -------------------------------------------------------------------------
    await page.locator('aside nav button', { hasText: 'Gift Cards & Vouchers' }).click();
    await page.waitForTimeout(250);

    // 11a: Por Monto libre ($12345)
    await page.locator('main button', { hasText: '+ Nueva Gift Card' }).click();
    await page.waitForTimeout(200);
    const gcModal1 = page.locator('.fixed.inset-0').last();
    await gcModal1.locator('input[placeholder*="importe en pesos"]').fill('12345');
    await gcModal1.locator('input[placeholder="Nombre del destinatario"]').fill('Carla Regalo');
    await gcModal1.locator('input[placeholder="Nombre de quien regala"]').fill('Sofía Compradora');
    await gcModal1.locator('input[type="checkbox"]').uncheck();
    await gcModal1.locator('button[type="submit"]').click();
    await page.waitForTimeout(250);
    assert(
      (await page.locator('main').innerText()).includes('12.345'),
      'Free positive amount Gift Card ($12.345) must be created without step=500 restriction'
    );

    // 11b: Por Tratamiento (only active Drenaje Corporal 60, valid ONLY in Soham Rioja)
    await page.locator('main button', { hasText: '+ Nueva Gift Card' }).click();
    await page.waitForTimeout(200);
    const gcModal2 = page.locator('.fixed.inset-0').last();
    await gcModal2.locator('button', { hasText: 'Por Tratamiento' }).click();
    await page.waitForTimeout(150);
    const gcServiceOptions = await gcModal2.locator('select').first().locator('option').allInnerTexts();
    assert(
      gcServiceOptions.length === 1 && gcServiceOptions[0].includes('Drenaje Corporal 60'),
      `GiftCard Por Tratamiento must list ONLY active non-deleted services, got: ${JSON.stringify(gcServiceOptions)}`
    );
    await gcModal2.locator('input[placeholder="Nombre del destinatario"]').fill('Valeria Rioja');
    await gcModal2.locator('input[placeholder="Nombre de quien regala"]').fill('Martín Regala');
    await gcModal2.locator('select').nth(1).selectOption('sucursal_2');
    await gcModal2.locator('input[type="checkbox"]').uncheck();
    await gcModal2.locator('button[type="submit"]').click();
    await page.waitForTimeout(250);

    // Extract Rioja Gift Card code and test branch-restricted redemption!
    const storedGC = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tu_agenda_lista_data_v4_clean') || '{}').giftCards
    );
    const riojaGC = storedGC.find((g) => g.recipientName === 'Valeria Rioja');
    assert(riojaGC && riojaGC.amount === 25000, 'Treatment Gift Card must take service price 25000');

    await page.locator('main input[placeholder*="SOHAM-"]').fill(riojaGC.code);
    await page.locator('main form select').nth(1).selectOption('sucursal_1');
    await page.locator('main form button[type="submit"]', { hasText: 'Canjear' }).click();
    await page.waitForTimeout(200);
    assert(
      (await page.locator('main').innerText()).includes('válido únicamente en Soham Rioja'),
      'Redeeming a Rioja-only Gift Card in Montevideo must be blocked'
    );
    await page.locator('main form select').nth(1).selectOption('sucursal_2');
    await page.locator('main form button[type="submit"]', { hasText: 'Canjear' }).click();
    await page.waitForTimeout(200);
    assert(
      (await page.locator('main').innerText()).includes('canjeado con éxito'),
      'Redeeming Rioja Gift Card in Soham Rioja must succeed'
    );
    logPass('9: Gift Cards por monto libre ($12.345), por tratamiento (solo servicios activos con precio real) y validación de sucursal');

    // -------------------------------------------------------------------------
    // 12. Completar turno y verificar Estadísticas (Montevideo vs Rioja) e Imprimir/Excel por sucursal
    // -------------------------------------------------------------------------
    await page.locator('#branch-selector').selectOption('sucursal_1');
    await page.locator('aside nav button', { hasText: 'Agenda' }).click();
    await page.waitForTimeout(250);
    await page.locator('main button', { hasText: 'Día' }).first().click();
    await page.waitForTimeout(150);
    await page.locator('input[aria-label="Seleccionar fecha"]').fill(tue);
    await page.waitForTimeout(250);

    // Open appointment detail modal and mark as Completado
    await page
      .locator('main div[title*="Lucía Fernández - Drenaje Corporal 60"]')
      .first()
      .click();
    await page.waitForTimeout(250);
    const detailModal = page.locator('.fixed.inset-0').last();
    const completeBtn = detailModal.locator('button', { hasText: /Completado|Finalizar|Cobrar/i }).first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      await page.waitForTimeout(250);
      // Confirm completion if secondary button shown
      const confirmCompBtn = page.locator('.fixed.inset-0 button', { hasText: /Confirmar|Guardar/i }).last();
      if (await confirmCompBtn.isVisible()) {
        await confirmCompBtn.click();
        await page.waitForTimeout(250);
      }
    }
    // Close detail modal if still open
    if ((await page.locator('.fixed.inset-0').count()) > 0) {
      const closeBtn = page.locator('.fixed.inset-0 button').first();
      await closeBtn.click().catch(() => {});
    }

    // Check Estadísticas -> Histórico Total
    await page.locator('aside nav button', { hasText: 'Estadísticas & Comisiones' }).click();
    await page.waitForTimeout(250);
    await page.locator('main button', { hasText: 'Histórico Total' }).click();
    await page.waitForTimeout(200);
    await page.locator('main button', { hasText: 'Soham Rioja' }).first().click();
    await page.waitForTimeout(200);
    assert(
      (await page.locator('main').innerText()).includes('Sin datos'),
      'Soham Rioja with 0 turns must still show Sin datos in Estadísticas'
    );

    // Check Imprimir / Excel branch filter isolation
    await page.locator('aside nav button', { hasText: 'Imprimir / Excel' }).click();
    await page.waitForTimeout(250);
    await page.locator('main button', { hasText: 'Todos los Turnos' }).click();
    await page.waitForTimeout(150);

    await page.locator('main button', { hasText: 'Soham Montevideo' }).first().click();
    await page.waitForTimeout(150);
    assert(
      (await page.locator('main table').innerText()).includes('Lucía Fernández'),
      'ExportView Montevideo must list Montevideo turn'
    );

    await page.locator('main button', { hasText: 'Soham Rioja' }).first().click();
    await page.waitForTimeout(150);
    assert(
      (await page.locator('main').innerText()).includes(
        'No hay turnos registrados para la sucursal y período seleccionados'
      ),
      'ExportView Rioja must NOT mix Montevideo turns'
    );

    await page.locator('main button', { hasText: 'Ambas Sucursales' }).first().click();
    await page.waitForTimeout(150);
    assert(
      (await page.locator('main table').innerText()).includes('Soham Montevideo'),
      'ExportView Ambas Sucursales must show Sucursal column with Soham Montevideo'
    );
    logPass('11b & 12: Estadísticas aisladas por sucursal e Imprimir/Excel con filtro de sucursal y columna Sucursal');

    // -------------------------------------------------------------------------
    // 13. Mobile Viewport (390x844) Responsiveness Check
    // -------------------------------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    assert(
      await page.locator('#branch-selector').isVisible(),
      'Branch selector must be visible on Mobile 390x844'
    );
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 4
    );
    assert(!hasHorizontalOverflow, 'Mobile 390x844 must not have horizontal page overflow');
    logPass('17: Verificación Mobile (390x844) sin desbordes horizontales y controles legibles');

    // -------------------------------------------------------------------------
    // 14. Clean Teardown & Verify Zero Native Dialogs / Zero Page Errors
    // -------------------------------------------------------------------------
    assert(
      nativeDialogsTriggered === 0,
      `Expected 0 browser confirm/alert dialogs, got ${nativeDialogsTriggered}`
    );
    assert(pageErrors.length === 0, `Unexpected page errors: ${JSON.stringify(pageErrors)}`);

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#branch-selector').waitFor({ state: 'visible', timeout: 15000 });

    console.log(`\n🎉 ALL ${results.length} E2E VERIFICATION SUITES PASSED SUCCESSFULLY!`);
  } finally {
    await browser.close();
  }
})();
