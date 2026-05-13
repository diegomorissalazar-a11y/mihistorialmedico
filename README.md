# MiHistorialMédico v16

App web progresiva (PWA) para historial médico familiar. Perfiles: Diego y Santiago.

## Stack
Tailwind CSS CDN · Alpine.js v3 · Firebase v9 compat (Firestore + Auth) · Chart.js · Dexie.js · Service Worker

## Firebase
Proyecto `lumen-6ed85` — credenciales en `app.js` bajo `FIREBASE_CONFIG`.

## Secciones (7)
| | Sección | Descripción |
|---|---|---|
| 🏠 | Inicio | Dashboard: meds del día, exámenes agendados con alerta, recordatorios |
| 🏥 | Consultas | Fase 1: crear cabecera. Fase 2: enriquecer con ＋ Agregar |
| 🔬 | Exámenes | Acordeón con detalle completo, seguimiento de estado y fecha de cita |
| 💊 | Medicamentos | Tomas diarias con horarios calculados |
| 💉 | Vacunas | Historial con próxima dosis |
| 📊 | Estadísticas | Gráficos de crecimiento con variación % + percentiles OMS |
| 👤 | Perfil | Nombre, sexo, fecha nacimiento, alergias, antecedentes quirúrgicos |

## Flujo de consulta (2 fases)
**Fase 1 — Crear cabecera:**
Botón "+ Agregar" → formulario simple (fecha, médico, especialidad, centro, diagnóstico, indicaciones, próximo control) → Guardar

**Fase 2 — Enriquecer:**
Click en el control guardado → expandir acordeón → botón "＋ Agregar" → menú con 3 opciones:
- 📏 **Examen físico** → alimenta Estadísticas automáticamente
- 💊 **Medicamentos** → alimenta sección Medicamentos con tomas y horarios
- 🔬 **Órdenes médicas** → alimenta sección Exámenes con seguimiento de agendamiento

Cada opción acepta entrada manual, JSON o combinación.

## Exámenes — estados
Pendiente → Agendado (con fecha de cita) → Completado (con resultado)
Los exámenes con fecha de cita aparecen en el Dashboard con alerta de días restantes.

## JSON de carga — formatos

### Consulta (cabecera)
```json
{
  "type": "consulta",
  "date": "2026-05-02",
  "doctor": "Dr. Guillermo Andrés Soto Cornejo",
  "specialty": "Urología Adulto",
  "hospital": "RedSalud Pedro de Valdivia",
  "diagnosis": "Diagnóstico...",
  "generalInstructions": "Indicaciones...",
  "physicalItems": [],
  "medicationItems": [
    { "name": "Pregabalina 75mg", "dose": "1 cápsula", "frequency": "Cada 24 horas", "durationDays": 15, "route": "Oral" }
  ],
  "examOrderItems": [
    { "name": "Eco Doppler Testicular", "type": "Imagenología", "notes": "Dolor testicular derecho", "scheduledDate": "2026-05-20" }
  ]
}
```

### Examen físico (para enriquecer)
```json
{ "weight": 11.2, "height": 83, "headCircumference": 47.8, "temperature": 37.0, "saturation": 98 }
```

### Medicamentos (para enriquecer)
```json
[
  { "name": "Amoxicilina 500mg", "dose": "1 cápsula", "frequency": "Cada 8 horas", "durationDays": 7, "route": "Oral" }
]
```

### Órdenes médicas (para enriquecer)
```json
[
  { "name": "Hemograma", "type": "Laboratorio", "notes": "En ayunas", "scheduledDate": "2026-05-25" }
]
```

## Percentiles OMS
Tablas OMS 2006 (Minsal Chile) para 0–24 meses. Requiere sexo y fecha de nacimiento en Perfil.

## Historial de versiones

### v16 — 13/05/2026
- Flujo consulta en 2 fases: crear cabecera → enriquecer con ＋ Agregar
- Menú de enriquecimiento: Examen físico · Medicamentos · Órdenes médicas
- Cada opción acepta JSON, formulario manual o combinación
- Exámenes: acordeón con detalle completo (origen, indicación, cita, resultado)
- Exámenes agendados con alerta en Dashboard (días restantes)
- Sección renombrada Mediciones → Estadísticas
- Filtro por estado en sección Exámenes
- Sin adjuntar documentos en formularios

### v15 — 13/05/2026
- Fix carga JSON: hospital, título automático, normalización de items

### v14 — 12/05/2026
- Fix medicamentos y exámenes no se creaban desde JSON

### v13 — 12/05/2026
- Fix acordeón consultas detalle completo · README incluido

### v12 — 12/05/2026
- Fix gráficos de crecimiento · Fix physicalItems

### v11 — 12/05/2026
- Reestructura a 7 secciones · Consultas acordeón · Perfil nuevo

### v10 — 12/05/2026
- Fix Firebase persistence API

### v9 — 12/05/2026
- Dosis múltiples con horarios · Percentiles OMS · Sexo en perfil

### v8 — 12/05/2026
- Fix Service Worker GitHub Pages (sw.js separado)

### v7 — 12/05/2026
- Edición medicamentos desde detalle

### v6 — 12/05/2026
- Fix funciones linked faltantes

### v5 — 12/05/2026
- Cargador JSON en consulta

### v1–v4 — 12/05/2026
- Versión inicial PWA + Firebase + correlativo

### v17 — 13/05/2026
- Medicamentos vencidos: muestra botón "✓ Marcar como concluido" en lugar de los horarios de toma
- Al concluir: `active: false`, pasa automáticamente a pestaña Historial
- Medicamentos vigentes: comportamiento sin cambios (horarios + contador de tomas)

### v18 — 13/05/2026
- Fix medicamentos no aparecían en la sección: Firestore orderBy usaba campo `date` pero medicamentos usan `startDate` — corregido con campo correcto por sección + fallback sin ordenamiento si falta índice
