# Misión Enfoque · tamizaje de atención (TDAH) — CECyTEA Plantel Cd. Satélite Morelos

Aplicación web (PWA, se instala en Android como app) para aplicar un **tamizaje** de atención a alumnos y
ver resultados confidenciales. **No diagnostica.** Proyecto del Grupo 5J.

## 1. Cómo se usa

1. Un administrador abre la liga e **inicia sesión** (la liga sin sesión solo muestra el acceso:
   "La encuesta se aplica en el teléfono de orientación").
2. En **Inicio** toca **▶ Iniciar encuesta** (puede preseleccionar semestre/grupo/turno). El teléfono queda en
   **modo encuesta (kiosco)**: portada → datos (nombre opcional; edad, sexo, semestre, grupo y turno obligatorios)
   → 6 preguntas → 4 misiones opcionales → "¡Gracias!" (sin resultado clínico; Línea de la Vida 800 911 2000 y 911)
   → regresa a la portada para el siguiente alumno.
3. Para salir del kiosco: candado 🔒 de la portada + **contraseña del administrador** (reautenticación).
4. En el panel: **Tablero**, **Participantes** (rojo = requiere valoración), **Informe PDF**, **Excel (CSV)**,
   **Personas** (solo la administradora general) y **Mi cuenta**.

Cuenta inicial: usuario **kimberly**, contraseña **000000**, rol **general**. Al entrar con 000000 la app sugiere
cambiarla (no obliga). **Cámbienla el primer día** (ver sección 5, bóveda).

## 2. Instrumento (según `../investigacion_universidades_tamizaje.md`, sección 6)

- **ASRS v1.1 Parte A** (6 preguntas), texto oficial en español "EE. UU./México", **sin modificar** preguntas,
  opciones (Nunca, Raramente, A veces, Frecuentemente, Muy frecuentemente) ni calificación.
  Kessler RC et al. (2005) *Psychological Medicine* 35(2):245–256. Copyright © New York University and Ronald C. Kessler, PhD.
- Calificación oficial 2024: 0–4 por respuesta, total 0–24, **requiere valoración con ≥ 14**;
  bandas 0–9, 10–13, 14–17, 18–24. Subescalas descriptivas: inatención P1–P4 (0–16), hiperactividad P5–P6 (0–8).
  Casillas sombreadas (≥ 4 de 6) solo como dato secundario.
- Ejemplos escolares 💡: ayuda **opcional** propia, separada del texto oficial.
- Misiones (go/no-go, Corsi, cazador, semáforo): actividad didáctica, **no cuentan** en el puntaje.
- Tablero e informe: subgrupos con menos de 10 alumnos se muestran como **n<10**.
- Todo esto vive en **`instrumentos.js`** (datos separados). Si se cambia el instrumento, cambiar su `id`.
- Teléfonos en la app: solo los verificados (800 911 2000, 911, CIJ Aguascalientes 449 877 19 98).
  Antes de difundir, llamar y confirmar.

## 3. Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Única página: acceso, panel (rutas `#inicio`, `#tablero`, `#participantes`, `#informe`, `#personas`, `#cuenta`, `#acerca`) y modo encuesta |
| `estilos.css` | Estilo azul/blanco, celular primero, animaciones ligeras (respeta *reducir movimiento*) |
| `instrumentos.js` | Cuestionario, calificación, bandas, misiones, ruta de referencia (DATOS editables) |
| `almacenamiento.js` | Adaptador FIREBASE / DEMO, cuentas, permisos, bóveda cifrada de contraseñas, datos de ejemplo |
| `encuesta.js` / `juegos.js` | Flujo del alumno (kiosco) y las 4 misiones |
| `panel.js` | Acceso, tablero (Chart.js 4.4.1), participantes, CSV, personas, mi cuenta |
| `informe.js` | Estadística, análisis automático, gráficas e informe PDF (jsPDF 2.5.1 + autotable 3.8.2) |
| `dialogo.js` | Ventanas propias (sin alert/confirm/prompt del navegador) |
| `ilustraciones.js` | SVG: logo CECyTEA (del archivo original), mascota astronauta, cohete, cerebro, trofeo |
| `manifest.json`, `sw.js`, `iconos/` | PWA instalable y apertura sin señal |
| `pruebas/` | Prueba automática (`autoprueba.js`), marco de celular y `correr-pruebas.ps1` (Edge headless) |
| `capturas/` | Capturas de celular y PC + `resultado-prueba.json` |

