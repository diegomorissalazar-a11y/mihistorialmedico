# MiHistorialMédico

App web progresiva (PWA) para llevar el historial médico completo de por vida. Diseñada para uso personal familiar — actualmente para dos perfiles: Diego y Santiago.

## Stack técnico
- **Frontend:** HTML + Tailwind CSS (CDN) + Alpine.js v3
- **Base de datos:** Firebase Firestore (sync en tiempo real + offline)
- **Auth:** Firebase Authentication (email/contraseña)
- **Gráficos:** Chart.js
- **Offline:** IndexedDB (Dexie.js) como fallback
- **PWA:** Service Worker (`sw.js`) + manifest

## Configuración Firebase
El proyecto usa Firebase `lumen-6ed85`. Las credenciales están en `app.js` bajo `FIREBASE_CONFIG`.

### Estructura Firestore
```
users/{uid}/profiles/{profileId}/
  consultas/       ← consultas y controles
  examenes/        ← exámenes (Pendiente → Agendado → Completado)
  medicamentos/    ← medicamentos activos e historial
  vacunas/
  mediciones/      ← peso, talla, CC, glucosa, presión, colesterol
  medTaken/        ← registro diario de tomas
  recordatorios/
```

### Reglas Firestore
```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## Secciones
| Sección | Descripción |
|---|---|
| 🏠 Inicio | Dashboard con stats, medicamentos del día, recordatorios |
| 🏥 Consultas | Acordeón expandible. Al guardar crea automáticamente medicamentos y exámenes vinculados |
| 🔬 Exámenes | Estados: Pendiente → Agendado → Completado |
| 💊 Medicamentos | Tomas diarias con horarios calculados por frecuencia |
| 💉 Vacunas | Historial con próxima dosis |
| 📏 Mediciones | Gráficos de crecimiento con variación % + percentiles OMS |
| 👤 Perfil | Nombre, sexo, fecha nacimiento, alergias, antecedentes quirúrgicos |

## Carga de consultas desde JSON
En "Agregar consulta" → botón **📋 Cargar desde JSON**:
```json
{
  "type": "consulta",
  "date": "2026-05-02",
  "title": "Consulta Urología",
  "doctor": "Guillermo Andrés Soto Cornejo",
  "specialty": "Urología Adulto",
  "hospital": "RedSalud Pedro de Valdivia",
  "diagnosis": "Otros trastornos especificados de los órganos genitales masculinos",
  "generalInstructions": "",
  "physicalItems": [],
  "medicationItems": [
    { "name": "Pregabalina 75mg cápsula dura", "dose": "1 cápsula", "frequency": "Cada 24 horas", "durationDays": 15, "route": "Oral" },
    { "name": "Ketorolaco Trometamol 30mg", "dose": "1 comprimido", "frequency": "Cada 8 horas", "durationDays": 5, "route": "Sublingual" }
  ],
  "examOrderItems": [
    { "name": "Ecotomografía Doppler Testicular", "type": "Imagenología", "notes": "Dolor testicular derecho" }
  ]
}
```
Al guardar, los medicamentos se crean automáticamente en la sección Medicamentos y los exámenes en la sección Exámenes con estado "Pendiente".

## Percentiles OMS
Tablas OMS 2006 (Minsal Chile) para 0–24 meses. Requiere sexo y fecha de nacimiento en el perfil.

## Horarios de medicamentos
| Frecuencia | Horarios |
|---|---|
| Cada 6 horas | 06:00 · 10:00 · 14:00 · 18:00 |
| Cada 8 horas | 06:00 · 12:00 · 18:00 |
| Cada 12 horas | 06:00 · 18:00 |
| Diaria | 08:00 |

---

## Historial de versiones

### v14 — 12/05/2026
- Fix medicamentos y exámenes no se creaban al guardar consulta cargada desde JSON
- Fix arrays (medicationItems, examOrderItems) se perdían en el filtro de campos vacíos
- Normalización de campos: acepta `name` o `savedName`, incluye hospital y título de consulta de origen en medicamentos y exámenes vinculados

### v13 — 12/05/2026
- Fix acordeón consultas: muestra doctor, fecha, todos los campos expandidos correctamente
- README incluido en el zip

### v12 — 12/05/2026
- Fix gráficos de crecimiento no aparecían
- Fix consultas physicalItems

### v11 — 12/05/2026
- Reestructura a 7 secciones (Inicio, Consultas, Exámenes, Medicamentos, Vacunas, Mediciones, Perfil)
- Consultas expandibles tipo acordeón
- Exámenes con flujo de estados
- Mediciones fusionada con Estadísticas
- Sección Perfil nueva

### v10 — 12/05/2026
- Fix Firebase persistence API

### v9 — 12/05/2026
- Dosis múltiples con horarios calculados
- Percentiles OMS para peso y talla
- Campo sexo biológico en perfil

### v8 — 12/05/2026
- Fix Service Worker para GitHub Pages (sw.js separado)

### v7 — 12/05/2026
- Edición de medicamentos desde el detalle

### v6 — 12/05/2026
- Fix funciones linked desde consulta faltantes

### v5 — 12/05/2026
- Cargador JSON en modal de consulta

### v1–v4 — 12/05/2026
- Versión inicial PWA + Firebase + correlativo de versión
