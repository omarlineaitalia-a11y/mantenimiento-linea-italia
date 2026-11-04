# Mantenimiento Línea Italia

Aplicaciones web del área de mantenimiento de Línea Italia (Creaciones Industriales, S.A. de C.V.).

| Carpeta | Aplicación |
|---|---|
| `almacen/` | Almacén de refacciones: existencias, estantes, fotos, retiros, límites por persona, gasto y valor. |
| `paros/` | Control de paros: alertas de falla, tiempos de llegada y reparación, tablero, gráficas y reportes en Excel. |
| `cfe/` | Lecturas CFE: lectura diaria de medidores e inversores, pronóstico y réplica del recibo, paneles solares y ahorro. |
| `equipos/` | Base de Datos de equipos: búsqueda por clave, placa, fotos, refacciones, salud y depreciación, mantenimientos realizados del plan y Excel de la base actualizado. |
| `compras/` | Compras de Mantenimiento: pedidos de material de los técnicos (folios MT), revisión, PDF de resguardo, folios de Control Presupuestal, costos (solo administración) y seguimiento hasta que llega. |

Estado: en migración. La base de datos se conectará a **Firebase (Firestore + Authentication)**. Mientras tanto, las versiones con datos en vivo siguen en claude.ai.

Publicación: GitHub Pages (rama `main`, carpeta raíz).