Librerías por CDN con versión exacta: Firebase compat **10.12.2** (gstatic, la misma de app-web), Chart.js 4.4.1,
jsPDF 2.5.1 y jspdf-autotable 3.8.2 (cdnjs). Chart.js y jsPDF solo se descargan al abrir Tablero/Informe.

## 4. Probar sin Firebase (modo DEMO)

- Abrir `index.html?demo` (en esta carpeta no existe `../firebase-config.js`, así que entra a DEMO solo).
- Entrar con kimberly / 000000 → botón **Cargar 60 encuestas de ejemplo** (datos ficticios de 3 semanas).
- Los datos DEMO viven en el `localStorage` del navegador; "Borrar todo (demo)" los limpia.
- El modo DEMO **emula las mismas reglas** de Firestore de app-web, así que arranque, permisos y bóveda se prueban igual.
- Prueba automática completa: `pruebas\correr-pruebas.ps1 -SoloPrueba` (Edge headless; resultado en `capturas\resultado-prueba.json`).
  Capturas: `pruebas\correr-pruebas.ps1 -SoloCapturas`.

## 5. Firebase (mismo proyecto y repo de app-web, SIN reglas nuevas)

### Publicar
1. Copiar esta carpeta tal cual a `app-web/mision-enfoque/` (sin `pruebas/` ni `capturas/` si se desea).
2. Toma la configuración de **`../firebase-config.js`** (la de app-web, proyecto "Master general"). No hay que pegar nada.
3. Liga: `https://omarlineaitalia-a11y.github.io/mantenimiento-linea-italia/mision-enfoque/` (sin tarjeta en el portal).
4. **Inmediatamente** después de publicar, Kimi entra con kimberly / 000000 (esto crea su cuenta y `config/personal`)
   y cambia su contraseña.

En la consola de Firebase **no hay que configurar nada**: Authentication con correo/contraseña ya está activo y
Firestore ya existe. No se usa el proveedor Anónimo. Los alumnos no tienen cuenta.

### Datos (separados de mantenimiento)
```
apps/misionenfoque/config/personal   { p: { <usuario>: { n, r:'general'|'usuario', a, cargo, perm:{verEstadisticas, verNombres, descargarInformes, exportarExcel} } } }
apps/misionenfoque/config/boveda     { pub, priv:{c,iv,sal,it} }      (llave pública RSA-OAEP y privada cifrada con AES-GCM/PBKDF2 200k)
apps/misionenfoque/boveda/<usuario>  { c, t }                          (contraseña cifrada con la llave pública)
apps/misionenfoque/respuestas/<folio> { datos, resp[6], total, inat, hiper, positivo, banda, sombreadas, juegos, disp, capturadoPor, ts, nombre }
```
Correo interno de cada cuenta: `<usuario>@mision-enfoque.app` (distinto del de mantenimiento). La app usa una instancia
de Firebase con nombre propio (`misionenfoque`), así que su sesión **no se mezcla** con la de las apps de mantenimiento.

### Por qué funciona con las reglas existentes
La regla genérica de `app-web/firestore.rules` para `apps/{app}/{col}/{rest=**}`:
- **read** si `enPersonal(app)`: la parte local del correo (antes de `@` y de `.`) está en `apps/misionenfoque/config/personal.p` y `a != false`.
- **write** si `enPersonal(app) && (col != 'config' || esAdmin(app))`, o si hay sesión y **todavía no existe** `config/personal`.

