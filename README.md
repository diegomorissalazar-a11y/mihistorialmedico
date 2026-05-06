# MiHistorialMédico v2.10

## Cambios principales

### Consulta / Control
El formulario ahora permite cargar por ítems:

1. Centro médico reutilizable.
2. Examen físico uno a uno.
3. Medicamentos uno a uno.
4. Órdenes médicas / exámenes uno a uno.

### Centro médico
Cada centro médico usado en consultas queda disponible para volver a seleccionarlo.

### Medicamentos
Cada medicamento indicado se agrega como tarjeta:
- Nombre.
- Dosis.
- Frecuencia.
- Días de consumo.
- Vía.
- Observaciones.

Al guardar la consulta, cada medicamento pasa automáticamente al panel Medicamentos.

### Examen físico
Cada indicador se agrega por separado:
- Peso.
- Talla.
- Circunferencia craneana.
- Temperatura.
- Saturación.
- Frecuencia cardíaca.
- Presión.
- Glucosa.
- Colesterol.
- Otro.

Los indicadores reconocidos alimentan Mediciones y gráficos.

### Órdenes médicas / exámenes
Cada orden se agrega como tarjeta:
- Nombre.
- Tipo/categoría.
- Indicación.

Al guardar la consulta, se crea en la sección Órdenes / exámenes como pendiente de agendar.

## Correcciones
- Se corrige error Alpine `v is not defined` en detalle de registros.
- Se elimina Service Worker por blob que generaba error en GitHub Pages.
- Se elimina manifest roto.
- `app.js` validado con `node --check`.

## Publicación
Reemplaza todos los archivos en GitHub Pages y luego haz Ctrl+F5.
Si se mantiene una versión antigua, borra el Service Worker y Cache Storage desde DevTools > Application.
