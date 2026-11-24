/* Misión Enfoque · INSTRUMENTO Y CALIFICACIÓN (datos separados para poder ajustarlos)
 * --------------------------------------------------------------------------------
 * Instrumento: ASRS v1.1 Parte A (6 preguntas) — Escala de Autorreporte de TDAH en Adultos de la OMS.
 *   Versión oficial en español "para EE. UU. y México" (PDF "6Q_Spanish (for US and Mexico)_final").
 *   El texto de las preguntas, las opciones y la calificación NO se modifican (condición de uso de Harvard/NYU).
 *   Las "ayudas" con ejemplos escolares son una adaptación PROPIA, opcional y separada del texto oficial.
 * Calificación oficial 2024 ("ASRS v1.1 Scoring update", 28-feb-2024):
 *   cada respuesta 0–4, total 0–24, positivo (requiere valoración) con total >= 14;
 *   bandas 0–9 negativo bajo · 10–13 negativo alto · 14–17 positivo bajo · 18–24 positivo alto.
 *   Subescalas solo descriptivas (sin punto de corte): inatención P1–P4 (0–16), hiperactividad P5–P6 (0–8).
 *   Método de casillas sombreadas (>= 4 de 6): solo dato secundario para comparar con estudios anteriores.
 * Fuente de todo lo anterior: ../investigacion_universidades_tamizaje.md, sección 6 "Qué usar en la app".
 * Si cambias el instrumento o su calificación, cambia también "id" (queda guardado en cada encuesta).
 */
