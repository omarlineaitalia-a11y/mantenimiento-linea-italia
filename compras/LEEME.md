# Compras de Mantenimiento

Aplicativo para que el equipo de mantenimiento **pida material** y Administración (Compras de Mtto) le dé **seguimiento hasta que llega**: folios internos `MT-26-0001`, revisión, PDF de resguardo (`RQ-26-001`), captura en Control Presupuestal, etapas del portal, costos y exportación CSV.

Estados: Por revisar (Pedida) → Por subir (Revisada) → Borrador CP / Devuelta (En Compras) → Autorización especial / En espera (Autorización) → Contabilidad / Cuentas por pagar / Pagado (Pago) → Recibida. Además: Rechazada y Cancelada.

## Origen
Migración del artifact de claude.ai hecho por **Marisela Martínez Maldonado** (2026-11-04). Se conservaron diseño, pantallas y flujo; solo cambió la base de datos (Firebase `apps/compras/`) y el acceso.

## Acceso (igual que Caja Chica y Lecturas CFE)
1. **Una sola vez por equipo** (tablet del taller, PC de Administración): se entra con **nómina + contraseña** de Firebase. La sesión queda guardada en ese equipo.
2. Después, cada persona entra **solo con su número de nómina**. "Salir" regresa a la pantalla de nómina (no cierra la sesión del equipo). En el portal de técnicos la sesión se cierra sola a los **10 minutos** sin uso.
3. "Cerrar la sesión de este equipo": en Personal (Administración) o en la pantalla de nómina ("Cambiar cuenta del equipo").

| Rol en `config/personal` | Qué ve |
|---|---|
| `general` (Omar 4781) | Administración completa; no se le puede quitar el acceso desde la app |
| `admin` (Marisela 2000) | Bandeja de revisión, PDF de resguardo, costos, CSV, Personal |
| `usuario` | Portal: Pedir material y Mis solicitudes. Con puesto *Jefe* o *Supervisor de Mtto*: además "Mi equipo" |

**Administración solo entra en un equipo abierto con una cuenta admin/general** (equivale al "Editor" de claude.ai). La tablet del taller debe abrirse con una cuenta de rol `usuario` (p. ej. la del supervisor): así las reglas de Firestore no dejan leer costos desde esa tablet.

## Dar de alta personal
Administración → **Personal** → nómina, nombre, puesto y acceso. La contraseña es opcional: solo para quien vaya a abrir la sesión de un equipo. Restablecer contraseñas se hace desde Control de Paros o Almacén (las reglas solo dejan a sus administradores).

## Datos (Firestore `apps/compras/`)
- `compras/<id>`: cada solicitud (un artículo por solicitud).
- `costos/<id>`: precio estimado, impuesto, monto autorizado, fecha de recepción. **Solo admin/general** (regla especial en `firestore.rules`).
- `config/personal`: `p[nómina] = {n, r, a, puesto}`.

Demostración sin Firebase: `?demo` (equipo admin) o `?demo=4237` (equipo de técnico), o abrir el archivo desde la PC.
