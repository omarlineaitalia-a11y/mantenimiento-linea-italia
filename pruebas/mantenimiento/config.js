/* Configuración inicial de "Mantenimiento Preventivo LI".
 * Solo se usa la primera vez (después todo se cambia en Configuración dentro de la app).
 * r: general | admin | usuario (permisos de la base) · pant: pantallas que ve (1 Tablero, 2 Mi mes, 3 Hojas, 4 Parámetros)
 * otorga: puede dar o quitar accesos y cambiar la configuración · tec: nombre con el que aparece en la columna EM del Excel. */
window.LI_PERSONAL_INICIAL = {
  '4781': { n: 'AMÍLCAR OMAR ANDRACA HERRERA', r: 'general', a: true, puesto: 'Jefe de Mantenimiento', pant: [1, 2, 3, 4], otorga: true, firmaTxt: 'Omar Andraca' },
  '3626': { n: 'EDGAR ADRIÁN MARTÍNEZ MARTÍNEZ', r: 'admin', a: true, puesto: 'Gerente', pant: [1, 2, 3, 4], otorga: true, firmaTxt: 'Adrián Martínez' },
  '1162': { n: 'CARLOS ALBERTO MARTÍNEZ JASSO', r: 'usuario', a: true, puesto: 'Supervisor de Mantenimiento', pant: [1, 2, 3, 4], califica: true, firmaTxt: 'Carlos Martínez' },
  '4237': { n: 'JOSÉ ANTONIO TORRES LÓPEZ', r: 'usuario', a: true, puesto: 'Técnico', pant: [2, 3], tec: 'ANTONIO' },
  '4573': { n: 'JAIME PACHECO LOBATOS', r: 'usuario', a: true, puesto: 'Técnico', pant: [2, 3], tec: 'JAIME' },
  '4643': { n: 'OSCAR DAVID CORTEZ LARA', r: 'usuario', a: true, puesto: 'Técnico', pant: [2, 3], tec: 'OSCAR' },
  '4647': { n: 'GIOVANNI LOERA MARTÍNEZ', r: 'usuario', a: true, puesto: 'Técnico', pant: [2, 3], tec: 'GIOVANNI' },
  '4695': { n: 'ALEJANDRO CHÁVEZ GALICIA', r: 'usuario', a: true, puesto: 'Técnico', pant: [2, 3], tec: 'ALEJANDRO' },
  '4698': { n: 'JORGE LUIS ARRIAGA ENCARNACIÓN', r: 'usuario', a: true, puesto: 'Técnico', pant: [2, 3], tec: 'JORGE' },
  '4767': { n: 'JACOBO DANIEL ESPARZA DE LUNA', r: 'usuario', a: true, puesto: 'Técnico', pant: [2, 3], tec: 'JACOBO' },
  '4768': { n: 'PABLO EMMANUEL CASTAÑEDA ESPARZA', r: 'usuario', a: true, puesto: 'Técnico', pant: [2, 3], tec: 'PABLO' }
};

/* Qué hoja de instrucciones usa cada equipo del plan. Se revisa en orden: gana la primera regla que coincide
 * con el nombre del equipo (o con su categoría). Se puede cambiar en Configuración → Hojas por equipo. */