(function () {
  'use strict';
  var I = {
    id: 'asrs11-A-2024',
    nombre: 'ASRS v1.1 Parte A (6 preguntas) · Escala de Autorreporte de TDAH en Adultos de la OMS',
    nombreCorto: 'ASRS v1.1 (Parte A)',
    version: 'Versión oficial en español para EE. UU. y México · calificación oficial 2024 (0–24, corte 14)',
    cita: 'Kessler RC, Adler L, Ames M, et al. (2005). The World Health Organization Adult ADHD Self-Report Scale (ASRS): a short screening scale for use in the general population. Psychological Medicine, 35(2), 245–256.',
    copyright: 'Copyright © New York University and Ronald C. Kessler, PhD. All rights reserved.',
    citaCalificacion: 'ASRS v1.1 Scoring update (Harvard Medical School / NYU, 28 de febrero de 2024); Kessler RC et al., Int J Methods Psychiatr Res 2007;16(2):52–65.',
    introPropia: 'No hay respuestas buenas ni malas. Piensa en cómo has estado en la escuela, en tu casa y con tus amigos durante los últimos 6 meses.',
    instruccion: 'Marque la casilla que mejor describe cómo se sintió y comportó en los últimos 6 meses.',
    opciones: [
      { v: 0, t: 'Nunca', e: '😌' },
      { v: 1, t: 'Raramente', e: '🙂' },
      { v: 2, t: 'A veces', e: '😐' },
      { v: 3, t: 'Frecuentemente', e: '😅' },
      { v: 4, t: 'Muy frecuentemente', e: '🤯' }
    ],
    // texto: oficial, exacto. ayuda: ejemplo escolar opcional (adaptación propia). sombra: umbral del método secundario.
    preguntas: [
      { id: 'p1', emoji: '📝', dominio: 'inatencion', sombra: 2,
        texto: '¿Con qué frecuencia tiene dificultad para acabar con los detalles finales de un proyecto después de haber hecho las partes difíciles?',
        ayuda: 'Ej.: ya hiciste lo difícil de una tarea, pero no le pones portada, no revisas o no la entregas.' },
      { id: 'p2', emoji: '🗂️', dominio: 'inatencion', sombra: 2,
        texto: '¿Con qué frecuencia tiene dificultad para ordenar las cosas cuando está realizando una tarea que requiere organización?',
        ayuda: 'Ej.: organizar materiales, pasos o tiempos para un proyecto o práctica de taller.' },
      { id: 'p3', emoji: '📅', dominio: 'inatencion', sombra: 2,
        texto: '¿Con qué frecuencia tiene dificultad para recordar sus citas u obligaciones?',
        ayuda: 'Ej.: fechas de entrega, exámenes, traer material o credencial.' },
      { id: 'p4', emoji: '🤔', dominio: 'inatencion', sombra: 3,
        texto: 'Cuando tiene una actividad que requiere que usted piense mucho ¿con qué frecuencia la evita o la deja para después?',
        ayuda: 'Ej.: estudiar para un examen difícil o empezar un trabajo largo.' },
      { id: 'p5', emoji: '🦶', dominio: 'hiperactividad', sombra: 3,
        texto: '¿Con qué frecuencia mueve o agita sus manos o sus pies cuando tiene que permanecer sentado(a) por mucho tiempo?',
        ayuda: 'Ej.: en clase larga, mueves pies, manos o juegas con la pluma o el celular.' },
      { id: 'p6', emoji: '⚡', dominio: 'hiperactividad', sombra: 3,
        texto: '¿Con qué frecuencia se siente usted demasiado activo(a) y como que tiene que hacer cosas, como si tuviera un motor?',
        ayuda: 'Ej.: sientes que no puedes estar quieto/a por dentro, "acelerado/a".' }
    ],
    max: 24,
    corte: 14,
    etiquetaPositivo: 'Requiere valoración',
    etiquetaNegativo: 'Sin indicios',
    bandas: [
      { min: 0, max: 9, id: 'nb', nombre: 'Negativo bajo', color: '#9DBEF5',
        texto: 'Las respuestas no muestran señales importantes de dificultad para concentrarse u organizarse.' },
      { min: 10, max: 13, id: 'na', nombre: 'Negativo alto', color: '#2F6FDB',
        texto: 'Algunas veces le cuesta concentrarse u organizarse, como a mucha gente. Ofrecer tips y entrevista voluntaria con Orientación si la pide.' },
      { min: 14, max: 17, id: 'pb', nombre: 'Positivo bajo', color: '#F08A8D',
        texto: 'Concentrarse, organizarse o estar quieto/a le cuesta más de lo habitual. No es un diagnóstico: conviene una entrevista con Orientación.' },
      { min: 18, max: 24, id: 'pa', nombre: 'Positivo alto', color: '#D93A3F',
        texto: 'Concentrarse, organizarse o estar quieto/a le cuesta más de lo habitual. No es un diagnóstico: conviene una entrevista con Orientación pronto y, si procede, valoración profesional.' }
    ],
    subescalas: {
      inatencion: { nombre: 'Inatención/organización (P1–P4)', corto: 'Inatención', max: 16 },
      hiperactividad: { nombre: 'Hiperactividad/inquietud (P5–P6)', corto: 'Hiperactividad', max: 8 }
    },
    advertencias: [
      'Es un TAMIZAJE, no un diagnóstico. Un resultado "requiere valoración" (14 o más) solo indica que conviene una entrevista con Orientación y, si procede, una valoración por un profesional de la salud.',
      'El ASRS v1.1 está validado en adultos (18 años o más); el propio formato lo indica. En adolescentes hay evidencia de buena consistencia (Green et al. 2019, alumnos de 6.º a 12.º grado), pero sin punto de corte validado. En alumnos de 14 a 17 años el resultado se interpreta con cautela y se complementa con padres y maestros (SNAP-IV o Vanderbilt).',
      'Por el riesgo de falsos positivos, el resultado positivo debe disparar una entrevista con Orientación, no una canalización automática. Un resultado negativo no descarta TDAH.',
      'Las subescalas (inatención e hiperactividad) son solo descriptivas: no tienen punto de corte validado.',
      'Las misiones (reflejos, memoria, cazador de estrellas y semáforo) son una actividad didáctica: NO cuentan en el puntaje ni en la decisión de canalizar.',
      'Los ejemplos escolares que acompañan a las preguntas son una adaptación propia y opcional; pueden influir en las respuestas.',
      'Resultados confidenciales: no se comparten con compañeros, no se usan para calificaciones ni sanciones y no se muestran desgloses de grupos con menos de 10 alumnos.'
    ],
    antecedentes: [
      'Iniciativa OMS WMH-ICS (Mak et al., J Atten Disord 2022): 15,991 universitarios de primer ingreso en 9 países; TDAH (últimos 6 meses) 15.9 % con el CIDI-SC.',
      'UNAM FES Iztacala (Yáñez-Téllez et al., Arch Neurocien 2021): 1,837 universitarios; ASRS-6 sola con el método antiguo (>= 4 casillas) 35.5 % positivos; combinando ASRS + WURS 16.2 %. Muestra que el tamizaje con un solo instrumento sobreestima los casos.',
      'La prevalencia de TDAH esperada en adolescentes es de 5 a 8 %; el tamizaje siempre da más positivos que los diagnósticos reales. Por eso se reporta como "alumnos con resultado que sugiere valoración", nunca como "alumnos con TDAH".'
    ]
  };

  // ---------- calificación (oficial 2024)
  I.calificar = function (resp) {
    var total = 0, inat = 0, hiper = 0, sombreadas = 0;
    I.preguntas.forEach(function (p, k) {
      var v = Number(resp[k]) || 0;
      total += v;
      if (p.dominio === 'inatencion') inat += v; else hiper += v;
      if (v >= p.sombra) sombreadas++;
    });
    return { total: total, inat: inat, hiper: hiper, positivo: total >= I.corte, banda: I.banda(total).id, sombreadas: sombreadas };
  };
  I.banda = function (total) {
    for (var i = 0; i < I.bandas.length; i++) if (total >= I.bandas[i].min && total <= I.bandas[i].max) return I.bandas[i];
    return I.bandas[0];
  };

  // ---------- misiones (actividad didáctica; NO cuentan en el puntaje)
  var JUEGOS = [
    { k: 'gng', t: 'Reflejos', d: 'Toca el azul, evita el rojo', e: '⚡', hab: 'Atención e impulsividad', ensayos: 30,
      intro: '<div class="leyenda"><div><span style="background:#2F6FDB"></span>¡Toca!</div><div><span style="background:#D93A3F"></span>No toques</div></div>Toca la pantalla <b>lo más rápido que puedas</b> cuando veas el círculo <b style="color:#2F6FDB">azul</b>. Si sale el <b style="color:#D93A3F">rojo</b>, <b>no toques</b>.' },
    { k: 'mem', t: 'Memoria', d: 'Repite la secuencia de luces', e: '🧠', hab: 'Memoria de trabajo',
      intro: 'Se iluminarán algunas casillas <b>una por una</b>. Cuando terminen, tócalas <b>en el mismo orden</b>. Cada vez la secuencia será más larga.' },
    { k: 'hunt', t: 'Cazador de estrellas', d: 'Encuentra todas las ★ en 30 s', e: '⭐', hab: 'Atención selectiva', segundos: 30,
      intro: 'Toca <b>solo las estrellas rellenas ★</b>. Cuidado con las parecidas: ☆ ✦ ✧ no cuentan. Tienes <b>30 segundos</b>.' },
    { k: 'sem', t: 'Semáforo', d: 'Espera el verde para tocar', e: '🚦', hab: 'Autocontrol (espera)', rondas: 8,
      intro: '<div class="leyenda"><div><span style="background:#D93A3F"></span>Espera</div><div><span style="background:#1E9E6A"></span>¡Ahora!</div></div>El semáforo está en <b>rojo</b>. Toca <b>en cuanto se ponga verde</b>, ni antes ni tarde.' }
  ];

  // ---------- ruta de referencia (solo teléfonos verificados en investigacion_universidades_tamizaje.md)
  var RUTA = {
    pasos: [
      'Resultado del tamizaje (privado; nunca listas de grupo ni junta general).',
      'Entrevista con Orientación/Psicología del plantel en 2 semanas o menos (también a quien quede en 10–13 y la pida).',
      'Reunión con madre, padre o tutor: información clara, sin "diagnósticos".',
      'Primer nivel de salud: médico familiar IMSS/ISSSTE o centro de salud ISSEA/IMSS-Bienestar.',
      'Especialidad si el profesional lo indica: psiquiatría o paidopsiquiatría (ISSEA, IMSS).',
      'Seguimiento escolar y ajustes razonables en el aula.'
    ],
    telefonos: [
      { n: 'Línea de la Vida (CONASAMA) · gratis, 24 h, 365 días', t: '800 911 2000' },
      { n: 'Emergencias', t: '911' },
      { n: 'CIJ Aguascalientes (consumo de sustancias en jóvenes) · Prof. Edmundo Díaz Gámez 1007, Fracc. Circunvalación Norte', t: '449 877 19 98' }
    ]
  };

  window.INSTRUMENTO = I;
  window.JUEGOS_CFG = JUEGOS;
  window.RUTA_ATENCION = RUTA;
  window.N_MINIMO = 10; // no mostrar desgloses de subgrupos con menos de 10 alumnos
  window.CATALOGOS = {
    edades: [14, 15, 16, 17, 18, 19, 20],
    sexos: ['Mujer', 'Hombre', 'Prefiero no decir'],
    semestres: [1, 2, 3, 4, 5, 6],
    grupos: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
    turnos: ['Matutino', 'Vespertino']
  };
})();
