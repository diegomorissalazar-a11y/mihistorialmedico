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
  examenes/        ← exámenes (con estados: Pendiente → Agendado → Completado)
  medicamentos/    ← medicamentos activos e historial
  vacunas/
  mediciones/      ← peso, talla, CC, glucosa, presión, colesterol
  medTaken/        ← registro diario de tomas de medicamentos
  recordatorios/
```

### Reglas Firestore
```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## Secciones de la app
| Sección | Descripción |
|---|---|
| 🏠 Inicio | Dashboard con stats, medicamentos del día, recordatorios |
| 🏥 Consultas | Acordeón expandible con diagnóstico, mediciones, recetas, órdenes, próximo control |
| 🔬 Exámenes | Estados: Pendiente → Agendado → Completado. Se crean desde Consultas |
| 💊 Medicamentos | Tomas diarias con horarios calculados por frecuencia |
| 💉 Vacunas | Historial con próxima dosis |
| 📏 Mediciones | Gráficos de crecimiento con variación porcentual por control + percentiles OMS |
| 👤 Perfil | Nombre, sexo, fecha nacimiento, alergias, antecedentes quirúrgicos |

## Carga de consultas desde JSON
En "Agregar consulta" hay un botón **📋 Cargar desde JSON**. Formato:
```json
{
  "type": "consulta",
  "date": "2026-04-29",
  "title": "Control 16 meses",
  "doctor": "Patricio Rivera Aguilera",
  "specialty": "Pediatría",
  "hospital": "INDISA",
  "diagnosis": "Resfriado común",
  "generalInstructions": "NAN 250cc, Acevit 8 gotas día",
  "physicalItems": [
    { "type": "Peso", "value": "11.2", "unit": "kg" },
    { "type": "Talla", "value": "83", "unit": "cm" },
    { "type": "Circunferencia craneana", "value": "47.8", "unit": "cm" }
  ],
  "medicationItems": [
    { "name": "Broncotusilan 100mg/5ml", "dose": "2.5 ml", "frequency": "Cada 8 horas", "durationDays": 10, "route": "Oral" }
  ],
  "examOrderItems": [
    { "name": "Hemograma", "type": "Laboratorio", "notes": "En ayunas" }
  ]
}
```

## Percentiles OMS
La sección Mediciones muestra percentiles P3–P97 para peso y talla basados en tablas OMS 2006 (adoptadas por Minsal Chile). Requiere que el perfil tenga **sexo biológico** y **fecha de nacimiento** configurados. Válido para 0–24 meses.

## Horarios de medicamentos
La app calcula automáticamente los horarios de toma según la frecuencia, dentro de la ventana 06:00–18:00:
| Frecuencia | Dosis/día | Horarios |
|---|---|---|
| Cada 6 horas | 4 | 06:00 · 10:00 · 14:00 · 18:00 |
| Cada 8 horas | 3 | 06:00 · 12:00 · 18:00 |
| Cada 12 horas | 2 | 06:00 · 18:00 |
| Diaria | 1 | 08:00 |

---

## Historial de versiones

### v13 — 12/05/2026
- Fix acordeón consultas: muestra doctor, fecha, diagnóstico, mediciones (campos planos + physicalItems array), medicamentos con dosis y vía, órdenes de examen, próximo control, indicaciones y notas
- README incluido en el zip

### v12 — 12/05/2026
- Fix gráficos de crecimiento no aparecían (canvas IDs y maintainAspectRatio)
- Fix consultas physicalItems leía campos incorrectos

### v11 — 12/05/2026
- Reestructura arquitectura: de 14 tabs a 7 (Inicio, Consultas, Exámenes, Medicamentos, Vacunas, Mediciones, Perfil)
- Consultas expandibles tipo acordeón
- Exámenes con flujo de estados (Pendiente → Agendado → Completado)
- Mediciones fusionada con Estadísticas
- Sección Perfil nueva (nombre, sexo, fecha nacimiento, alergias, cirugías)

### v10 — 12/05/2026
- Fix Firebase persistence API (enablePersistence en lugar de enableMultiTabIndexedDbPersistence)
- Elimina settings() que generaba conflicto de host

### v9 — 12/05/2026
- Dosis múltiples con horarios calculados (Cada 8h → 3 botones: 06:00 · 12:00 · 18:00)
- Percentiles OMS para peso y talla (0–24 meses, tablas Minsal Chile)
- Campo sexo biológico en perfil

### v8 — 12/05/2026
- Fix Service Worker blob (no compatible con GitHub Pages) → archivo sw.js separado
- Fix Firestore persistence deprecada

### v7 — 12/05/2026
- Edición de medicamentos desde el detalle (✏️ Editar)
- Modal de detalle con modo vista / modo edición

### v6 — 12/05/2026
- Fix createLinkedMeasurementFromConsulta, createLinkedMedicationsFromConsulta, createLinkedExamOrdersFromConsulta (funciones faltantes)

### v5 — 12/05/2026
- Cargador JSON en modal de consulta (📋 Cargar desde JSON)
- Formato JSON definido para recetas, controles y órdenes médicas

### v4 — 12/05/2026
- Correlativo de versión en nombre del zip

### v3 — 12/05/2026
- Firebase configurado con proyecto lumen-6ed85

### v1-v2 — 12/05/2026
- Versión inicial: PWA completa con Firebase Auth, Firestore, todas las secciones base