window.PM_REGLAS = [
  ['extractor|colector', '', 'EA-COLECTORES DE POLVO'],
  ['compresor', '', 'EA-COMPRESORES DE TORNILLO'],
  ['secador', '', 'EA-SECADORES DE AIRE'],
  ['gas|vaporizador', '', 'EA-GAS LP'],
  ['fotovolt|solar|inversor', '', 'EA-SISTEMA FOTOVOLTAICO'],
  ['selexx', '', 'MTA-ROUTER CNC SELEXX'],
  ['enchapadora|homag|canteadora', '', 'MTA-ENCHAPADORAS'],
  ['cnc', '', 'MTA-ROUTER CNC BLUE ELEPHANT'],
  ['gabbiani|seccionadora', '', 'MTA-SECCIONADORA GABBIANI'],
  ['laser cama|cama', 'MTA', 'MTA-LASER DE CAMA'],
  ['laser|gweike|weike', '', 'MTA-LASER DE TUBO GWEIKE'],
  ['flejadora', '', 'MTA-FLEJADORAS'],
  ['cajas', '', 'MTA-MAQUINA DE CAJAS'],
  ['horno', '', 'MTA-HORNOS'],
  ['tunel', '', 'MTA-TUNEL DE LAVADO'],
  ['cabina|nordson', '', 'MTA-CABINA DE PINTURA NORDSON'],
  ['drive|transportador|conveyor', '', 'MTA-TRANSPORTADOR DE PINTURA'],
  ['dobladora|plegadora', '', 'MTB-DOBLADORAS'],
  ['soldar|soldadora|punteadora', '', 'MTB-MAQUINAS DE SOLDAR'],
  ['prensa mecanica|troqueladora|excentrica', '', 'MTB-PRENSAS MECANICAS'],
  ['prensa', '', 'MTB-PRENSAS HIDRAULICAS'],
  ['taladro', 'MTB', 'MTB-TALADROS DE BANCO'],
  ['montacargas', '', 'EM-MONTACARGAS'],
  ['patin', '', 'EM-PATINES'],
  ['subestacion', '', 'EMT-SUBESTACION'],
  ['transformador', '', 'EBT-TRANSFORMADORES SECOS'],
  ['tablero', '', 'EBT-TABLEROS ELECTRICOS'],
  ['paquete', 'AA', 'AA-UNIDAD PAQUETE'],
  ['bomba', 'AG', 'AG-CUARTO DE BOMBAS'],
  ['bano|sanitario', '', 'AG-SANITARIOS'],
  ['', 'AA', 'AA-MINI SPLIT'],
  ['', 'AG', 'AG-AREAS GENERALES'],
  ['', 'IL', 'IL-ILUMINACION'],
  ['', 'MTC', 'MTC-HERRAMIENTA ELECTRICA'],
  ['', 'EMT', 'EMT-SUBESTACION'],
  ['', 'EBT', 'EBT-TABLEROS ELECTRICOS'],
  ['', 'EM', 'EM-MONTACARGAS'],
  ['', 'EA', 'EA-COMPRESORES DE TORNILLO']
];

/* Vida típica de baleros por tipo de equipo (horas, referencia de fabricantes SKF/NSK L10). Ajustar con el dato del proveedor. */
window.PM_VIDA_BALEROS = [
  ['Motor eléctrico (uso general)', 40000],
  ['Ventilador / extractor de polvo', 30000],
  ['Husillo de router CNC', 15000],
  ['Carritos / rodamientos lineales', 20000],
  ['Bomba de vacío', 25000],
  ['Compresor de tornillo (rodamientos del elemento)', 40000],
  ['Rodillos y transportadores', 30000],
  ['Reductor / caja de engranes', 30000]
];

/* Refacciones de MONTACARGAS según horas del horómetro (servicio cada 250 h). Cantidad y costo unitario de referencia: ajustar con el proveedor.
 * Cada servicio que cae en un múltiplo de "cada" lleva esas piezas (p. ej. a las 1000 h van los kits de 250, 500 y 1000). */
window.PM_MONTACARGAS = [
  { cada: 250, piezas: [['Aceite de motor 15W-40 (litros)', 5, 0], ['Filtro de aceite de motor', 1, 0]] },
  { cada: 500, piezas: [['Filtro de aire', 1, 0], ['Filtro de combustible / gas', 1, 0]] },
  { cada: 1000, piezas: [['Aceite hidráulico (litros)', 20, 0], ['Filtro hidráulico', 1, 0], ['Aceite de transmisión (litros)', 6, 0]] },
  { cada: 2000, piezas: [['Refrigerante (litros)', 8, 0], ['Juego de bujías', 1, 0], ['Banda del motor', 1, 0]] }
];