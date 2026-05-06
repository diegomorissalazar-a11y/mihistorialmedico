# MiHistorialMédico v2.9

Versión estable con corrección de guardado de consultas y módulo de órdenes médicas.

## Correcciones
- Se corrige error `this.createLinkedMeasurementFromConsulta is not a function`.
- Se elimina registro Service Worker por blob que fallaba en GitHub Pages.
- Se elimina manifest inline roto para evitar error de consola.
- Se agrega favicon inline para evitar 404.
- Se mantiene Tailwind CDN: el warning de producción es informativo y no rompe la app.

## Nuevo en consulta/control
Dentro de Consulta / Control se agrega:

6. Órdenes médicas / exámenes solicitados

Formato sugerido, un examen por línea:

```text
Hemograma completo | Laboratorio | Ayuno 8 horas
Radiografía de tórax | Imagenología
Perfil lipídico | Laboratorio
```

Al guardar la consulta:
- Se crea la consulta.
- Las mediciones del examen físico alimentan Mediciones.
- Los medicamentos indicados alimentan Medicamentos.
- Las órdenes de exámenes alimentan la nueva sección Órdenes / exámenes.

## Estados de órdenes
- Pendiente agendar
- Cita agendada
- Resultado pendiente
- Completado

## Recomendación al publicar
Después de subir a GitHub Pages:
1. Ctrl + F5.
2. Si sigue cargando versión antigua: DevTools > Application > Service Workers > Unregister.
3. Borra Cache Storage.
