# TU AGENDA LISTA — Plan de Implementación Integral

Aplicación web profesional para gestión de turnos, clientes y servicios diseñada especialmente para celulares y computadoras, con inicio inmediato gratuito, sin suscripciones obligatorias ni necesidad de tarjeta de crédito, y con tu propia marca exclusiva.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario:**
> - **Acceso a la app:** Acceso directo e inmediato desde el celular sin registro obligatorio, con opción opcional de conectar cuenta de Google en cualquier momento para sincronización en la nube.
> - **Exportación e impresión:** Doble modalidad integrada: vista optimizada para imprimir/guardar en PDF directo y descarga de turnos en archivo Excel/CSV.
> - **Recordatorios:** Sistema combinado con enlace rápido a WhatsApp (con mensaje personalizado pre-cargado) y recordatorios/notificaciones visuales y sonoras en el dispositivo.

- **Herramientas 100% gratuitas:** La aplicación funciona inmediatamente con almacenamiento local persistente en el dispositivo del usuario (`localStorage` / `IndexedDB`), y se conecta de forma gratuita a Firebase (plan Spark, que no requiere tarjeta de crédito ni cobro alguno) para sincronizar entre varios dispositivos.
- **Identidad de marca:** "TU AGENDA LISTA", sin marcas de terceros ni logotipos ajenos, con personalización del nombre de tu negocio, teléfono, moneda y servicios.

---

## 1. Overview & Core Concept

- **Qué hace:** Permite a centros de estética, peluquerías, manicuristas, barberías y profesionales independientes gestionar su agenda completa de turnos en vistas diaria, semanal y mensual; registrar clientes y servicios con duraciones y precios; asignar colores distintivos a los turnos; enviar recordatorios automáticos por WhatsApp y pantalla; y descargar o imprimir el reporte de la agenda en PDF o Excel.
- **Público objetivo:** Dueños de salones, estilistas, barberos, cosmiatras, manicuristas y profesionales que necesitan organizar su día a día desde el celular de forma rápida y sin complicaciones técnicas.
- **Valor clave:** Cero costo de entrada, cero dependencia de suscripciones pagas, control total de los datos y facilidad de uso con una sola mano en pantallas de celular (ergonomía móvil con barra inferior táctil y botones grandes de al menos 44px).

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Flujo de Acceso Inmediato:** El usuario abre la app en su celular y accede directamente a la agenda del día sin pantallas de bloqueo. Un banner discreto le permite conectar Google si desea respaldo automático en la nube.
2. **Flujo de Agendar Turno:** 
   - Toca el botón flotante inferior `+ Nuevo Turno` o cualquier espacio libre del calendario.
   - Selecciona cliente (o escribe uno nuevo en el momento con su WhatsApp).
   - Elige el servicio (se calcula automáticamente la duración y el precio).
   - Asigna un color distintivo para reconocerlo a simple vista.
   - Guarda el turno y tiene la opción inmediata de presionar "Enviar por WhatsApp" para confirmarle al cliente.
3. **Flujo de Recordatorio:**
   - Desde cualquier turno, un toque en el ícono de WhatsApp abre el chat con el mensaje formateado (fecha, hora, servicio y dirección).
   - Adicionalmente, la app verifica los turnos próximos de las siguientes 24 horas y muestra una campana de alertas con avisos visuales en la pantalla del celular.
4. **Flujo de Impresión y Descarga:**
   - Un botón de acción rápida permite:
     a) Generar la vista de impresión limpia (sin botones ni fondos oscuros) lista para imprimir o guardar como PDF.
     b) Descargar un archivo CSV/Excel con las columnas: Fecha, Hora, Cliente, Teléfono, Servicio, Profesional, Precio y Estado.

### Visual Identity & Theme

- **Dirección estética:** Moderna, limpia, profesional y táctil. Inspirada en las mejores herramientas móviles de productividad, priorizando el espacio blanco, la legibilidad tipográfica y la rapidez visual.
- **Paleta cromática (60-30-10):**
  - *Lienzo neutral (60%):* Blanco puro (`#ffffff`) y fondo suave grisáceo/celeste tenue (`#f8fafc`).
  - *Estructura y superficies (30%):* Bordes finos y tarjetas redondeadas (`#f1f5f9`, `#e2e8f0`), textos en grafito oscuro (`#0f172a`).
  - *Acentos (10%):* Azul profundo real (`#1d4ed8` / `#1e40af`) y celeste cielo brillante (`#0284c7` / `#38bdf8`) para acciones primarias y estados destacados.
  - *Colores distintivos para turnos:* Azul, Celeste, Esmeralda, Violeta, Rosa, Ámbar y Coral.
