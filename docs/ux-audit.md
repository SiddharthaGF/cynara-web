# Cynara — End-to-End UX Audit

> **Método de auditoría**: navegación externa completa vía Browser MCP desde
> `http://localhost:5173/es` (la app corre en el puerto 5173, no 5174).
> Evaluación hecha como usuario nuevo, sin consultar documentación ni rutas
> internas durante la exploración. Se completaron los flujos principales de
> paciente, atención clínica, formularios y workflows, incluyendo la creación,
> publicación y llenado real de un documento clínico. No se modificó código.
>
> **Impeccable**: se ejecutó el detector determinista (`detect.mjs`) sobre el
> código fuente y se aplicaron los marcos de _critique_ (heurísticas de Nielsen,
> carga cognitiva, personas) y _audit_ (a11y, rendimiento, theming, responsive,
> integridad) con evidencia del navegador. ⚠️ DEGRADED: critique en contexto
> único (la revisión de diseño se realizó con evidencia de navegación en vivo en
> lugar de sub-agentes A/B aislados).
>
> Fecha de la auditoría: 2026-08-08

---

## 1. First Impression

Un usuario nuevo entra y ve una barra lateral con dos zonas: **"Atención"**
(Inicio, Pacientes) y **"Configuración"** (Formularios, Flujos de trabajo,
Administración). La página de inicio dice "¿Qué querés hacer hoy?" con cuatro
atajos: _Registrar un paciente_, _Nueva consulta_, _Diseñar un formulario_,
_Diseñar un flujo_.

**Qué cree que hace Cynara:** una plataforma de gestión clínica donde se
registran pacientes, se diseñan formularios y se modelan procesos. La división
Atención/Configuración comunica eso razonablemente bien.

**Qué parece importante:** los atajos de "Empezar algo nuevo" y las secciones de
recientes.

**Qué resulta confuso en los primeros minutos:**

- El **dashboard está contaminado por datos de prueba técnicos**: "E2E AI chat
  e2e-ai-1786046966714 sin borrador", "E2E workflow preview e2e-wf-1786201021475
  Borrador". Un usuario nuevo lee esto y cree que el sistema está roto o que
  está en un sandbox de pruebas.
- Las **consultas activas muestran claves de traducción sin traducir**:
  `types.emergency`, `types.ambulatory`. Es el primer texto "roto" visible.
