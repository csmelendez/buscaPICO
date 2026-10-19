/* Buscador de evidencia PICO · datos: marcos de pregunta, PRISMA-S, PRESS y casos de práctica */
(function () {
  'use strict';

  /* incluir: valor por defecto de «buscar este concepto» y su justificación */
  var MARCOS = {
    pico: {
      nombre: 'PICO', sub: 'Intervención o tratamiento',
      desc: 'Comparar una tecnología o intervención con una alternativa. Admite D (diseño, PICO-D) y T (tiempo, PICOT).',
      comps: [
        { k: 'P', nombre: 'Población', ayuda: 'Enfermedad o problema, edad, gravedad y ámbito asistencial.', incluir: true },
        { k: 'I', nombre: 'Intervención', ayuda: 'La tecnología concreta: dispositivo, modelo, protocolo de uso.', incluir: true },
        { k: 'C', nombre: 'Comparador', ayuda: 'Práctica habitual, otra tecnología, placebo o no intervención.', incluir: false },
        { k: 'O', nombre: 'Desenlaces', ayuda: 'Resultados clínicos, de seguridad, de calidad de vida u organizativos.', incluir: false },
        { k: 'D', nombre: 'Diseño (PICO-D)', ayuda: 'Tipos de estudio elegibles. Se aplica mejor con un filtro validado (paso 4).', incluir: false, opcional: true },
        { k: 'T', nombre: 'Tiempo (PICOT)', ayuda: 'Horizonte de seguimiento. No se traduce a términos de búsqueda.', incluir: false, opcional: true, noBusca: true }
      ],
      plantilla: function (c) {
        return 'En ' + (c.P || '[población]') + ', ¿' + (c.I || '[intervención]') + ', frente a ' + (c.C || '[comparador]') +
          ', mejora ' + (c.O || '[desenlaces]') + '?' + (c.T ? ' (seguimiento: ' + c.T + ')' : '');
      }
    },
    dx: {
      nombre: 'PICO diagnóstico', sub: 'Exactitud de una prueba',
      desc: 'Prueba índice frente a un estándar de referencia en pacientes con sospecha de la condición diana.',
      comps: [
        { k: 'P', nombre: 'Población', ayuda: 'Pacientes en los que se plantea la prueba (con sospecha, no ya diagnosticados).', incluir: false },
        { k: 'I', nombre: 'Prueba índice', ayuda: 'La prueba o el dispositivo diagnóstico que se evalúa.', incluir: true },
        { k: 'C', nombre: 'Estándar de referencia', ayuda: 'Método que se toma como verdad (o prueba comparadora).', incluir: false },
        { k: 'TC', nombre: 'Condición diana', ayuda: 'Enfermedad o estado que la prueba pretende detectar.', incluir: true },
        { k: 'O', nombre: 'Medidas de exactitud', ayuda: 'Sensibilidad, especificidad, cocientes de verosimilitud, área bajo la curva ROC.', incluir: false }
      ],
      plantilla: function (c) {
        return 'En ' + (c.P || '[población]') + ', ¿cuál es la exactitud de ' + (c.I || '[prueba índice]') + ' para detectar ' +
          (c.TC || '[condición diana]') + ', frente a ' + (c.C || '[estándar de referencia]') + '?';
      }
    },
    peco: {
      nombre: 'PECO', sub: 'Exposición, etiología o pronóstico',
      desc: 'Asociación entre una exposición o factor y un desenlace, habitualmente con estudios observacionales.',
      comps: [
        { k: 'P', nombre: 'Población', ayuda: 'Personas en riesgo o con la condición de partida.', incluir: true },
        { k: 'E', nombre: 'Exposición', ayuda: 'Factor de riesgo, característica o exposición tecnológica.', incluir: true },
        { k: 'C', nombre: 'Comparador', ayuda: 'No expuestos o expuestos a otro nivel.', incluir: false },
        { k: 'O', nombre: 'Desenlace', ayuda: 'Evento o resultado de interés.', incluir: true }
      ],
      plantilla: function (c) {
        return 'En ' + (c.P || '[población]') + ', ¿' + (c.E || '[exposición]') + ', frente a ' + (c.C || '[comparador]') +
          ', se asocia con ' + (c.O || '[desenlace]') + '?';
      }
    },
    eco: {
      nombre: 'PICO económico', sub: 'Evaluación económica',
      desc: 'Costes y consecuencias de la tecnología frente a su alternativa (coste-efectividad, coste-utilidad, coste-beneficio).',
      comps: [
        { k: 'P', nombre: 'Población', ayuda: 'La misma que en la pregunta clínica.', incluir: true },
        { k: 'I', nombre: 'Intervención', ayuda: 'Tecnología evaluada.', incluir: true },
        { k: 'C', nombre: 'Comparador', ayuda: 'Alternativa relevante en el sistema sanitario de interés.', incluir: false },
        { k: 'O', nombre: 'Desenlaces económicos', ayuda: 'Costes, AVAC, RCEI, beneficio neto.', incluir: false },
        { k: 'D', nombre: 'Diseño', ayuda: 'Evaluaciones económicas completas. Aquí sí conviene buscarlo como concepto o con un filtro económico publicado.', incluir: true }
      ],
      plantilla: function (c) {
        return 'En ' + (c.P || '[población]') + ', ¿es ' + (c.I || '[intervención]') + ' eficiente frente a ' + (c.C || '[comparador]') +
          ' en términos de ' + (c.O || '[desenlaces económicos]') + '?';
      }
    },
    spider: {
      nombre: 'SPIDER', sub: 'Investigación cualitativa o mixta',
      desc: 'Experiencias y percepciones de pacientes o profesionales sobre una tecnología (Cooke et al., 2012).',
      comps: [
        { k: 'S', nombre: 'Muestra (Sample)', ayuda: 'Quiénes: pacientes, cuidadores, profesionales.', incluir: true },
        { k: 'PI', nombre: 'Fenómeno de interés', ayuda: 'La tecnología o experiencia que se estudia.', incluir: true },
        { k: 'D', nombre: 'Diseño', ayuda: 'Entrevistas, grupos focales, observación.', incluir: false },
        { k: 'E', nombre: 'Evaluación', ayuda: 'Experiencias, actitudes, aceptabilidad. Buscarlo resta mucha sensibilidad.', incluir: false },
        { k: 'R', nombre: 'Tipo de investigación', ayuda: 'Cualitativa, mixta. Suele buscarse junto con los términos de diseño.', incluir: true }
      ],
      plantilla: function (c) {
        return '¿Qué ' + (c.E || '[experiencias]') + ' describen ' + (c.S || '[muestra]') + ' respecto a ' + (c.PI || '[fenómeno de interés]') +
          ', en estudios de tipo ' + (c.R || '[tipo de investigación]') + (c.D ? ' (' + c.D + ')' : '') + '?';
      }
    }
  };

  var MOTIVOS = {
    incluir: 'Concepto central de la pregunta: suele buscarse.',
    C: 'El comparador rara vez se describe en título y resumen; buscarlo reduce la sensibilidad (Manual Cochrane, cap. 4).',
    O: 'Los desenlaces suelen estar mal descritos en el resumen; el Manual Cochrane recomienda no buscarlos salvo motivo.',
    dxP: 'En pruebas diagnósticas la población suele quedar recogida por la condición diana.',
    dxO: 'No busque términos de exactitud («sensitivity», «specificity»): el Manual Cochrane de exactitud diagnóstica desaconseja usarlos como filtro.',
    D: 'El diseño se aplica mejor con un filtro validado en el paso 4.',
    T: 'El tiempo no se traduce a términos de búsqueda.',
    E: 'Añadir la evaluación como concepto deja fuera muchos estudios relevantes.'
  };

  var PRISMA_S = [
    { sec: 'Fuentes de información y métodos', items: [
      { n: 1, t: 'Nombre de la base de datos', d: 'Nombre cada base de datos consultada, indicando la plataforma de cada una.' },
      { n: 2, t: 'Búsqueda multibase', d: 'Si se consultaron varias bases a la vez en una misma plataforma, indique la plataforma y enumere todas las bases consultadas.' },
      { n: 3, t: 'Registros de estudios', d: 'Enumere los registros de estudios consultados.' },
      { n: 4, t: 'Recursos en línea y exploración', d: 'Describa las fuentes en línea o impresas consultadas o exploradas intencionadamente (índices de revistas, actas de congresos, sitios web) y cómo se hizo.' },
      { n: 5, t: 'Búsqueda de citas', d: 'Indique si se examinaron referencias citadas o citantes y describa el método (listas de referencias, índice de citas, alertas de citas de los estudios incluidos).' },
      { n: 6, t: 'Contactos', d: 'Indique si se buscaron estudios o datos adicionales contactando con autores, expertos, fabricantes u otros.' },
      { n: 7, t: 'Otros métodos', d: 'Describa cualquier otra fuente de información o método de búsqueda.' }
    ] },
    { sec: 'Estrategias de búsqueda', items: [
      { n: 8, t: 'Estrategias completas', d: 'Incluya las estrategias de cada base y fuente, copiadas y pegadas exactamente como se ejecutaron.' },
      { n: 9, t: 'Límites y restricciones', d: 'Indique que no se usaron límites o describa los aplicados (fecha, idioma, diseño) y justifíquelos.' },
      { n: 10, t: 'Filtros de búsqueda', d: 'Indique si se usaron filtros publicados (tal cual o modificados) y cítelos.' },
      { n: 11, t: 'Trabajo previo', d: 'Indique si se adaptaron o reutilizaron estrategias de otras revisiones para una parte sustancial de la búsqueda, citándolas.' },
      { n: 12, t: 'Actualizaciones', d: 'Describa cómo se actualizaron las búsquedas (repetición, alertas por correo).' },
      { n: 13, t: 'Fechas de búsqueda', d: 'Para cada estrategia, indique la fecha de la última búsqueda.' }
    ] },
    { sec: 'Revisión por pares', items: [
      { n: 14, t: 'Revisión por pares', d: 'Describa cualquier proceso de revisión por pares de la estrategia.' }
    ] },
    { sec: 'Gestión de registros', items: [
      { n: 15, t: 'Total de registros', d: 'Documente el número total de registros identificados en cada base y en las demás fuentes.' },
      { n: 16, t: 'Deduplicación', d: 'Describa el proceso y el software usados para eliminar duplicados entre búsquedas y fuentes.' }
    ] }
  ];

  var PRESS = [
    { k: 'p1', t: 'Traducción de la pregunta', d: '¿Los conceptos buscados corresponden a la pregunta? ¿Falta alguno o sobra alguno que reste sensibilidad?' },
    { k: 'p2', t: 'Operadores booleanos y de proximidad', d: '¿OR dentro de cada concepto y AND entre conceptos? ¿NOT usado con cuidado? ¿Distancias razonables?' },
    { k: 'p3', t: 'Encabezamientos de materia', d: '¿Son los adecuados en cada tesauro? ¿Explotados cuando procede? ¿Falta alguno relevante?' },
    { k: 'p4', t: 'Texto libre', d: '¿Sinónimos, variantes ortográficas, acrónimos, nombres comerciales, truncamiento correcto?' },
    { k: 'p5', t: 'Ortografía, sintaxis y números de línea', d: '¿Sin erratas, con la sintaxis de cada plataforma y las referencias de línea bien combinadas?' },
    { k: 'p6', t: 'Límites y filtros', d: '¿Están justificados? ¿El filtro es validado y apropiado para el diseño buscado?' }
  ];

  var OTRAS = [
    { id: 'agencias', t: 'Agencias de ETS', d: 'RedETS, NICE, CDA-AMC (antes CADTH), HAS, IQWiG, informes de evaluación clínica conjunta del Reglamento (UE) 2021/2282.' },
    { id: 'regulatorio', t: 'Fuentes regulatorias', d: 'FDA (SSED, base MAUDE), EUDAMED, fichas de seguridad del fabricante.' },
    { id: 'congresos', t: 'Actas de congresos', d: 'Congresos de la especialidad de los últimos años.' },
    { id: 'tesis', t: 'Tesis y literatura gris académica', d: 'TESEO, ProQuest Dissertations, repositorios institucionales.' },
    { id: 'buscadores', t: 'Buscadores generales', d: 'Google Scholar (primeras páginas de resultados, documentando cuántas).' }
  ];

  /* ---------- Casos de práctica ---------- */
  function ct(t, exp) { return { t: t, exp: exp !== false, ok: false }; }

  var CASOS = [
    {
      id: 'ic', titulo: 'Telemonitorización en insuficiencia cardiaca', etiqueta: 'PICO · ECA',
      resumen: 'Ejemplo del Tema 3. Monitorización remota domiciliaria frente al seguimiento presencial.',
      estado: {
        marco: 'pico',
        comp: { P: 'adultos con insuficiencia cardiaca crónica en seguimiento ambulatorio', I: 'un sistema de monitorización remota domiciliaria', C: 'el seguimiento convencional en consulta', O: 'los reingresos hospitalarios y la calidad de vida', D: 'ensayos clínicos aleatorizados' },
        conceptos: [
          { k: 'P', etiqueta: 'Insuficiencia cardiaca', incluir: true, mesh: [ct('Heart Failure')], emtree: [ct('heart failure')], cinahl: [ct('Heart Failure')], decs: [ct('Insuficiencia Cardíaca')],
            libres: ['heart failure', 'cardiac failure', 'heart insufficiency', 'cardiac insufficiency', 'heart NEAR/2 decompensation'] },
          { k: 'I', etiqueta: 'Telemonitorización', incluir: true, mesh: [ct('Telemedicine'), ct('Remote Patient Monitoring')], emtree: [ct('telemedicine'), ct('telemonitoring')], cinahl: [], decs: [ct('Telemedicina')],
            libres: ['telemonitor*', 'tele-monitor*', 'telemedicine', 'telehealth', 'remote monitor*', 'remote patient monitor*', 'home monitor*', 'telemetry'] },
          { k: 'C', etiqueta: 'Seguimiento convencional', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] },
          { k: 'O', etiqueta: 'Reingresos y calidad de vida', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] },
          { k: 'D', etiqueta: 'Ensayos clínicos aleatorizados', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] }
        ],
        bases: ['pubmed', 'embase', 'central', 'cinahl'], registros: ['ctgov', 'ictrp'],
        filtros: { diseno: 'eca', animales: true, desde: '', hasta: '', idiomas: [], justificacion: '' }
      }
    },
    {
      id: 'tmvr', titulo: 'Válvula mitral transcatéter (SAPIEN M3)', etiqueta: 'PICO · producto sanitario',
      resumen: 'Hilo conductor de la asignatura. Incluye nombre comercial y fuentes regulatorias.',
      estado: {
        marco: 'pico',
        comp: { P: 'pacientes con insuficiencia mitral sintomática no candidatos a cirugía', I: 'el reemplazo valvular mitral transcatéter (p. ej., SAPIEN M3)', C: 'la reparación transcatéter borde a borde o el tratamiento médico óptimo', O: 'la mortalidad, las hospitalizaciones por insuficiencia cardiaca y la insuficiencia mitral residual', D: 'ensayos aleatorizados y estudios observacionales comparativos' },
        conceptos: [
          { k: 'P', etiqueta: 'Insuficiencia mitral', incluir: true, mesh: [ct('Mitral Valve Insufficiency')], emtree: [ct('mitral valve regurgitation')], cinahl: [], decs: [ct('Insuficiencia de la Válvula Mitral')],
            libres: ['mitral regurgitation', 'mitral insufficiency', 'mitral valve regurgitation', 'mitral valve insufficiency', 'mitral NEAR/3 regurgitation'] },
          { k: 'I', etiqueta: 'Reemplazo mitral transcatéter', incluir: true, mesh: [ct('Transcatheter Mitral Valve Replacement'), ct('Heart Valve Prosthesis Implantation', false)], emtree: [], cinahl: [], decs: [],
            libres: ['transcatheter mitral valve replacement', 'transcatheter mitral valve implantation', 'TMVR', 'TMVI', 'mitral NEAR/3 replacement', 'SAPIEN M3', 'transseptal mitral'] },
          { k: 'C', etiqueta: 'Reparación borde a borde o tratamiento médico', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] },
          { k: 'O', etiqueta: 'Mortalidad y hospitalización', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] },
          { k: 'D', etiqueta: 'ECA y observacionales comparativos', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] }
        ],
        bases: ['pubmed', 'embase', 'central', 'scopus'], registros: ['ctgov', 'ictrp', 'ctis'],
        otras: { agencias: true, regulatorio: true, congresos: true },
        filtros: { diseno: 'ninguno', animales: true, desde: '', hasta: '', idiomas: [], justificacion: '' }
      }
    },
    {
      id: 'proton', titulo: 'Protonterapia frente a fotones', etiqueta: 'PICO-D · informe real',
      resumen: 'Inspirado en el informe de 2024 sobre protonterapia (Ovid, Cochrane, WoS, Epistemonikos, INAHTA). Solo se busca la intervención.',
      estado: {
        marco: 'pico',
        comp: { P: 'pacientes con cáncer candidatos a radioterapia', I: 'la protonterapia, sola o combinada', C: 'la radioterapia con fotones, incluida la IMRT', O: 'la toxicidad, la supervivencia y el control locorregional', D: 'ensayos aleatorizados y estudios observacionales comparativos' },
        conceptos: [
          { k: 'P', etiqueta: 'Cáncer', incluir: false, mesh: [ct('Neoplasms')], emtree: [ct('neoplasm')], cinahl: [], decs: [], libres: ['cancer*', 'neoplasm*', 'tumor*', 'tumour*', 'malignan*'] },
          { k: 'I', etiqueta: 'Protonterapia', incluir: true, mesh: [ct('Proton Therapy')], emtree: [ct('proton therapy')], cinahl: [], decs: [ct('Terapia de Protones')],
            libres: ['proton therap*', 'proton beam*', 'proton radiotherap*', 'proton radiation', 'proton irradiation', 'intensity modulated proton therap*', 'IMPT', 'PBT'] },
          { k: 'C', etiqueta: 'Radioterapia con fotones', incluir: false, mesh: [ct('Radiotherapy, Intensity-Modulated')], emtree: [], cinahl: [], decs: [], libres: ['photon*', 'IMRT', 'intensity modulated radiotherap*'] },
          { k: 'O', etiqueta: 'Toxicidad y supervivencia', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] },
          { k: 'D', etiqueta: 'ECA y observacionales', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] }
        ],
        bases: ['ovidmedline', 'ovidembase', 'central', 'wos', 'epistemonikos', 'inahta'], registros: ['ctgov'], multibase: true,
        otras: { agencias: true },
        filtros: { diseno: 'ninguno', animales: true, desde: '', hasta: '', idiomas: ['en', 'es'], justificacion: 'Ejemplo docente (no procede del informe): límite a inglés y español por los recursos de traducción del equipo. El Manual Cochrane desaconseja restringir por idioma; discuta si está justificado.' }
      }
    },
    {
      id: 'antigeno', titulo: 'Prueba rápida de antígeno para SARS-CoV-2', etiqueta: 'PICO diagnóstico',
      resumen: 'Producto de diagnóstico in vitro frente a RT-PCR. Sin filtros de diseño.',
      estado: {
        marco: 'dx',
        comp: { P: 'personas con sospecha de COVID-19 atendidas en atención primaria o urgencias', I: 'una prueba rápida de detección de antígeno', C: 'la RT-PCR', TC: 'la infección por SARS-CoV-2', O: 'sensibilidad, especificidad y cocientes de verosimilitud' },
        conceptos: [
          { k: 'P', etiqueta: 'Sospecha de COVID-19', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] },
          { k: 'I', etiqueta: 'Prueba rápida de antígeno', incluir: true, mesh: [ct('COVID-19 Testing'), ct('Point-of-Care Testing'), ct('Antigens, Viral')], emtree: [], cinahl: [], decs: [],
            libres: ['antigen*', 'rapid antigen test*', 'Ag-RDT*', 'lateral flow', 'point-of-care test*', 'rapid diagnostic test*'] },
          { k: 'C', etiqueta: 'RT-PCR', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] },
          { k: 'TC', etiqueta: 'Infección por SARS-CoV-2', incluir: true, mesh: [ct('COVID-19'), ct('SARS-CoV-2')], emtree: [], cinahl: [], decs: [ct('COVID-19')],
            libres: ['covid*', 'SARS-CoV-2', 'SARS-CoV2', '2019-nCoV', 'coronavirus disease 2019', 'severe acute respiratory syndrome coronavirus 2'] },
          { k: 'O', etiqueta: 'Exactitud diagnóstica', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] }
        ],
        bases: ['pubmed', 'embase', 'scopus', 'bvs'], registros: ['ctgov'],
        filtros: { diseno: 'ninguno', animales: false, desde: '2020', hasta: '', idiomas: [], justificacion: 'El SARS-CoV-2 se identificó a finales de 2019: no puede haber estudios anteriores.' }
      }
    },
    {
      id: 'telerrehab', titulo: 'Experiencia con la telerrehabilitación tras un ictus', etiqueta: 'SPIDER · cualitativa',
      resumen: 'Pregunta cualitativa: muestra, fenómeno y tipo de investigación.',
      estado: {
        marco: 'spider',
        comp: { S: 'personas que han sufrido un ictus y sus cuidadores', PI: 'la telerrehabilitación domiciliaria', D: 'entrevistas y grupos focales', E: 'experiencias, barreras y aceptabilidad', R: 'cualitativa o mixta' },
        conceptos: [
          { k: 'S', etiqueta: 'Ictus', incluir: true, mesh: [ct('Stroke'), ct('Stroke Rehabilitation')], emtree: [], cinahl: [ct('Stroke')], decs: [ct('Accidente Cerebrovascular')],
            libres: ['stroke*', 'post-stroke', 'poststroke', 'cerebrovascular accident*', 'CVA'] },
          { k: 'PI', etiqueta: 'Telerrehabilitación', incluir: true, mesh: [ct('Telerehabilitation')], emtree: [], cinahl: [], decs: [ct('Telerrehabilitación')],
            libres: ['telerehabilitation', 'tele-rehabilitation', 'telerehab*', 'remote rehabilitation', 'home NEAR/3 telerehabilitation', 'virtual rehabilitation'] },
          { k: 'D', etiqueta: 'Entrevistas y grupos focales', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] },
          { k: 'E', etiqueta: 'Experiencias y aceptabilidad', incluir: false, mesh: [], emtree: [], cinahl: [], decs: [], libres: [] },
          { k: 'R', etiqueta: 'Investigación cualitativa', incluir: true, mesh: [ct('Qualitative Research')], emtree: [], cinahl: [ct('Qualitative Studies')], decs: [ct('Investigación Cualitativa')],
            libres: ['qualitative', 'interview*', 'focus group*', 'thematic analys*', 'mixed method*', 'phenomenolog*', 'grounded theory'] }
        ],
        bases: ['pubmed', 'cinahl', 'scopus', 'bvs'], registros: [],
        filtros: { diseno: 'ninguno', animales: false, desde: '', hasta: '', idiomas: [], justificacion: '' }
      }
    }
  ];

  window.Datos = { MARCOS: MARCOS, MOTIVOS: MOTIVOS, PRISMA_S: PRISMA_S, PRESS: PRESS, OTRAS: OTRAS, CASOS: CASOS };
})();