- **Tipografía y jerarquía:** Fuente *Plus Jakarta Sans* para títulos y textos con excelente legibilidad en pantallas pequeñas, combinada con números tabulares (`tabular-nums`) para precios y horarios.
- **Ergonomía móvil (Touch Zone):**
  - Barra de navegación inferior fija (`fixed bottom-0`) con accesos táctiles de 48px de alto para pulgar: *Agenda*, *Clientes*, *Servicios*, *Exportar/Imprimir* y *Configuración*.
  - Menús desplegables y modales estilo "Bottom Sheet" en celulares para operar fácilmente con una sola mano.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Almacenamiento Local Híbrido con Firebase Opcional Gratuito**
  - *Enfoque:* Los datos se guardan al instante en `localStorage` (sin necesidad de cuenta ni conexión a internet), y si el usuario decide conectar su cuenta de Google, se sincronizan con Cloud Firestore (plan gratuito Spark de Google, sin requerir tarjeta de crédito).
  - *Por qué:* Cumple estrictamente con el requisito de gratuidad inmediata sin suscripciones y asegura que nunca se pierda información.
- **Decisión 2: Exportación Dual (PDF/Impresión + Excel/CSV)**
  - *Enfoque:* Una hoja de estilos `@media print` que limpia la pantalla y formatea la agenda como planilla formal de salón, sumada a una función de generación de archivo `.csv` compatible directamente con Microsoft Excel y Google Sheets.
  - *Por qué:* Permite tanto imprimir la hoja del día para tenerla en el mostrador/espejo como llevar la contabilidad en hojas de cálculo.
- **Decisión 3: Recordatorios Combinados**
  - *Enfoque:* Enlace directo a WhatsApp (`https://wa.me/...`) con texto listo para enviar sin escribir nada, más un detector de turnos del día con avisos visuales destacados en la cabecera de la app.

---

## 4. Technical Architecture & Data Strategy

### System & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TU AGENDA LISTA (Frontend)                      │
│                                                                        │
│  ┌─────────────────────────┐          ┌─────────────────────────────┐  │
│  │    Top Bar / Estado     │          │    Bottom Navigation Bar    │  │
│  │   (Marca, Fecha, Sync)  │          │ (Agenda, Clientes, Srv, Imp)│  │
│  └────────────┬────────────┘          └──────────────┬──────────────┘  │
│               │                                      │                 │
│  ┌────────────▼──────────────────────────────────────▼──────────────┐  │
│  │                           VISTAS ACTIVAS                         │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │  │
│  │  │   Agenda Views   │  │   Clientes /     │  │  Exportación / │  │  │
│  │  │ (Día, Sem, Mes)  │  │    Servicios     │  │  Impresión PDF │  │  │
│  │  └─────────┬────────┘  └─────────┬────────┘  └────────┬───────┘  │  │
│  └────────────┼─────────────────────┼────────────────────┼──────────┘  │
│               │                     │                    │             │
│  ┌────────────▼─────────────────────▼────────────────────▼──────────┐  │
│  │                    CAPA DE ESTADO & SERVICIOS                    │  │
│  │   • Turnos CRUD (con código de color y estados)                  │  │
│  │   • Motor de Recordatorios (WhatsApp + Alertas en pantalla)      │  │
│  │   • Generador CSV / Excel y Print Layout                         │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
              ┌───────────────────────┴────────────────────────┐
              ▼                                                ▼
   [ Almacenamiento Local ]                         [ Google Cloud Firestore ]
   (Instantáneo, sin tarjeta)                       (Plan gratuito opcional)
```

### Data Model

- **Turno (Appointment):** `id`, `clienteNombre`, `clienteTelefono`, `servicioNombre`, `servicioId`, `fecha` (YYYY-MM-DD), `hora` (HH:mm), `duracionMinutos`, `precio`, `color` (hex), `estado` ('confirmado' | 'pendiente' | 'completado' | 'cancelado'), `notas`.
- **Cliente (Client):** `id`, `nombre`, `telefono` (WhatsApp), `email`, `notasTecnicas` (fórmulas, preferencias), `totalVisitas`.
- **Servicio (Service):** `id`, `nombre`, `categoria`, `duracionMinutos`, `precio`, `color`.
- **Configuración (Settings):** `nombreNegocio`, `telefono`, `moneda`, `horarioApertura`, `horarioCierre`.

### Pasos de Implementación

1. **Barra de navegación móvil adaptada:** Barra fija inferior para celulares y barra superior para computadoras con la marca "TU AGENDA LISTA".
2. **Motor de Calendario con 3 vistas:**
   - Vista diaria con horarios disponibles y ocupados.
   - Vista semanal interactiva de 7 días.
   - Vista mensual tipo cuadrícula con puntos de colores de turnos.
3. **Gestión de Turnos con Colores:** Selector de color visual (Azul, Celeste, Esmeralda, Fucsia, Violeta, Ámbar) para identificar rápidamente el tipo de turno o profesional.
4. **Módulo de Clientes y Servicios:** Altas, bajas, modificaciones y autocompletado en el formulario de turnos.
5. **Módulo de Recordatorios:** Panel de WhatsApp con plantillas en español y centro de alertas de turnos del día.
6. **Módulo de Impresión y Descarga:** Botón de impresión limpia optimizada para hojas de papel / PDF y generador de descarga `.csv` para Excel.
7. **Persistencia dual y guía gratuita:** Guardado automático local + sincronización opcional con Firebase sin costo.