Así:
- **Arranque**: la primera vez que se entra con kimberly/000000 se crea la cuenta Auth y, por la rama `!hayPersonal`,
  `config/personal` con Kimi como `general`, la bóveda y su contraseña cifrada (en un solo lote).
- **Kimi** (`r:'general'`, cuenta como `esAdmin`) puede escribir `config` (dar de alta, permisos, bóveda).
- **Administradores** que agrega Kimi llevan `r:'usuario'`: leen y capturan encuestas pero **no pueden escribir `config`**.
  Sus cuentas se crean con una **segunda instancia** `firebase.initializeApp(cfg,'secundaria')` para no cerrar la sesión de Kimi.
- **Usuarios**: 3–20 caracteres `a-z 0-9 _`, **empiezan con letra** (nunca chocan con una nómina numérica de mantenimiento) y sin puntos.

### Límites (importante)
1. **Permisos de pantalla**: las reglas solo distinguen "dado de alta" vs "general". Un administrador con sesión podría,
   con herramientas técnicas, leer todas las respuestas (incluidos nombres) o borrar respuestas aunque su pantalla no lo
   muestre. Los permisos `verNombres`, `descargarInformes`, `exportarExcel` y `verEstadisticas` controlan lo que la app muestra.
2. **Ventana de arranque**: mientras no exista `config/personal`, cualquier cuenta con sesión en el proyecto podría crearlo.
   Por eso Kimi debe entrar justo después de publicar.
3. **Bóveda**: solo Kimi ve contraseñas (descifra con su contraseña). Pero `config/boveda` es legible por todos los dados de alta;
   con una contraseña débil (000000) se podría descifrar por fuerza bruta. **Kimi debe usar 10+ caracteres con letras y números.**
4. **Nadie cambia la contraseña de otro** (Firebase sin servidor): cada quien cambia la suya en "Mi cuenta"
   (se re-cifra en la bóveda y Kimi la ve). Si alguien la olvida, Kimi se la dice. Si una cuenta queda inservible:
   el dueño del proyecto (Ing. Omar) la borra en **Firebase Console → Authentication**, Kimi la elimina en Personas y la vuelve a dar de alta.
5. **Si Kimi olvida su contraseña**: Ing. Omar borra el usuario `kimberly@mision-enfoque.app` en Firebase Console → Authentication.
   Kimi entra con kimberly / 000000 (la app recrea la cuenta; `config/personal` sigue existiendo). La bóveda vieja no abre:
   en Personas → **Regenerar bóveda**; los demás vuelven a cambiar su contraseña para que Kimi la vea.
6. **Hallazgo para app-web (también afecta a mantenimiento)**: las reglas usan solo la parte local del correo y **no revisan el dominio**.
   Como la apiKey es pública y el registro con correo está abierto, alguien podría crear `kimberly@otro-dominio.com` (o `<nómina>@otro-dominio.com`)
   y pasar `enPersonal`. Cambio mínimo sugerido (lo aplica Omar cuando quiera; esta app no lo necesita para funcionar):
   en `correoLocal()` / `enPersonal()` agregar
   `request.auth.token.email.matches('^[^@]+@(mtto-lineaitalia|mision-enfoque)[.]app$')`.
7. Sin señal: las encuestas quedan en el teléfono (persistencia de Firestore + copia local) y se envían al volver internet;
   el panel muestra cuántas hay pendientes.

## 6. Pendientes / recomendaciones
- Revisar con jurídico de CECyTEA el aviso de privacidad (datos sensibles de salud de menores) y el consentimiento de padres.
- Llamar a los teléfonos de la ruta y anotar la fecha de verificación.
- Probar los textos con 5–10 alumnos antes del lanzamiento.
- Validez: ASRS v1.1 validado en adultos; en 14–17 años interpretar con cautela y complementar con padres/maestros (SNAP-IV o Vanderbilt).