- La lista de pacientes muestra **902 pacientes idénticos** ("Hypatia
  Alexandria", misma fecha de nacimiento), lo que destruye la confianza de
  inmediato.
- Nada explica qué es un "formulario clínico" ni qué relación tiene con "flujos
  de trabajo" ni dónde "viven" los documentos terminados.

**Qué espera encontrar:** una búsqueda global, el paciente sobre el que trabajó
ayer, y una forma evidente de empezar una consulta. La búsqueda global existe
(paleta de comandos `⌘K`) pero es fácil pasarla por alto; "Nueva consulta" desde
el inicio lleva a la lista de pacientes sin explicar qué hacer luego.

**Primer veredicto:** la aplicación tiene una estructura clara (casi buen
"workspace"), pero **la contaminación de datos de demo/E2E, las claves i18n sin
traducir y el lenguaje técnico la hacen parecer un entorno de desarrollo, no un
producto clínico.**

---

## 2. Application Map

```text
Cynara (/es)
├── Atención
│   ├── Inicio (/es)
│   │   ├── Empezar algo nuevo: Registrar un paciente / Nueva consulta / Diseñar un formulario / Diseñar un flujo
│   │   ├── Formularios recientes
│   │   ├── Flujos recientes
│   │   ├── Consultas activas
│   │   └── Ir a (botones de acceso rápido)
│   └── Pacientes (/es/patients)
│       ├── Buscar (HC / Nombre / Apellidos / ID Nacional) + paginación
│       ├── Registrar paciente (formulario de alta)
│       ├── Fila de paciente: Nueva consulta · Abrir historia clínica
│       └── Paciente (/es/patients/:id)
│           ├── Datos generales / edición
│           ├── Consultas (encuentros) y botón Nueva consulta
│           └── Consulta (encuentro)
│               ├── Configuración inicial: instalación, área clínica, tipo de consulta
│               ├── Menú contextual (…): iniciar documento/formulario
│               └── Documento clínico
│                   ├── Llenado de formulario (Guardar borrador / Completar / Cancelar / Registrado por error)
│                   └── Vista completada (solo lectura)
├── Configuración
│   ├── Formularios (/es/forms)
│   │   ├── Crear formulario (nombre → código auto-generado)
│   │   ├── Búsqueda y filtro de estado
│   │   └── Diseñador de formularios (canvas + paneles de campos/secciones)
│   ├── Flujos de trabajo (/es/workflows)
│   │   ├── Crear flujo (nombre → código auto-generado)
│   │   ├── Búsqueda y filtro de estado
│   │   └── Diseñador de flujos (canvas de nodos + conexiones)
│   └── Administración (/es/admin)
│       ├── Espacio de trabajo del hospital
│       ├── Instalaciones
│       ├── Áreas clínicas
│       ├── Disciplinas
│       └── Catálogo de documentos clínicos (204 registros)
└── Global
    ├── Paleta de comandos (Buscar ⌘K)
    ├── Ajustes: Idioma · Tema · Proveedor de IA
    └── Cuenta: Configuración del espacio de trabajo (sin cerrar sesión)
```

---

## 3. Critical User Journeys

| Journey                                       |         Clicks |                  Decisiones | Cognitive Load                 | Discoverability                                                                                            | Resultado                    |
| --------------------------------------------- | -------------: | --------------------------: | ------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Crear paciente                                |              4 |                           0 | Baja–Media                     | Espontánea (botón "Registrar paciente" + atajo Home)                                                       | ✅ Funciona                  |
| Buscar paciente                               |            2–3 |                           0 | Baja                           | Espontánea (búsqueda visible)                                                                              | ✅ Funciona                  |
| Abrir historia clínica                        |              2 |                           0 | Baja                           | Espontánea (botón en fila)                                                                                 | ✅ Funciona                  |
| Editar paciente                               |            3–4 |                           0 | Baja                           | Requiere explorar la página del paciente                                                                   | ✅ Funciona pero escondido   |
| Crear consulta                                |            4–5 | 3 (instalación, área, tipo) | Media                          | **Difícil**: botón "Nueva consulta" desde fila/lista, pero "Iniciar documento" queda en un menú (…) oculto | ✅ Funciona con fricción     |
| Abrir historia clínica y ver documento        |            3–4 |                           0 | Media                          | Exploración necesaria                                                                                      | ✅ Funciona                  |
| Encontrar formulario                          |              2 |           1 (filtro estado) | Media (catálogo denso)         | Espontánea pero abrumadora (391 items)                                                                     | ⚠️ Fricción                  |
| Crear formulario                              |              3 |                  1 (nombre) | Baja                           | Espontánea                                                                                                 | ✅ Funciona                  |
| Publicar formulario                           |            4–5 |     2 (publicar, confirmar) | Alta (jerga)                   | Funciona pero el formulario **desaparece del catálogo tras publicar**                                      | ❌ **Recuperación fallida**  |
| Encontrar/editar formulario creado            | 1–2 (búsqueda) |                           0 | —                              | **No descubrible**: la búsqueda no lo encuentra                                                            | ❌ **Bloqueante**            |
| Crear flujo de trabajo                        |              3 |                  1 (nombre) | Baja                           | Espontánea                                                                                                 | ✅ Funciona                  |
| Publicar flujo                                |            4–5 |                           2 | Alta (validaciones del canvas) | El flujo **desaparece del catálogo tras publicar**                                                         | ❌ **Recuperación fallida**  |
| Encontrar flujo creado                        |            1–2 |                           0 | —                              | **No descubrible**: búsqueda vacía                                                                         | ❌ **Bloqueante**            |
| Encontrar formulario disponible para paciente |            3–4 |                         1–2 | Alta                           | **Muy difícil**: Consulta → menú (…) → seleccionar formulario                                              | ✅ Funciona tras descubrirlo |
| Completar formulario                          |            1–2 |                           1 | Media                          | El "Completar" está al fondo de una página larga; errores genéricos primero                                | ✅ Funciona                  |
| Encontrar el resultado después                |              3 |                           0 | Media                          | Solo desde la consulta del paciente; no hay "mis documentos"                                               | ⚠️ Fricción                  |

**Fricción crítica detectada en FASE 5:** se creó un formulario ("Evaluación de
dolor") y un flujo ("Triage de urgencias"), se publicaron, y **ninguno de los
dos es recuperable**: ni en el listado ni con la búsqueda ni con el filtro de
estado. Para un usuario nuevo, el mensaje implícito es _"lo que creé se
perdió"_.

---

## 4. Top UX Frictions

**F1 — Lo que creas y publicas desaparece del catálogo (P0)**

- **Dónde**: `/es/forms` y `/es/workflows` tras crear y publicar un borrador.
- **Qué esperaba**: ver mi formulario/flujo en la lista, con estado "Publicado",
  y poder volver a editarlo.
- **Qué ocurre**: el listado muestra 391 formularios y 100 flujos de prueba,
  todos "Borrador"/"sin borrador"; los míos no aparecen. La búsqueda devuelve
  "No hay formularios que coinciden".
- **Por qué genera fricción**: el ciclo de vida completo del diseñador (crear →
  editar → publicar → usar → volver a editar) se rompe. El usuario pierde la
  noción de _dónde está su trabajo_.
- **Severidad**: P0.
- **Recomendación**: mostrar en el catálogo todos los estados (incluidos
  publicados), con el elemento creado resaltado ("Acabas de crear…"), y
  confirmar tras publicar hacia dónde navegar. Investigar el alcance/workspace:
  los objetos se crearon en un contexto distinto al visible.

**F2 — Claves de traducción sin traducir en la interfaz (P0)**

- **Dónde**: Home → "Consultas activas" muestra `types.emergency`,
  `types.ambulatory`.
- **Qué esperaba**: "Urgencias", "Ambulatorio".
- **Qué ocurre**: se renderiza la clave i18n en lugar del valor.
- **Por qué**: parece un error de software delante del usuario.
- **Severidad**: P0 (texto visible roto en la primera pantalla).
- **Recomendación**: corregir la resolución de la clave (probablemente el código
  del tipo de consulta no pasa por el diccionario); agregar un test que impida
  renderizar claves i18n.

**F3 — Jerga técnica de desarrollo en textos de usuario (P1)**

- **Dónde**: formulario clínico "Intake assessment": bloques "blood-pressure",
  "medications"; ayudas "Bloque reutilizable compilado al publicar", "Usado para
  visibilidad condicional en este showcase", "Sin filas — añade una para simular
  datos repetibles".
- **Qué esperaba**: "Presión arterial", "Medicamentos", "Se completa con la
  sección…".
- **Qué ocurre**: el usuario ve nombres técnicos de campos y notas de
  desarrollador.
- **Por qué**: rompe la credibilidad clínica y exige traducción mental.
- **Severidad**: P1 (extiende a formularios, catálogo, panel de administración).
- **Recomendación**: los textos de ayuda y títulos de bloques deben venir del
  contenido editable del formulario (con fallback de idioma), nunca de
  identificadores técnicos.

**F4 — Validación genérica primero, específica después (P1)**

- **Dónde**: documento clínico, botón "Completar" con campos faltantes.
- **Qué esperaba**: que se marquen los campos faltantes o se liste cuáles son.
- **Qué ocurre**: modal genérico "Hay campos que requieren tu atención." sin
  nombrar campos; recién al cerrarlo aparecen los "Obligatorio" por campo.
- **Por qué**: el usuario debe buscar los errores manualmente; en paralelo, la
  consola muestra el error técnico `Field 'vital.bp.diastolic' is required.`.
- **Severidad**: P1.
- **Recomendación**: validar al intentar completar, marcar en rojo y hacer
  scroll al primer campo con error; mostrar el resumen de campos faltantes en el
  modal.

**F5 — Conflictos de autosave enmascarados (P1)**

- **Dónde**: llenado rápido de un documento; 7 excepciones en consola:
  `The form response was modified by another request.`.
- **Qué esperaba**: guardado fluido e indicador claro de estado.
- **Qué ocurre**: el guardado optimista falla por concurrencia; la UI queda en
  "Cambios sin guardar — se guardarán automáticamente" mientras reintenta; sin
  mensaje para el usuario.
- **Por qué**: en redes lentas o al escribir rápido, hay riesgo de perder datos
  o de que el usuario no confíe en el guardado.
- **Severidad**: P1 (probado en vivo).
- **Recomendación**: encolar/coalescer los guardados, y si un conflicto
  persiste, mostrar un mensaje de recuperación accionable ("Tus últimos cambios
  no se guardaron. Reintentar").

**F6 — Idioma mixto en el selector de fecha y nodos (P1)**

- **Dónde**: date picker ("ene", pero "Go to the Previous Month"), nodos de
  workflow "Inicio"/"Fin" con descripciones "Workflow starts"/"Completed" en UI
  española, área clínica "Emergency" en vez de "Urgencias".
- **Qué esperaba**: interfaz completamente en español.
- **Qué ocurre**: cadenas en inglés dentro de una sesión `es`.
- **Por qué**: parece mantenimiento a medias.
- **Severidad**: P1.
- **Recomendación**: unificar el diccionario del date picker y de los nodos;
  auditar claves en inglés residuales.

**F7 — Datos de prueba/E2E visibles al usuario final (P1)**

- **Dónde**: Home (recientes), catálogos (391 formularios, 100 flujos),
  pacientes (902 "Hypatia Alexandria"), catálogo de documentos clínicos (204
  registros con nombres técnicos como `Triage note ws-1786046701755-3656`).
- **Qué esperaba**: datos reales o, al menos, un entorno limpio de demostración.
- **Qué ocurre**: el producto parece una base de pruebas.
- **Por qué**: destruye la confianza y hace inutilizable la búsqueda (un usuario
  no puede distinguir su formulario de un `E2E AI chat e2e-ai-…`).
- **Severidad**: P1 (impacto severo en percepción, no bloquea la función).
- **Recomendación**: segregar datos de E2E en entornos no-productivos, o
  marcarlos y filtrarlos; en demo, poblar con datos realistas.

**F8 — Crear una consulta y llegar al formulario es un camino oculto (P1)**

- **Dónde**: Pacientes → Abrir historia → Consulta → menú (…) → "Iniciar
  documento".
- **Qué esperaba**: "Nueva consulta" disponible con un siguiente paso claro.
- **Qué ocurre**: el punto de partida del documento clínico está en un menú
  contextual no señalizado.
- **Por qué**: un usuario nuevo no lo encuentra sin explorar; la regla
  fundamental dice que si existe pero no se descubre, es un problema.
- **Severidad**: P1.
- **Recomendación**: en la pantalla de consulta, un panel persistente
  "Documentos de esta consulta" con botón "Iniciar documento" visible (no solo
  en el menú …), y una llamada en el empty state de la consulta.

**F9 — Sin cierre de sesión en el menú de cuenta (P2)**

- **Dónde**: menú "Cuenta".
- **Qué esperaba**: cerrar sesión.
- **Qué ocurre**: solo "Configuración del espacio de trabajo".
- **Por qué**: control y libertad básicos faltantes.
- **Severidad**: P2.
- **Recomendación**: agregar "Cerrar sesión" al menú.

**F10 — Bug de slug con caracteres acentuados (P1)**

- **Dónde**: creación de formularios; "Evaluación de dolor" generó el código
  `evaluaci-n-de-dolor`.
- **Qué esperaba**: `evaluacion-de-dolor`.
- **Qué ocurre**: las vocales acentuadas se eliminan y queda un guion fantasma.
- **Por qué**: el código técnico queda feo y difícil de recordar; además es
  parte del motivo por el que el formulario es difícil de buscar.
- **Severidad**: P1.
- **Recomendación**: normalizar (NFD + strip diacríticos) antes de slugificar.

---

## 5. Navigation Analysis

- **Navegación profunda**: el flujo _Paciente → Historia → Consulta → menú (…) →
  Iniciar documento → Formulario_ entierra la acción principal de atención. El
  breadcrumb ayuda a regresar, pero el camino de ida no se enseña solo.
- **Acciones escondidas**: "Iniciar documento" (menú …), editar paciente,
  retirar elementos, "Mostrar retirados" (switch sin label claro), publicación
  en diseñadores.
- **Rutas inesperadas**: desde Home, "Nueva consulta" lleva a la _lista de
  pacientes_ (no a una consulta); desde el catálogo, "Clinical showcase" tiene
  estado "sin borrador" y _sin acciones de fila_ (celda de acciones vacía), lo
  que parece un error.
- **Breadcrumbs**: presentes y útiles en páginas de detalle (Pacientes →
  Paciente → Consulta → Documento). Ausentes en diseñadores, donde volver es
  solo por navegación lateral.
- **Menús confusos**: el menú "Cuenta" no tiene logout; el filtro de estado
  combobox muestra el valor crudo `all`.
- **Duplicación de caminos**: existe paleta de comandos + atajos de Home +
  sidebar; en general es coherente, pero la paleta (⌘K) es el único acceso
  global y no se anuncia en el onboarding (no hay onboarding).
- **Ruido de navegación**: el estado de carga "Verificando tu acceso…" aparece
  en cada página nueva sin progreso ni explicación.

---

## 6. Cognitive Load Analysis

**Pantallas con carga más alta:**

1. **Catálogo de formularios / flujos (Alta–Extrema)**: 391 filas de items
   técnicos indistinguibles ("E2E AI chat e2e-ai-1786046966714"), columna
   "Estado" con valores poco claros ("sin borrador"), columna "Publicado" con
   versiones ("1.0.0, 1.0.1"). El usuario debe recordar el código técnico para
   reconocer su trabajo. Violaciones: Wall of Options, Jargon Barrier, Visual
   Noise Floor.
2. **Diseñador de formularios (Alta)**: conviven canvas, paneles de campos,
   secciones, ajustes de campo y opciones avanzadas; la jerga ("Bloque
   reutilizable", "visible en este showcase") obliga a traducción mental.
   Configuración avanzada aparece demasiado pronto.
3. **Diseñador de flujos (Alta)**: nodos con roles técnicos, validaciones que
   exigen corregir conexiones manualmente; el modelo mental de "qué pasa cuando
   se ejecuta" no se comunica.
4. **Formulario clínico en uso (Media)**: página larga de una sola columna con 3
   secciones y ~20 campos; agrupación correcta pero el "Completar" queda al
   final, fuera de vista, y los errores genéricos obligan a escanear.
5. **Configuración de consulta (Media)**: tres decisiones consecutivas
   (instalación, área, tipo) con nombres mixtos en idiomas ("Emergency" vs
   "Urgencias").

**Lo que funciona:** Home ("¿Qué querés hacer hoy?") es bajo en carga; las
secciones del formulario clínico están agrupadas con encabezados claros; el
catálogo de administración usa tarjetas con descripción.

---

## 7. Discoverability Analysis

| Funcionalidad                     | ¿Se descubre?                  | Nota                                    |
| --------------------------------- | ------------------------------ | --------------------------------------- |
| Registrar paciente                | Espontánea                     | ✅                                      |
| Buscar paciente                   | Espontánea                     | ✅                                      |
| Nueva consulta                    | Espontánea (botón)             | ✅ pero el siguiente paso no            |
| **Iniciar documento en consulta** | **Requiere exploración**       | ❌ menú (…) oculto                      |
| Crear formulario                  | Espontánea                     | ✅                                      |
| **Publicar formulario/flujo**     | Requiere explorar el diseñador | ❌ sin guía; y tras publicar desaparece |
| **Recuperar lo creado**           | **No descubrible**             | ❌ búsqueda vacía                       |
| Editar paciente                   | Requiere explorar la ficha     | ⚠️                                      |
| Editar un formulario publicado    | No descubrible                 | ❌ no aparece en catálogo               |
| Paleta de comandos ⌘K             | No anunciada                   | ⚠️ existe pero nadie la presenta        |
| Cerrar sesión                     | No existe                      | ❌                                      |

**Comprensión:** los términos "borrador", "sin borrador", "publicado" se
entienden a medias; "código técnico", "bloque reutilizable", "concurrencia
optimista" (texto visible en la cabecera del catálogo) son jerga de desarrollo.
**Recuperación:** breadcrumbs y "Limpiar" son buenos; pero **no existe manera de
volver a lo que uno creó** (el problema más serio del producto).

---

## 8. Application vs Landing Page

**Diagnóstico por zonas:**

- **Landing page / SaaS marketing**: la Home ("¿Qué querés hacer hoy?", atajos
  grandes, "Retomá donde lo dejaste") bordea el patrón de landing. No es grave,
  pero las tarjetas de "recientes" llenas de datos E2E la hacen parecer un demo
  kit más que un workspace.
- **SaaS dashboard**: la Home con métricas ausentes pero secciones de
  "recientes/activas" cae en el patrón de dashboard de marketing. **Faltan
  métricas útiles** (pacientes atendidos hoy, consultas pendientes); las que hay
  (formularios recientes) no sirven para trabajar.
- **Application**: el grueso del producto (búsqueda de pacientes, fichas,
  formularios clínicos, administración) ya se comporta como aplicación de
  trabajo. ✅
- **Professional application / Clinical workspace**: no del todo por el
  **lenguaje técnico y los datos de prueba**. Un workspace clínico no muestra
  "E2E workflow preview e2e-wf-…" en su pantalla principal.

**Qué debería cambiar:**

- Home orientada a _trabajo pendiente_: "Consultas activas" con nombres legibles
  (no claves i18n), recientes con nombres humanos, atajo dominante "Atender
  pacientes".
- Limpiar o filtrar datos de E2E; nunca mezclar con contenido real.
- El catálogo de formularios debe hablar de "versiones publicadas" en lenguaje
  humano ("Versión activa 1.0.1", "Sin publicar") en lugar de "sin borrador".

---

## 9. Clinical UX

**Lo bueno:** el documento clínico comunica el paciente (breadcrumb +
encabezado), el estado ("En curso" → "Completado"), la versión del formulario y
los campos obligatorios (*). El empty state de la historia clínica está bien
redactado. El flujo de completar con confirmación ("El documento se completará,
se validará y pasará a formar parte del registro clínico permanente") es clínico
y responsable.

**Lo malo:**

- **El paciente no "viaja" con la atención.** En el llenado del formulario, el
  nombre del paciente solo está en el breadcrumb; no hay una cabecera de
  paciente persistente (edad, HC, alertas) que refuerce _"estoy atendiendo a
  Hypatia"_.
- **"Estoy atendiendo a este paciente" vs "estoy navegando módulos"**: la
  consulta se siente como una pantalla de configuración (instalación/área/tipo)
  y recién después aparece el trabajo clínico.
- **Jerga dentro del acto clínico**: bloques "blood-pressure"/"medications"
  durante la atención son inaceptables para un workspace clínico.
- **Errores técnicos en el acto clínico**:
  `Field 'vital.bp.diastolic' is required` (solo en consola, pero es señal de
  que la validación visible es una capa superficial).
- **Información histórica**: existe la sección de historia, pero "encontrar
  información relevante de un paciente" no tiene un atajo (p. ej. una línea de
  tiempo o resumen de constantes).

---

## 10. Form Builder UX

Evaluado desde cero, sin saber qué es un "diseñador":

- **¿Entiendo qué estoy editando?** A medias. Hay canvas + paneles, pero el
  formulario de ejemplo interno ("Clinical showcase") confunde: el usuario no
  distingue si está editando el producto o un ejemplo.
- **¿Sé dónde agregar un campo?** Requiere explorar los paneles; no hay una
  invitación visual ("Arrastrá o hacé clic para agregar").
- **¿Campo/sección/configuración?** No se explica la diferencia; aparecen juntos
  y con opciones avanzadas a la vista demasiado pronto.
- **¿Sé cómo guardar?** Hay autosave ("Los cambios se autoguardan con
  concurrencia optimista" — texto técnico), pero la frase "concurrencia
  optimista" es jerga de desarrollador.
- **¿Sé si está publicado?** No. La columna "Publicado" del catálogo muestra
  versiones ("1.0.0, 1.0.1") sin explicación; el estado "sin borrador" es
  incomprensible.
- **¿Sé cómo volver?** No hay botón evidente en el diseñador; se regresa por la
  navegación lateral.
- **¿Entiendo el resultado final?** No hay vista previa accesible desde el
  diseñador sin saber qué buscar (el "preview" existe pero no está señalizado).
- **Carga cognitiva: Alta.** Terminología técnica + opciones avanzadas
  tempranas + ausencia de guía.

---

## 11. Workflow Builder UX

- **¿Entiendo qué estoy construyendo?** "Proceso clínico de varios pasos" se
  entiende, pero el canvas no lo explica con un ejemplo guiado.
- **¿Cómo empiezo?** El canvas muestra nodos "Inicio" y "Fin" con descripciones
  en inglés ("Workflow starts", "Completed") en una UI en español; un usuario
  nuevo descuenta consistencia.
- **¿Qué representa cada nodo?** Nodos con roles que no se explican; la
  diferencia entre paso/tarea/condición no se comunica.
- **¿Entiendo las conexiones?** La validación obligó a corregir conexiones
  manualmente para poder publicar, sin explicar por qué estaban mal.
- **¿Sé si el flujo es válido?** Aparecen "warnings" que el usuario debe
  interpretar solo.
- **¿Sé guardar/publicar?** Publicar existe, pero **tras publicar el flujo
  desaparece del catálogo** — el modelo mental "lo publiqué y ya está
  disponible" se rompe porque no puedo verlo ni editarlo.
- **Carga cognitiva: Alta.** El modelo mental del sistema (nodos, conexiones,
  validación, estados) supera lo que el canvas enseña.

---

## 12. UX Writing

**Terminología técnica visible al usuario:**

| Texto                                                    | Problema                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `types.emergency`, `types.ambulatory`                    | Claves i18n renderizadas                                     |
| "Bloque reutilizable compilado al publicar"              | Nota de implementación                                       |
| "blood-pressure", "medications"                          | IDs de campo como labels                                     |
| "Usado para visibilidad condicional en este showcase"    | Nota de demo                                                 |
| "Sin filas — añade una para simular datos repetibles."   | Instrucción de QA                                            |
| "Los cambios se autoguardan con concurrencia optimista." | Jerga técnica                                                |
| "sin borrador"                                           | Estado confuso                                               |
| "Workflow starts", "Completed"                           | Inglés en UI española                                        |
| "Go to the Previous Month" (date picker)                 | Inglés en UI española                                        |
| "Se genera desde el nombre — puedes editarlo."           | Bien, pero el "código técnico" no se explica para el usuario |

**Botones genéricos:** "Buscar", "Limpiar", "Agregar", "Editar", "Retirar" son
aceptables; "Mantener abierto"/"Completar documento" en el modal de confirmación
están bien. **Errores:** "Hay campos que requieren tu atención." es genérico y
no accionable. **Éxitos:** faltan mensajes de éxito visibles tras publicar/crear
(el elemento desaparece sin confirmación de dónde quedó). **Empty states:** los
de historia clínica y de búsqueda ("Ningún formulario coincide…") son correctos.
✅ **Instrucciones:** el formulario clínico carece de micro-copys que ayuden
("¿Qué anotar en Motivo de consulta?"); los tooltips escasean.

---

## 13. States

| Estado          | Evidencia                                                                   | Evaluación                                             |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| Empty           | Historia clínica sin consultas: texto claro y accionable                    | ✅ Bueno                                               |
| Loading         | "Verificando tu acceso…" en cada ruta, sin spinner de progreso              | ⚠️ Minimalista pero repetitivo                         |
| Error           | Validación de campos: primero modal genérico, luego "Obligatorio" por campo | ⚠️ En dos pasos, genérico al inicio                    |
| Success         | Sin toast/mensaje tras crear/publicar; el objeto simplemente desaparece     | ❌ Falla                                               |
| Disabled        | Documento completado: todo bloqueado + alerta "Este documento está cerrado" | ✅ Excelente                                           |
| Validation      | Obligatorio (*) visible; mensajes "Obligatorio" por campo                   | ⚠️ Correcto pero tardío                                |
| Confirmation    | Modal "¿Completar este documento?" con texto clínico claro                  | ✅ Bueno                                               |
| Unsaved changes | "Cambios sin guardar — se guardarán automáticamente"                        | ⚠️ Bien, pero oculta conflictos de concurrencia reales |

---

## 14. Accessibility & Technical UX (Impeccable audit)

**Detector determinista** (`detect.mjs` sobre el repo): 2 hallazgos, ambos
menores, ambos en `src/index.css`:

- `layout-transition` (warning): transición de `width, height` → riesgo de
  layout thrash.
- `codex-grid-background` (advisory): fondo de rejilla con `linear-gradient`
  tiled — firma de UI generada; reservar para canvas reales.

**Scoring del audit:**

| #         | Dimensión                | Score     | Hallazgo clave                                                                                                                                                                                              |
| --------- | ------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Accessibility            | 2         | HTML semántico y ARIA correctos (landmarks, dialog, radiogroups, botones nombrados), pero idioma mixto (aria del date picker en inglés), combobox con valor crudo `all`, y dependencia de color para estado |
| 2         | Performance              | 3         | Sin jank visible; detector marca una transición de layout y un fondo decorativo; bundle no medido (dev)                                                                                                     |
| 3         | Theming                  | 3         | Tokens shadcn y modo oscuro presentes; sin colores hard-coded detectados                                                                                                                                    |
| 4         | Responsive               | 2         | Sidebar colapsable y tablas paginadas; viewports estrechos y touch targets no verificables en esta sesión                                                                                                   |
| 5         | Implementation Integrity | 2         | Contenido de desarrollo/demo filtrado al usuario (jerga, claves i18n, datos E2E); detector limpio pero la "integridad del mensaje" falla                                                                    |
| **Total** |                          | **12/20** | **Acceptable**                                                                                                                                                                                              |

**Heurísticas de Nielsen (critique):**

| #         | Heurística                      | Score     | Hallazgo principal                                                                    |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| 1         | Visibilidad del estado          | 2         | Autosave y estados visibles, pero los conflictos de guardado son silenciosos          |
| 2         | Coincidencia sistema-mundo real | 1         | Jerga técnica y claves i18n; mezcla de idiomas                                        |
| 3         | Control y libertad              | 2         | Breadcrumbs y cancelaciones buenas; sin logout, sin recuperar lo creado               |
| 4         | Consistencia y estándares       | 2         | "sin borrador", "all", inglés/español mezclados                                       |
| 5         | Prevención de errores           | 2         | Validación client + confirmación, pero slug roto y validaciones confusas en diseñador |
| 6         | Reconocer antes que recordar    | 2         | Paleta ⌘K y acciones en fila, pero flujo de documento oculto y objetos perdidos       |
| 7         | Flexibilidad y eficiencia       | 1         | Solo ⌘K; sin atajos de acciones frecuentes, sin lote                                  |
| 8         | Diseño estético y minimalista   | 2         | Home limpia, pero catálogos ruidosos                                                  |
| 9         | Recuperación de errores         | 1         | Errores genéricos primero; conflictos de guardado no accionables                      |
| 10        | Ayuda y documentación           | 1         | Sin onboarding, sin ayuda contextual ni tours                                         |
| **Total** |                                 | **16/40** | **Poor** (12–19)                                                                      |

> Nota honesta: el camino feliz (crear paciente, llenar formulario, completar)
> funciona y tiene buen soporte de estados. La puntuación baja viene de la
> **capa de recuperación/discoverability** (objetos que desaparecen, errores
> genéricos, jerga) que es la que rompe la experiencia real.

---

## 15. Top 20 Issues

1. **P0** — Formularios/flujos creados y publicados no son recuperables (no
   aparecen en catálogo ni búsqueda).
2. **P0** — Claves i18n sin traducir visibles en Home (`types.emergency`,
   `types.ambulatory`).
3. **P1** — Jerga de desarrollo en el formulario clínico ("blood-pressure",
   "medications", "compilado al publicar", "en este showcase").
4. **P1** — Validación genérica primero ("Hay campos que requieren tu
   atención.") sin listar campos.
5. **P1** — Conflictos de autosave enmascarados (7 errores de concurrencia en
   consola durante el llenado).
6. **P1** — "Iniciar documento clínico" oculto en un menú (…) dentro de la
   consulta.
7. **P1** — Bug de slug con acentos: "Evaluación de dolor" →
   `evaluaci-n-de-dolor`.
8. **P1** — Datos de E2E/demo masivos visibles en producción (902 pacientes
   duplicados, 391 formularios, 100 flujos, 204 documentos técnicos).
9. **P1** — Idiomas mezclados (date picker, nodos de workflow, áreas clínicas
   "Emergency").
10. **P1** — Sin confirmación de éxito al crear/publicar; el objeto desaparece
    sin orientación.
11. **P1** — Workflow Builder: validaciones que obligan a corregir conexiones
    sin explicación.
12. **P2** — Sin cierre de sesión en el menú de cuenta.
13. **P2** — Filtro de estado con valor crudo `all` y columna "Publicado"
    incomprensible.
14. **P2** — Diseñador de formularios: opciones avanzadas a la vista demasiado
    pronto; sin guía para agregar campos.
15. **P2** — Diseñadores sin botón "Volver" explícito ni vista previa
    señalizada.
16. **P2** — El paciente no se mantiene presente durante la atención (sin
    cabecera persistente con edad/HC/alergias).
17. **P2** — Estado "sin borrador" como lenguaje de producto.
18. **P3** — "Toggle Sidebar" duplicado en nav y main; "Cuenta" con avatar
    "D"/"?" sin nombre legible.
19. **P3** — Transición de `width/height` y fondo de rejilla decorativa en CSS
    global (detector).
20. **P3** — Carga "Verificando tu acceso…" sin detalle en cada navegación.

---

## 16. Recommended UX Architecture

**Actual → Propuesto → Motivo**

1. **Objetos efímeros tras publicación** → Catálogos que listan todos los
   estados (Borrador / Publicado / Retirado) con el elemento recién creado
   destacado; tras publicar, redirigir al catálogo con un toast "Publicado ✓" y
   enlace de edición. **Motivo:** el ciclo de vida
   crear→editar→publicar→usar→re-editar debe ser continuo; hoy se interrumpe.

2. **Camino de atención enterrado** (Consulta → … → Iniciar documento) → Panel
   persistente "Documentos de esta consulta" en la pantalla de consulta, con CTA
   primaria "Iniciar documento" y el empty state enseñando el flujo. **Motivo:**
   la tarea más frecuente del clínico debe estar a 1 click visible, no en un
   menú contextual.

3. **Jerga y datos de prueba como textos de producto** → Fuente única de
   nombres/ayudas editable en cada formulario (sin fallback a IDs), auditoría de
   claves i18n (test que falle ante claves sin resolver), y ambientes segregados
   para datos E2E. **Motivo:** el contenido visible es el contrato de confianza
   clínica.

4. **Validación en dos tiempos** → Validar al pulsar "Completar": marcar todos
   los errores, hacer scroll al primero y mostrar el resumen en el modal
   ("Faltan 3 campos: Sistólica, Diastólica…"). **Motivo:** hoy el usuario caza
   errores manualmente.

5. **Autosave resiliente** → Coalescer guardados, exponer estado explícito
   ("Guardando…", "Guardado", "Error al guardar · Reintentar") y recuperar
   conflictos sin silencio. **Motivo:** la concurrencia optimista existe en
   backend pero no se comunica en UI.

6. **Home como workspace clínico** → Home = trabajo pendiente: consultas activas
   legibles, pacientes del día, atajos dominantes; mover "recientes de diseño" a
   una sección secundaria y etiquetarla "Mi trabajo". **Motivo:** transformar el
   dashboard-marketing en superficie operativa.

7. **Onboarding mínimo por enseñar con la interfaz** → Primera visita: paleta ⌘K
   anunciada, una "consulta guiada" (crear paciente → consulta → documento)
   opcional, y tooltips en los diseñadores. **Motivo:** los diseñadores son
   potentes pero exigen conocimiento previo; la ayuda contextual los vuelve
   autodidactas.

---

## 17. Prioritized Backlog

```text
P0
├── Corregir la no-recuperación de formularios/flujos creados y publicados en sus catálogos
├── Corregir claves i18n sin traducir (types.emergency, types.ambulatory) y prevenir regresión
└── (Investigación) Determinar si el alcance/workspace de creación difiere del catálogo visible

P1
├── Traducir toda la jerga de desarrollo en el formulario clínico y catálogos
├── Mejorar la validación de documentos: resumen de campos faltantes + scroll al primer error
├── Hacer visible "Iniciar documento" en la consulta (panel, no menú oculto)
├── Reparar el slug de caracteres acentuados
├── Comunicar éxito tras crear/publicar con destino claro
├── Resolver conflictos de autosave con estado y reintento visibles
├── Unificar idiomas (date picker, nodos de workflow, áreas clínicas)
├── Segregar/marcar datos de E2E en entornos no productivos
└── Explicar validaciones del Workflow Builder en lenguaje de usuario

P2
├── Agregar cierre de sesión al menú de cuenta
├── Rediseñar columnas de estado/versión del catálogo ("sin borrador", "all")
├── Guía de primer campo en el Form Builder y opciones avanzadas plegadas
├── Cabecera de paciente persistente durante la atención
├── "Volver" y "Vista previa" explícitos en ambos diseñadores
└── Mejorar el estado de carga ("Verificando tu acceso…")

P3
├── Quitar "Toggle Sidebar" duplicado y mostrar identidad del usuario en "Cuenta"
├── Sustituir transición de width/height y rejilla decorativa en index.css
├── Tooltips en micro-copys del formulario clínico
└── Resumen clínico/constantes accesible en 1 click desde la historia
```

---

### Conclusión

Cynara tiene **una base sólida de aplicación clínica**: navegación clara, empty
states bien escritos, confirmaciones responsables, y el flujo atencional
funciona de punta a punta. Pero **los problemas no están en el camino feliz sino
en la recuperación y el lenguaje**: lo que creas se pierde, la validación es
genérica primero, el autosave falla en silencio y el producto habla el idioma
del desarrollador. Para cumplir el criterio final — _"la interfaz me enseña
naturalmente cómo hacerlo"_ — el orden de prioridad es: **(1)** hacer
recuperable lo que se crea, **(2)** traducir la interfaz a lenguaje clínico,
**(3)** abrir el camino de atención a un click visible.
