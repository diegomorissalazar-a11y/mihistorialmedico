# MiHistorialMédico v2.7

## Cambio principal

Se elimina el enfoque OCR dentro de la app y se agrega un **Importador JSON/CSV**.

Flujo recomendado:

1. El usuario envía fotos de consultas/controles por ChatGPT.
2. ChatGPT extrae los campos y devuelve un JSON o CSV estructurado.
3. El usuario carga ese JSON/CSV en la app.
4. La app muestra una pantalla de revisión.
5. El usuario edita/confirma.
6. Recién después se guarda en el historial.

## Importador

Sección nueva:

- 📥 Importar JSON/CSV

Permite:

- Pegar JSON.
- Pegar CSV simple.
- Cargar archivo `.json` o `.csv`.
- Previsualizar.
- Editar antes de guardar.
- Descargar JSON/CSV corregido.
- Guardar consulta importada.

## Estructura JSON esperada

Ver `samples/consulta_ejemplo.json`.

Campos principales:

- fechaConsulta
- titulo
- profesional
- especialidad
- centroMedico
- mediciones
- diagnosticos
- medicamentos
- indicacionesGenerales
- proximoControl
- ordenesExamenes

## CSV simple

Ver `samples/consulta_ejemplo.csv`.

Columnas:

```csv
seccion,tipo,valor,unidad,detalle
```

Secciones válidas:

- medicion
- diagnostico
- medicamento
- indicacion
- orden

## Reglas

- No se guarda nada sin confirmación.
- Las mediciones con estado `confirmado` alimentan el dashboard.
- IMC se puede guardar en JSON, pero no se grafica.
- Medicamentos confirmados alimentan historial.
- Órdenes de exámenes se guardan con checklist.

## GitHub Pages

Sube todo el contenido del ZIP a la raíz del repositorio:

- index.html
- styles.css
- app.js
- README.md
- samples/

