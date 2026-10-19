/* Buscador de evidencia PICO · interfaz */
(function () {
  'use strict';
  var M = window.Motor, D = window.Datos;
  var CLAVE = 'buscador-evidencia-v1';
  var VOCAB_KEYS = ['mesh', 'emtree', 'cinahl', 'decs'];
  var PASOS = [
    { n: 1, t: 'Pregunta' }, { n: 2, t: 'Fuentes' }, { n: 3, t: 'Conceptos y términos' },
    { n: 4, t: 'Filtros y límites' }, { n: 5, t: 'Estrategias' }, { n: 6, t: 'PRISMA-S e informe' }
  ];
  var SOFTWARE = ['EndNote', 'Zotero', 'Mendeley', 'Rayyan', 'Covidence', 'Deduklick', 'Manual', 'Otro'];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaES(iso) { if (!iso) return ''; var p = iso.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }

  /* ---------- Estado ---------- */
  var st = null, ui = { tab: null, confirmar: null };

  function vacio() {
    return { marco: 'pico', comp: {}, conceptos: [], campo: 'tiab', bases: ['pubmed', 'embase', 'central'], registros: ['ctgov', 'ictrp'],
      filtros: { diseno: 'ninguno', animales: true, desde: '', hasta: '', idiomas: [], justificacion: '' } };
  }

  function normaliza(s) {
    s = s || vacio();
    if (!D.MARCOS[s.marco]) s.marco = 'pico';
    s.comp = s.comp || {};
    s.campo = s.campo === 'ti' ? 'ti' : 'tiab';
    s.bases = (s.bases || []).filter(function (id) { return M.baseDe(id); });
    s.registros = s.registros || [];
    s.otras = s.otras || {};
    s.citas = s.citas || {};
    s.contactos = s.contactos || {};
    s.filtros = Object.assign({ diseno: 'ninguno', animales: false, desde: '', hasta: '', idiomas: [], justificacion: '', otrosLimites: '' }, s.filtros || {});
    s.resultados = s.resultados || {};
    s.prisma = Object.assign({ estados: {}, notas: {}, press: {} }, s.prisma || {});
    s.prisma.estados = s.prisma.estados || {}; s.prisma.notas = s.prisma.notas || {}; s.prisma.press = s.prisma.press || {};
    var marco = D.MARCOS[s.marco], viejos = s.conceptos || [], nuevos = [];
    marco.comps.forEach(function (c) {
      if (c.noBusca) return;
      var ex = null;
      for (var i = 0; i < viejos.length; i++) if (viejos[i].k === c.k) ex = viejos[i];
      ex = ex || { k: c.k, etiqueta: '', incluir: c.incluir };
      VOCAB_KEYS.forEach(function (v) { ex[v] = (ex[v] || []).map(function (t) { return typeof t === 'string' ? { t: t, exp: true, ok: false } : t; }); });
      ex.libres = ex.libres || [];
      nuevos.push(ex);
    });
    s.conceptos = nuevos;
    s.paso = s.paso >= 1 && s.paso <= 6 ? s.paso : 1;
    return s;
  }

  function guarda() { try { localStorage.setItem(CLAVE, JSON.stringify(st)); } catch (e) { /* sin almacenamiento */ } }
  function carga() {
    try { var raw = localStorage.getItem(CLAVE); if (raw) return normaliza(JSON.parse(raw)); } catch (e) { /* nada */ }
    return null;
  }
  function cargaCaso(id) {
    var c = D.CASOS.filter(function (x) { return x.id === id; })[0];
    var s = normaliza(clone(c.estado));
    s.caso = id; s.paso = 1; s.dirty = false;
    return s;
  }

  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) {
    var ks = p.split('.'), last = ks.pop();
    var t = ks.reduce(function (a, k) { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; return a[k]; }, o);
    t[last] = v;
  }

  /* ---------- Derivados ---------- */
  function marcoAct() { return D.MARCOS[st.marco]; }
  function compDef(k) { return marcoAct().comps.filter(function (c) { return c.k === k; })[0]; }
  function pregunta() { return (st.preguntaManual && st.preguntaManual.trim()) || marcoAct().plantilla(st.comp); }
  function etiq(c) { return c.etiqueta || (st.comp[c.k] ? st.comp[c.k].slice(0, 48) : (compDef(c.k) || {}).nombre || c.k); }
  function vocabsNecesarios() {
    var set = {};
    st.bases.forEach(function (id) { var b = M.baseDe(id); if (b && b.vocab) set[b.vocab] = (set[b.vocab] || []).concat(b.base + ' (' + b.plat + ')'); });
    return set;
  }
  function fuentesRecuento() {
    var filas = st.bases.map(function (id) { return { id: id, nombre: M.etiquetaBase(id) }; });
    st.registros.forEach(function (id) { var r = M.REGISTROS.filter(function (x) { return x.id === id; })[0]; if (r) filas.push({ id: id, nombre: r.nombre }); });
    var hayOtras = D.OTRAS.some(function (o) { return st.otras[o.id]; }) || st.citas.atras || st.citas.adelante || st.contactos.si || (st.otrasTexto || '').trim();
    if (hayOtras) filas.push({ id: 'otras', nombre: 'Otras fuentes (web, citas, contactos)' });
    return filas;
  }
  function motivo(c) {
    var def = compDef(c.k) || {};
    if (st.marco === 'dx' && c.k === 'P') return D.MOTIVOS.dxP;
    if (st.marco === 'dx' && c.k === 'O') return D.MOTIVOS.dxO;
    if (st.marco === 'spider' && c.k === 'D') return 'En SPIDER, los términos de diseño (entrevista, grupo focal) suelen añadirse al concepto R, tipo de investigación.';
    if (st.marco === 'eco' && c.k === 'D') return 'En evaluación económica el diseño sí se busca, como concepto o con un filtro económico publicado.';
    if (D.MOTIVOS[c.k] && !def.incluir) return D.MOTIVOS[c.k];
    return def.incluir ? D.MOTIVOS.incluir : (D.MOTIVOS[c.k] || '');
  }

  /* ---------- Comprobaciones (panel) ---------- */
  function comprobaciones() {
    var out = [], m = marcoAct();
    function add(sev, txt) { out.push({ sev: sev, txt: txt }); }
    var faltan = m.comps.filter(function (c) { return c.incluir && !(st.comp[c.k] || '').trim(); }).map(function (c) { return c.nombre; });
    if (faltan.length) add('bad', 'Completa la pregunta: falta ' + faltan.join(', ').toLowerCase() + '.');
    if (!st.bases.length) add('bad', 'No has elegido ninguna base de datos (paso 2).');
    var act = M.conceptosActivos(st);
    if (!act.length) add('bad', 'Ningún concepto incluido tiene términos: no hay estrategia que generar.');
    var nec = vocabsNecesarios(), sinVer = 0, avT = 0;
    st.conceptos.forEach(function (c) {
      VOCAB_KEYS.forEach(function (v) { (c[v] || []).forEach(function (t) { if (c.incluir && !t.ok) sinVer++; }); });
      if (!c.incluir) return;
      var nombre = c.k + ' (' + etiq(c) + ')';
      if (!c.libres.length) add('warn', nombre + ': sin texto libre. Los registros recientes, aún sin indizar, no se recuperarán.');
      else if (c.libres.length < 3) add('info', nombre + ': solo ' + c.libres.length + ' término(s) libre(s). Revisa sinónimos, acrónimos y variantes ortográficas.');
      if (nec.mesh && !c.mesh.length) add('warn', nombre + ': sin descriptor MeSH para ' + nec.mesh.join(', ') + '.');
      if (nec.emtree && !c.emtree.length) add('warn', nombre + ': sin término Emtree.' + (c.mesh.length ? ' No copies el MeSH: busca el equivalente en Emtree.' : ''));
      if (nec.cinahl && !c.cinahl.length) add('info', nombre + ': sin encabezamiento CINAHL (se buscará solo en texto libre).');
      if (nec.decs && !c.decs.length) add('info', nombre + ': sin descriptor DeCS para la BVS.');
      c.libres.forEach(function (l) { avT += M.avisosTermino(l).length; });
    });
    if (avT) add('warn', avT + ' aviso(s) de sintaxis en los términos libres: revísalos en el paso 3.');
    var inc = function (k) { return st.conceptos.some(function (c) { return c.k === k && c.incluir; }); };
    if ((st.marco === 'pico' || st.marco === 'eco') && inc('O')) add('warn', 'Buscas los desenlaces como concepto. El Manual Cochrane lo desaconseja: suelen faltar en el resumen.');
    if (st.marco !== 'spider' && inc('C')) add('info', 'Buscas el comparador como concepto: comprueba que no pierdes estudios relevantes.');
    if (st.marco === 'dx' && st.filtros.diseno !== 'ninguno') add('warn', 'Pregunta diagnóstica con filtro de diseño: el Manual Cochrane de exactitud diagnóstica no recomienda filtros metodológicos.');
    if (st.marco === 'dx' && inc('O')) add('warn', 'No busques términos de exactitud (sensibilidad, especificidad): reducen la sensibilidad de la búsqueda.');
    if (act.length > 3) add('info', act.length + ' conceptos combinados con AND: cada concepto añadido resta sensibilidad.');
    if (st.bases.length === 1) add('warn', 'Una sola base de datos. Ninguna base contiene todos los estudios: el Manual Cochrane recomienda varias.');
    if (st.bases.indexOf('pubmed') >= 0 && st.bases.indexOf('ovidmedline') >= 0) add('info', 'MEDLINE aparece dos veces (PubMed y Ovid): habrá muchos duplicados.');
    if ((st.marco === 'pico' || st.marco === 'dx') && !st.registros.length) add('warn', 'No consultas registros de ensayos (PRISMA-S, ítem 3). En intervenciones, el Manual Cochrane los considera fuente obligatoria.');
    var f = st.filtros;
    if (((f.idiomas || []).length || f.desde || f.hasta || (f.otrosLimites || '').trim()) && !(f.justificacion || '').trim()) add('warn', 'Hay límites sin justificar (PRISMA-S, ítem 9).');
    if ((f.idiomas || []).length) add('info', 'Límite de idioma: el Manual Cochrane lo desaconseja por el riesgo de sesgo de idioma.');
    if (sinVer) add('info', sinVer + ' término(s) de vocabulario controlado sin comprobar en su tesauro.');
    if (!out.length) add('ok', 'Sin incidencias detectadas. Revisa la estrategia con la lista PRESS (paso 6).');
    var orden = { bad: 0, warn: 1, info: 2, ok: 3 };
    return out.sort(function (a, b) { return orden[a.sev] - orden[b.sev]; });
  }

  /* ---------- PRISMA-S automático ---------- */
  function listaHumana(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]; }
  function filtroTexto() {
    var f = st.filtros;
    if (f.diseno === 'eca') return 'filtro Cochrane de ECA de máxima sensibilidad (revisión de 2008)';
    if (f.diseno === 'rs') return 'subconjunto systematic[sb] de PubMed';
    if (f.diseno === 'otro' && f.otroNombre) return f.otroNombre;
    return '';
  }
  function gruposMultibase() {
    var por = {};
    st.bases.forEach(function (id) { var b = M.baseDe(id); (por[b.plat] = por[b.plat] || []).push(b.base); });
    return Object.keys(por).filter(function (k) { return por[k].length > 1; }).map(function (k) { return { plat: k, bases: por[k] }; });
  }
  function prismaAuto() {
    var r = {}, f = st.filtros, p = st.prisma;
    function set(n, e, txt) { r[n] = { e: e, txt: txt }; }
    set(1, st.bases.length ? 'ok' : 'pend', st.bases.length ? 'Se consultaron las siguientes bases de datos: ' + listaHumana(st.bases.map(M.etiquetaBase)) + '.' : 'Elige al menos una base de datos en el paso 2.');
    var g = gruposMultibase();
    if (st.multibase && g.length) set(2, 'ok', g.map(function (x) { return 'Se buscó de forma simultánea en ' + x.plat + ' (' + listaHumana(x.bases) + ').'; }).join(' '));
    else if (st.multibase) set(2, 'pend', 'Marcaste búsqueda multibase, pero no hay dos bases de la misma plataforma.');
    else set(2, 'na', 'No se realizaron búsquedas multibase: cada base se consultó por separado.');
    var regs = st.registros.map(function (id) { return (M.REGISTROS.filter(function (x) { return x.id === id; })[0] || {}).nombre; }).filter(Boolean);
    set(3, regs.length ? 'ok' : 'pend', regs.length ? 'Se consultaron los registros de estudios ' + listaHumana(regs) + '.' : 'No se ha elegido ningún registro. Si no se consultó ninguno, indícalo y cambia el estado.');
    var otras = D.OTRAS.filter(function (o) { return st.otras[o.id]; }).map(function (o) { return o.t.toLowerCase(); });
    var ot = (st.otrasTexto || '').trim();
    set(4, otras.length || ot ? 'ok' : 'na', otras.length || ot ? (otras.length ? 'Se exploraron ' + listaHumana(otras) + '. ' : '') + ot : 'No se exploraron otras fuentes en línea o impresas.');
    var ci = [];
    if (st.citas.atras) ci.push('se revisaron las listas de referencias de los estudios incluidos');
    if (st.citas.adelante) ci.push('se buscaron las citas recibidas por los estudios incluidos');
    set(5, ci.length ? 'ok' : 'na', ci.length ? ci.join(' y ').replace(/^./, function (c) { return c.toUpperCase(); }) + '. ' + (st.citas.texto || '') : 'No se realizó búsqueda de citas.');
    set(6, st.contactos.si ? 'ok' : 'na', st.contactos.si ? 'Se contactó con ' + ((st.contactos.texto || '').trim() || '[indica con quién: autores, expertos, fabricantes]') + '.' : 'No se contactó con autores, expertos ni fabricantes.');
    var om = (st.otrosMetodos || '').trim();
    set(7, om ? 'ok' : 'na', om || 'No se usaron otros métodos de búsqueda.');
    var act = M.conceptosActivos(st);
    set(8, act.length && st.bases.length ? 'ok' : 'pend', act.length && st.bases.length ? 'Las estrategias completas de cada base figuran en el anexo, tal como se ejecutaron. Si las modificaste al ejecutarlas, sustituye el anexo por la versión final.' : 'Aún no hay estrategia completa (pasos 2 y 3).');
    var lim = [];
    if (f.desde || f.hasta) lim.push('fecha de publicación ' + (f.desde || 'sin inicio') + '–' + (f.hasta || 'actualidad'));
    if ((f.idiomas || []).length) lim.push('idioma (' + f.idiomas.map(function (k) { return (M.IDIOMAS.filter(function (x) { return x.id === k; })[0] || {}).es; }).join(', ') + ')');
    if (f.animales) lim.push('exclusión de estudios realizados solo en animales');
    if ((f.otrosLimites || '').trim()) lim.push(f.otrosLimites.trim());
    var hayLim = lim.length > (f.animales ? 1 : 0);
    if (!lim.length) set(9, 'ok', 'No se aplicaron límites de fecha, idioma ni diseño.');
    else set(9, hayLim && !(f.justificacion || '').trim() ? 'pend' : 'ok', 'Se aplicaron los siguientes límites: ' + lim.join('; ') + '.' + ((f.justificacion || '').trim() ? ' Justificación: ' + f.justificacion.trim() : (hayLim ? ' [Falta la justificación]' : '')));
    if (f.diseno === 'eca') set(10, 'ok', 'Se usó el filtro Cochrane para identificar ensayos aleatorizados en MEDLINE, versión de máxima sensibilidad (revisión de 2008), sin modificar, en ' + listaHumana(st.bases.filter(function (id) { return id === 'pubmed' || id === 'ovidmedline'; }).map(M.etiquetaBase)) + '. ' + M.HSSS.cita);
    else if (f.diseno === 'rs') set(10, 'ok', 'Se usó el subconjunto systematic[sb] de PubMed para limitar a revisiones sistemáticas.');
    else if (f.diseno === 'otro') set(10, f.otroNombre ? 'ok' : 'pend', f.otroNombre ? 'Se usó el filtro ' + f.otroNombre + (f.otroCita ? ' (' + f.otroCita + ')' : ' [falta la cita]') + '.' : 'Indica el nombre y la cita del filtro (paso 4).');
    else set(10, 'ok', 'No se usaron filtros de búsqueda publicados.');
    if (p.previo === 'si') set(11, p.previoCita ? 'ok' : 'pend', p.previoCita ? 'La estrategia se adaptó de la revisión: ' + p.previoCita + '.' : 'Cita la revisión de la que se adaptó la estrategia.');
    else if (p.previo === 'no') set(11, 'ok', 'La estrategia se diseñó para esta revisión; no se reutilizaron estrategias previas.');
    else set(11, 'pend', 'Indica si reutilizaste o adaptaste la estrategia de otra revisión.');
    var ac = (p.actualizacion || '').trim();
    set(12, ac ? 'ok' : 'pend', ac || 'Describe cómo se actualizará la búsqueda o indica que no se actualizó.');
    var fuentesF = st.bases.concat(st.registros);
    var conF = fuentesF.filter(function (id) { return st.resultados[id] && st.resultados[id].fecha; });
    set(13, fuentesF.length && conF.length === fuentesF.length ? 'ok' : 'pend', fuentesF.length ? fuentesF.map(function (id) {
      var nom = M.baseDe(id) ? M.etiquetaBase(id) : (M.REGISTROS.filter(function (x) { return x.id === id; })[0] || {}).nombre;
      var fe = st.resultados[id] && st.resultados[id].fecha;
      return nom + ': ' + (fe ? fechaES(fe) : '[sin fecha]');
    }).join('; ') + '.' : 'Sin fuentes.');
    var pressOk = D.PRESS.filter(function (x) { return p.press[x.k]; }).map(function (x) { return x.t.toLowerCase(); });
    if (p.revision === 'press') set(14, 'ok', 'La estrategia de MEDLINE fue revisada por ' + ((p.revisor || '').trim() || '[revisor/a]') + ' con la guía PRESS 2015 antes de ejecutarla' + (pressOk.length ? '; se revisaron ' + listaHumana(pressOk) : '') + '.');
    else if (p.revision === 'interna') set(14, 'ok', 'La estrategia fue revisada por otro miembro del equipo (' + ((p.revisor || '').trim() || '[quién]') + ') antes de ejecutarla, sin seguir una guía formal.');
    else if (p.revision === 'ninguna') set(14, 'ok', 'No se realizó revisión por pares de la estrategia.');
    else set(14, 'pend', 'Indica si la estrategia se revisó por pares.');
    var filas = fuentesRecuento(), total = 0, faltan = 0;
    var t15 = filas.map(function (fl) { var n = st.resultados[fl.id] && st.resultados[fl.id].n; if (n === '' || n == null || isNaN(parseInt(n, 10))) { faltan++; return fl.nombre + ': [sin dato]'; } total += parseInt(n, 10); return fl.nombre + ': ' + parseInt(n, 10).toLocaleString('es-ES'); });
    set(15, filas.length && !faltan ? 'ok' : 'pend', filas.length ? t15.join('; ') + '. Total: ' + total.toLocaleString('es-ES') + ' registros.' : 'Sin fuentes.');
    var dup = parseInt(p.duplicados, 10);
    if (!isNaN(dup) && p.software) set(16, 'ok', 'Se eliminaron ' + dup.toLocaleString('es-ES') + ' duplicados con ' + p.software + ((p.dedupTexto || '').trim() ? ' (' + p.dedupTexto.trim() + ')' : '') + '; quedaron ' + Math.max(0, total - dup).toLocaleString('es-ES') + ' registros únicos para el cribado.');
    else set(16, 'pend', 'Indica cuántos duplicados se eliminaron y con qué herramienta.');
    return r;
  }
  function prismaFinal() {
    var a = prismaAuto(), out = {};
    for (var n = 1; n <= 16; n++) {
      var e = st.prisma.estados[n] && st.prisma.estados[n] !== 'auto' ? st.prisma.estados[n] : a[n].e;
      var nota = (st.prisma.notas[n] || '').trim();
      out[n] = { e: e, auto: a[n].e, txt: nota || a[n].txt };
    }
    return out;
  }

  function estadoPasos() {
    var m = marcoAct();
    var s = {};
    s[1] = m.comps.filter(function (c) { return c.incluir; }).every(function (c) { return (st.comp[c.k] || '').trim(); }) ? 'ok' : 'warn';
    s[2] = st.bases.length ? 'ok' : 'warn';
    var act = M.conceptosActivos(st);
    s[3] = act.length && st.conceptos.filter(function (c) { return c.incluir; }).every(function (c) { return c.libres.length; }) ? 'ok' : 'warn';
    var f = st.filtros;
    s[4] = ((f.idiomas || []).length || f.desde || f.hasta) && !(f.justificacion || '').trim() ? 'warn' : 'ok';
    var fu = st.bases.concat(st.registros);
    s[5] = fu.length && fu.every(function (id) { var r = st.resultados[id]; return r && r.fecha && r.n !== '' && r.n != null; }) ? 'ok' : '';
    var pf = prismaFinal(), pend = 0; for (var n = 1; n <= 16; n++) if (pf[n].e === 'pend') pend++;
    s[6] = pend ? '' : 'ok';
    return s;
  }

  /* ---------- Render: cabecera ---------- */
  function renderCasos() {
    var h = D.CASOS.map(function (c) {
      var lbl = ui.confirmar === c.id ? 'Pulsa otra vez para sustituir tu trabajo' : c.titulo;
      return '<button type="button" class="caso-btn" data-act="caso" data-id="' + c.id + '" aria-pressed="' + (st.caso === c.id) + '" title="' + esc(c.resumen) + '"><b>' + esc(lbl) + '</b><span>' + esc(c.etiqueta) + '</span></button>';
    }).join('');
    h += '<button type="button" class="caso-btn nuevo" data-act="caso" data-id="nuevo" aria-pressed="false"><b>' + (ui.confirmar === 'nuevo' ? 'Pulsa otra vez para vaciar' : 'Búsqueda nueva') + '</b><span>empezar en blanco</span></button>';
    $('#casos').innerHTML = h;
  }

  function renderNav() {
    var s = estadoPasos();
    $('#pasos-nav').innerHTML = PASOS.map(function (p) {
      return '<li><button type="button" data-act="ir" data-n="' + p.n + '"' + (st.paso === p.n ? ' aria-current="step"' : '') + '><span class="num"><i class="' + (s[p.n] || '') + '"></i>Paso ' + p.n + '</span><b>' + p.t + '</b></button></li>';
    }).join('');
  }

  function navPie() {
    return '<div class="nav-pie">' + (st.paso > 1 ? '<button type="button" class="btn" data-act="ir" data-n="' + (st.paso - 1) + '">← ' + PASOS[st.paso - 2].t + '</button>' : '<span></span>') +
      (st.paso < 6 ? '<button type="button" class="btn primary" data-act="ir" data-n="' + (st.paso + 1) + '">' + PASOS[st.paso].t + ' →</button>' : '<span></span>') + '</div>';
  }

  /* ---------- Paso 1 ---------- */
  function paso1() {
    var m = marcoAct();
    var marcos = Object.keys(D.MARCOS).map(function (k) {
      var x = D.MARCOS[k];
      return '<input type="radio" name="marco" id="marco-' + k + '" value="' + k + '"' + (st.marco === k ? ' checked' : '') + '><label for="marco-' + k + '"><b>' + x.nombre + '</b><span>' + x.sub + '</span></label>';
    }).join('');
    var comps = m.comps.map(function (c) {
      return '<div class="comp"><span class="letra">' + c.k + '</span><label class="campo" for="comp-' + c.k + '">' + c.nombre + (c.opcional ? ' <small>(opcional)</small>' : '') +
        '<input type="text" id="comp-' + c.k + '" data-path="comp.' + c.k + '" data-upd="pq" value="' + esc(st.comp[c.k] || '') + '" placeholder="' + esc(c.ayuda) + '"></label></div>';
    }).join('');
    return '<section class="paso"><header><h2>1. Formula la pregunta</h2><p>La pregunta define qué conceptos se buscan y qué estudios serán elegibles. Redáctala antes de buscar y con detalle suficiente para que todo el equipo comparta el mismo objetivo.</p></header>' +
      '<div class="bloque"><h3>Marco de la pregunta</h3><div class="marcos" role="radiogroup" aria-label="Marco de la pregunta">' + marcos + '</div><p class="help">' + esc(m.desc) + '</p></div>' +
      '<div class="bloque"><h3>Componentes <span class="mono">' + m.nombre + '</span></h3>' + comps + '</div>' +
      '<div class="bloque"><h3>Pregunta redactada</h3><p class="pregunta-out" id="pq-auto">' + esc(m.plantilla(st.comp)) + '</p>' +
      '<label class="campo" for="pq-manual">Tu redacción <small>Opcional. Si la escribes, sustituye a la propuesta automática en el resumen y el informe.</small><textarea id="pq-manual" data-path="preguntaManual" placeholder="Reescribe la pregunta con tus palabras">' + esc(st.preguntaManual || '') + '</textarea></label></div>' +
      navPie() + '</section>';
  }

  /* ---------- Paso 2 ---------- */
  function paso2() {
    var grupos = {};
    M.BASES.forEach(function (b) { (grupos[b.grupo] = grupos[b.grupo] || []).push(b); });
    var bases = Object.keys(grupos).map(function (g) {
      return '<p class="grupo-t">' + g + '</p><div class="checks">' + grupos[g].map(function (b) {
        return '<input type="checkbox" id="base-' + b.id + '" data-list="bases" value="' + b.id + '"' + (st.bases.indexOf(b.id) >= 0 ? ' checked' : '') + '><label for="base-' + b.id + '"><span><b>' + b.base + '</b><span class="mono">' + b.plat + (b.vocab ? ' · ' + M.VOCABS[b.vocab].nombre : ' · solo texto libre') + '</span><small>' + esc(b.desc) + '</small></span></label>';
      }).join('') + '</div>';
    }).join('');
    var g = gruposMultibase();
    var regs = M.REGISTROS.map(function (r) {
      return '<input type="checkbox" id="reg-' + r.id + '" data-list="registros" value="' + r.id + '"' + (st.registros.indexOf(r.id) >= 0 ? ' checked' : '') + '><label for="reg-' + r.id + '"><span><b>' + r.nombre + '</b><small>' + esc(r.desc) + '</small></span></label>';
    }).join('');
    var otras = D.OTRAS.map(function (o) {
      return '<input type="checkbox" id="otra-' + o.id + '" data-path="otras.' + o.id + '" data-bool="1"' + (st.otras[o.id] ? ' checked' : '') + '><label for="otra-' + o.id + '"><span><b>' + o.t + '</b><small>' + esc(o.d) + '</small></span></label>';
    }).join('');
    return '<section class="paso"><header><h2>2. Elige las fuentes</h2><p>Ninguna base contiene todos los estudios. Para revisiones de intervenciones, el Manual Cochrane considera fuentes mínimas CENTRAL, MEDLINE y Embase, además de los registros de ensayos. En ETS conviene añadir agencias e informes de evaluación, y en productos sanitarios, fuentes regulatorias.</p></header>' +
      '<div class="bloque"><h3>Bases de datos bibliográficas <span class="mono">PRISMA-S 1</span></h3><p class="help">La misma base puede consultarse en varias plataformas (MEDLINE en PubMed u Ovid) y cada una tiene su sintaxis: anota siempre las dos cosas.</p>' + bases +
      (g.length ? '<div class="checks"><input type="checkbox" id="multibase" data-path="multibase" data-bool="1"' + (st.multibase ? ' checked' : '') + '><label for="multibase"><span><b>Búsqueda multibase en ' + g.map(function (x) { return x.plat; }).join(', ') + '</b><small>Marca si ejecutarás ' + g.map(function (x) { return listaHumana(x.bases); }).join('; ') + ' a la vez en la misma plataforma (PRISMA-S 2).</small></span></label></div>' : '') + '</div>' +
      '<div class="bloque"><h3>Registros de estudios <span class="mono">PRISMA-S 3</span></h3><p class="help">Permiten localizar ensayos en curso o no publicados y reducir el sesgo de publicación.</p><div class="checks">' + regs + '</div></div>' +
      '<div class="bloque"><h3>Otras fuentes y literatura gris <span class="mono">PRISMA-S 4</span></h3><div class="checks">' + otras + '</div>' +
      '<label class="campo" for="otras-texto">Cómo se hará <small>Qué webs, qué congresos y años, cuántas páginas de resultados se revisan.</small><textarea id="otras-texto" data-path="otrasTexto" placeholder="p. ej., se revisaron los informes publicados por RedETS y NICE entre 2015 y 2026 con los términos de la intervención">' + esc(st.otrasTexto || '') + '</textarea></label></div>' +
      '<div class="bloque"><h3>Búsqueda de citas, contactos y otros métodos <span class="mono">PRISMA-S 5–7</span></h3><div class="checks">' +
      '<input type="checkbox" id="citas-atras" data-path="citas.atras" data-bool="1"' + (st.citas.atras ? ' checked' : '') + '><label for="citas-atras"><span><b>Referencias de los estudios incluidos</b><small>Búsqueda hacia atrás en las listas de referencias.</small></span></label>' +
      '<input type="checkbox" id="citas-adelante" data-path="citas.adelante" data-bool="1"' + (st.citas.adelante ? ' checked' : '') + '><label for="citas-adelante"><span><b>Citas recibidas</b><small>Búsqueda hacia delante con Scopus, Web of Science o Google Scholar.</small></span></label>' +
      '<input type="checkbox" id="contactos-si" data-path="contactos.si" data-bool="1"' + (st.contactos.si ? ' checked' : '') + '><label for="contactos-si"><span><b>Contacto con autores, expertos o fabricantes</b><small>Para estudios no publicados o datos que faltan.</small></span></label></div>' +
      '<div class="fila2"><label class="campo" for="citas-texto">Método de búsqueda de citas<input type="text" id="citas-texto" data-path="citas.texto" value="' + esc(st.citas.texto || '') + '" placeholder="Herramienta y fecha"></label>' +
      '<label class="campo" for="contactos-texto">Con quién se contactó<input type="text" id="contactos-texto" data-path="contactos.texto" value="' + esc(st.contactos.texto || '') + '" placeholder="p. ej., el fabricante y los autores de 3 estudios"></label></div>' +
      '<label class="campo" for="otros-metodos">Otros métodos<input type="text" id="otros-metodos" data-path="otrosMetodos" value="' + esc(st.otrosMetodos || '') + '" placeholder="p. ej., revisión manual de las revistas X e Y"></label></div>' +
      navPie() + '</section>';
  }

  /* ---------- Paso 3 ---------- */
  function chipCtrl(i, v, j, t) {
    var url = M.VOCABS[v].url ? M.VOCABS[v].url(t.t) : null;
    return '<span class="chip"><span class="tx">' + esc(t.t) + '</span>' +
      (v !== 'decs' ? '<button type="button" class="exp" data-act="exp" data-i="' + i + '" data-v="' + v + '" data-j="' + j + '" aria-pressed="' + (t.exp !== false) + '" title="Explotar: incluir los términos más específicos del árbol">' + (t.exp !== false ? 'exp' : 'sin exp') + '</button>' : '') +
      '<button type="button" class="ok" data-act="ok" data-i="' + i + '" data-v="' + v + '" data-j="' + j + '" aria-pressed="' + !!t.ok + '" title="Márcalo cuando lo hayas encontrado en el tesauro">' + (t.ok ? 'comprobado' : 'sin comprobar') + '</button>' +
      (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">tesauro</a>' : '') +
      '<button type="button" data-act="del-c" data-i="' + i + '" data-v="' + v + '" data-j="' + j + '" aria-label="Quitar ' + esc(t.t) + '">×</button></span>';
  }
  function chipLibre(i, j, raw) {
    var p = M.parseTerm(raw);
    var tipo = p.tipo === 'prox' ? 'proximidad' : (p.tipo === 'frase' ? 'frase' : 'palabra') + (p.trunc ? ' · truncada' : '');
    return '<span class="chip"><span class="tx mono">' + esc(p.t) + '</span><span class="tipo">' + tipo + '</span><button type="button" data-act="del-l" data-i="' + i + '" data-j="' + j + '" aria-label="Quitar ' + esc(p.t) + '">×</button></span>';
  }
  function concepto(i) {
    var c = st.conceptos[i], def = compDef(c.k) || {}, nec = vocabsNecesarios();
    var total = c.libres.length + VOCAB_KEYS.reduce(function (a, v) { return a + c[v].length; }, 0);
    var h = '<article class="concepto' + (c.incluir ? '' : ' fuera') + '" id="concepto-' + i + '"><div class="cab"><span class="letra">' + c.k + '</span>' +
      '<label class="campo" for="etq-' + i + '"><span class="eyebrow">' + esc(def.nombre || c.k) + (st.comp[c.k] ? ' · ' + esc(st.comp[c.k]) : '') + '</span><input type="text" id="etq-' + i + '" data-path="conceptos.' + i + '.etiqueta" value="' + esc(c.etiqueta) + '" placeholder="Nombre corto del concepto"></label>' +
      '<label class="toggle" for="inc-' + i + '"><input type="checkbox" id="inc-' + i + '" data-act="incluir" data-i="' + i + '"' + (c.incluir ? ' checked' : '') + '>Buscar</label>' +
      '<p class="motivo">' + esc(motivo(c)) + (!c.incluir && total ? ' Conserva ' + total + ' término(s), que no se usan.' : '') + '</p></div>';
    if (!c.incluir) return h + '</article>';
    h += '<div class="cuerpo">';
    var vs = Object.keys(nec);
    if (!vs.length && st.bases.length) h += '<p class="help">Las bases elegidas no usan vocabulario controlado: solo cuenta el texto libre.</p>';
    VOCAB_KEYS.forEach(function (v) {
      if (!nec[v]) return;
      var V = M.VOCABS[v];
      h += '<div class="vocab"><div class="vt"><b>' + V.nombre + '</b><small>para ' + esc(nec[v].join(', ')) + '</small></div>' +
        (c[v].length ? '<div class="chips">' + c[v].map(function (t, j) { return chipCtrl(i, v, j, t); }).join('') + '</div>' : '<p class="help">' + esc(V.largo) + '. Sin términos todavía.</p>') +
        '<div class="add"><input type="text" id="add-' + v + '-' + i + '" data-enter="add-c" data-i="' + i + '" data-v="' + v + '" placeholder="Término exacto del tesauro, p. ej. ' + (v === 'emtree' ? 'heart failure' : v === 'decs' ? 'Insuficiencia Cardíaca' : 'Heart Failure') + '">' +
        '<button type="button" class="btn sm" data-act="add-c" data-i="' + i + '" data-v="' + v + '">Añadir</button></div>' +
        (V.url ? '<span class="help" style="font-size:.84rem">Búscalo en <a href="' + esc(V.url(st.comp[c.k] || c.etiqueta || '')) + '" target="_blank" rel="noopener">' + esc(V.largo) + '</a> y copia el encabezamiento tal cual; sus «Entry Terms» son buenos sinónimos para el texto libre.</span>' : '<span class="help" style="font-size:.84rem">Los encabezamientos de CINAHL se consultan en «CINAHL Headings», dentro de EBSCOhost.</span>') +
        '</div>';
    });
    var av = [];
    c.libres.forEach(function (l) { av = av.concat(M.avisosTermino(l)); });
    h += '<div class="vocab libre"><div class="vt"><b>Texto libre</b><small>título y resumen' + (st.campo === 'ti' ? ' (ahora: solo título)' : '') + '</small></div>' +
      (c.libres.length ? '<div class="chips">' + c.libres.map(function (l, j) { return chipLibre(i, j, l); }).join('') + '</div>' : '<p class="help">Sin términos todavía. El texto libre recupera lo que aún no está indizado.</p>') +
      '<label class="campo" for="libre-' + i + '"><small>Uno por línea o separados por punto y coma. <span class="mono">*</span> trunca (monitor* → monitoring, monitored); las frases van sin comillas; proximidad: <span class="mono">heart NEAR/3 failure</span> (máximo 3 palabras entre ambas).</small>' +
      '<textarea id="libre-' + i + '" data-enter="add-l" data-i="' + i + '" placeholder="sinónimos, acrónimos, variantes UK/US, nombres comerciales"></textarea></label>' +
      '<div class="acciones"><button type="button" class="btn sm" data-act="add-l" data-i="' + i + '">Añadir términos</button>' + (c.libres.length ? '<button type="button" class="linkbtn" data-act="vaciar-l" data-i="' + i + '">Vaciar</button>' : '') + '</div>' +
      (av.length ? '<ul class="avisos-t">' + av.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    h += '<details class="ideas"><summary>Ideas para no dejarte sinónimos</summary><ul>' +
      '<li>Los «Entry Terms» del registro MeSH y los sinónimos de Emtree.</li>' +
      '<li>Variantes británicas y estadounidenses (tumour/tumor, randomised/randomized) y plurales.</li>' +
      '<li>Acrónimos y siglas (TMVR, IMRT), con cuidado si son ambiguos.</li>' +
      '<li>En productos sanitarios: nombre comercial, modelo, fabricante y nombres antiguos de la técnica.</li>' +
      '<li>Los términos de 2 o 3 artículos clave que ya conozcas: comprueba que la estrategia los recupera.</li></ul></details>';
    return h + '</div></article>';
  }
  function paso3() {
    var h = '<section class="paso"><header><h2>3. Conceptos y términos</h2><p>Cada concepto que se busca combina, con OR, su vocabulario controlado y sus sinónimos en texto libre. Los conceptos se combinan entre sí con AND. Normalmente se buscan la población y la intervención (o la prueba y la condición diana); el comparador y los desenlaces, no.</p></header>' +
      '<div class="bloque"><h3>Campos del texto libre</h3><label class="campo" for="campo">Dónde buscar los sinónimos<select id="campo" data-path="campo" data-rerender="1"><option value="tiab"' + (st.campo !== 'ti' ? ' selected' : '') + '>Título, resumen y palabras clave del autor (recomendado)</option><option value="ti"' + (st.campo === 'ti' ? ' selected' : '') + '>Solo título (más preciso, menos sensible)</option></select></label></div>';
    h += st.conceptos.map(function (c, i) { return concepto(i); }).join('');
    return h + navPie() + '</section>';
  }

  /* ---------- Paso 4 ---------- */
  function paso4() {
    var f = st.filtros;
    var dis = [
      { v: 'ninguno', b: 'Sin filtro de diseño', s: 'Lo más sensible. Obligado en preguntas diagnósticas y adecuado para productos sanitarios, donde abundan los estudios observacionales.' },
      { v: 'eca', b: 'Ensayos aleatorizados', s: 'Filtro Cochrane de máxima sensibilidad (2008) para PubMed y Ovid MEDLINE. CENTRAL no lo necesita.' },
      { v: 'rs', b: 'Revisiones sistemáticas', s: 'Subconjunto systematic[sb] de PubMed. Útil para localizar revisiones previas.' },
      { v: 'otro', b: 'Otro filtro publicado', s: 'Observacionales, evaluaciones económicas… Indica su nombre y su cita.' }
    ].map(function (d) {
      return '<input type="radio" name="diseno" id="dis-' + d.v + '" value="' + d.v + '"' + (f.diseno === d.v ? ' checked' : '') + '><label for="dis-' + d.v + '"><b>' + d.b + '</b><span>' + d.s + '</span></label>';
    }).join('');
    var idi = M.IDIOMAS.map(function (x) {
      return '<input type="checkbox" id="idi-' + x.id + '" data-list="filtros.idiomas" value="' + x.id + '"' + ((f.idiomas || []).indexOf(x.id) >= 0 ? ' checked' : '') + '><label for="idi-' + x.id + '"><span><b>' + x.es + '</b></span></label>';
    }).join('');
    return '<section class="paso"><header><h2>4. Filtros y límites</h2><p>Un filtro es una estrategia publicada y validada para recuperar un tipo de estudio; un límite es una restricción de la plataforma (fecha, idioma). Ambos deben declararse, y los límites, justificarse (PRISMA-S 9 y 10).</p></header>' +
      (st.marco === 'dx' ? '<p class="aviso">Pregunta diagnóstica: el Manual Cochrane de exactitud diagnóstica no recomienda filtros metodológicos porque pierden estudios relevantes.</p>' : '') +
      '<div class="bloque"><h3>Filtro de diseño <span class="mono">PRISMA-S 10</span></h3><div class="opts marcos" role="radiogroup" aria-label="Filtro de diseño">' + dis + '</div>' +
      (f.diseno === 'otro' ? '<div class="fila2"><label class="campo" for="otro-nombre">Nombre del filtro<input type="text" id="otro-nombre" data-path="filtros.otroNombre" value="' + esc(f.otroNombre || '') + '" placeholder="p. ej., filtro de evaluaciones económicas de…"></label><label class="campo" for="otro-cita">Cita<input type="text" id="otro-cita" data-path="filtros.otroCita" value="' + esc(f.otroCita || '') + '" placeholder="Autores, año, fuente"></label></div><label class="campo" for="otro-pubmed">Sintaxis para PubMed <small>Opcional. Pega el filtro tal como se publicó; se añadirá con AND solo en PubMed.</small><textarea id="otro-pubmed" data-path="filtros.otroPubmed" class="mono">' + esc(f.otroPubmed || '') + '</textarea></label><p class="help">Repositorio de filtros validados: ISSG Search Filters Resource (InterTASC Information Specialists\' Sub-Group).</p>' : '') +
      '<div class="checks"><input type="checkbox" id="animales" data-path="filtros.animales" data-bool="1"' + (f.animales ? ' checked' : '') + '><label for="animales"><span><b>Excluir estudios realizados solo en animales</b><small>Se aplica con NOT sobre los registros indizados solo como animales; conserva los que tratan de humanos y animales.</small></span></label></div></div>' +
      '<div class="bloque"><h3>Límites <span class="mono">PRISMA-S 9</span></h3><div class="fila2"><label class="campo" for="desde">Año de publicación desde<input type="number" id="desde" data-path="filtros.desde" value="' + esc(f.desde || '') + '" min="1900" max="2100" placeholder="sin límite"></label><label class="campo" for="hasta">hasta<input type="number" id="hasta" data-path="filtros.hasta" value="' + esc(f.hasta || '') + '" min="1900" max="2100" placeholder="actualidad"></label></div>' +
      '<p class="help">Un límite de fecha se justifica cuando la tecnología no existía antes (primer implante, marcado CE, identificación del patógeno) o cuando se actualiza una revisión previa.</p>' +
      '<p class="grupo-t">Idioma</p><div class="checks">' + idi + '</div><p class="help">Si no marcas ninguno, no se limita por idioma (opción recomendada).</p>' +
      '<label class="campo" for="otros-limites">Otros límites<input type="text" id="otros-limites" data-path="filtros.otrosLimites" value="' + esc(f.otrosLimites || '') + '" placeholder="p. ej., excluir cartas y editoriales"></label>' +
      '<label class="campo" for="justificacion">Justificación de los límites<textarea id="justificacion" data-path="filtros.justificacion" placeholder="Por qué se aplicó cada límite">' + esc(f.justificacion || '') + '</textarea></label></div>' +
      navPie() + '</section>';
  }

  /* ---------- Paso 5 ---------- */
  function tablaLineas(lin) {
    return '<div class="tabla-scroll"><table class="lineas"><tbody>' + lin.map(function (l) { return '<tr><td>' + esc(l.n) + '</td><td>' + esc(l.txt) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function lineasTexto(lin) { return lin.map(function (l) { return l.n + '\t' + l.txt; }).join('\n'); }
  function bloqueResultado(id) {
    var r = st.resultados[id] || {};
    return '<div class="result"><label class="campo" for="fe-' + id + '">Fecha de la búsqueda<input type="date" id="fe-' + id + '" data-path="resultados.' + id + '.fecha" value="' + esc(r.fecha || '') + '"></label>' +
      '<label class="campo" for="n-' + id + '">Registros obtenidos<input type="number" id="n-' + id + '" min="0" data-path="resultados.' + id + '.n" value="' + esc(r.n == null ? '' : r.n) + '"></label>' +
      '<div class="acciones" style="align-self:end"><button type="button" class="btn sm" data-act="hoy" data-id="' + id + '">Fecha de hoy</button></div></div>';
  }
  function paso5() {
    var h = '<section class="paso"><header><h2>5. Estrategias por base de datos</h2><p>La misma lógica, traducida a la sintaxis de cada plataforma. Ejecútala, anota la fecha y el número de registros, y guarda la versión final exactamente como se ejecutó (PRISMA-S 8, 13 y 15).</p></header>';
    if (!st.bases.length) return h + '<p class="aviso">Elige al menos una base de datos en el paso 2.</p>' + navPie() + '</section>';
    if (!ui.tab || st.bases.indexOf(ui.tab) < 0) ui.tab = st.bases[0];
    h += '<div class="tabs" role="tablist" aria-label="Bases de datos">' + st.bases.map(function (id) {
      var b = M.baseDe(id);
      return '<button type="button" role="tab" data-act="tab" data-id="' + id + '" aria-selected="' + (ui.tab === id) + '">' + b.base + ' · ' + b.plat + '</button>';
    }).join('') + '</div>';
    var r = M.estrategia(st, ui.tab), b = r.base;
    h += '<div class="bloque" role="tabpanel"><h3>' + b.base + ' <span class="mono">' + b.plat + (b.vocab ? ' · ' + M.VOCABS[b.vocab].nombre : ' · texto libre') + '</span></h3>';
    if (r.avisos.length) h += '<ul class="notas av">' + r.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    if (r.lineas) {
      h += '<p class="grupo-t">Línea a línea (formato para el informe)</p>' + tablaLineas(r.lineas) +
        '<div class="acciones"><button type="button" class="btn" data-act="copiar" data-que="lineas">Copiar línea a línea</button><span class="copiado" data-copiado="lineas"></span></div>';
    }
    if (r.unaLinea) {
      h += '<p class="grupo-t">En una sola cadena</p><pre class="codigo envuelto">' + esc(r.unaLinea) + '</pre>' +
        '<div class="acciones"><button type="button" class="btn' + (r.lineas ? '' : ' primary') + '" data-act="copiar" data-que="una">Copiar cadena</button>' +
        (r.url ? '<a class="btn primary" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + (ui.tab === 'pubmed' ? 'Ejecutar en PubMed' : 'Abrir ' + esc(b.plat)) + '</a>' : '') +
        '<span class="copiado" data-copiado="una"></span></div>';
    }
    h += '<ul class="notas">' + r.notas.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' + bloqueResultado(ui.tab) + '</div>';
    if (st.registros.length) {
      h += '<div class="bloque"><h3>Registros de estudios <span class="mono">PRISMA-S 3</span></h3><p class="help">Los registros no admiten estrategias complejas: busca con pocos términos y revisa todo lo recuperado.</p>';
      st.registros.forEach(function (id) {
        var rg = M.registro(st, id), def = M.REGISTROS.filter(function (x) { return x.id === id; })[0];
        h += '<div class="vocab"><div class="vt"><b>' + def.nombre + '</b>' + (rg.url ? '<a href="' + esc(rg.url) + '" target="_blank" rel="noopener">' + (id === 'ctgov' ? 'Buscar en ClinicalTrials.gov' : 'Abrir el registro') + '</a>' : '') + '</div><p class="mono" style="margin:0">' + esc(rg.texto) + '</p>' + bloqueResultado(id) + '</div>';
      });
      h += '</div>';
    }
    var filas = fuentesRecuento();
    if (filas.some(function (f) { return f.id === 'otras'; })) {
      h += '<div class="bloque"><h3>Otras fuentes</h3><p class="help">Anota cuántos registros añadieron la literatura gris, la búsqueda de citas y los contactos.</p><label class="campo" for="n-otras">Registros de otras fuentes<input type="number" id="n-otras" min="0" data-path="resultados.otras.n" value="' + esc((st.resultados.otras || {}).n || '') + '"></label></div>';
    }
    return h + navPie() + '</section>';
  }

  /* ---------- Paso 6 ---------- */
  function paso6() {
    var auto = prismaAuto(), fin = prismaFinal(), p = st.prisma;
    var etiquetas = { ok: 'Cumple', na: 'No aplica', pend: 'Pendiente' };
    var h = '<section class="paso"><header><h2>6. PRISMA-S e informe</h2><p>Los 16 ítems de PRISMA-S (Rethlefsen et al., 2021) recogen lo que debe informarse para que la búsqueda sea reproducible. La herramienta propone un texto con lo que ya has decidido; corrígelo o complétalo. Traducción propia de los ítems.</p></header><div class="bloque">';
    D.PRISMA_S.forEach(function (sec) {
      h += '<p class="sec-t">' + sec.sec + '</p>';
      sec.items.forEach(function (it) {
        var n = it.n, a = auto[n], f = fin[n], e = p.estados[n] || 'auto';
        h += '<div class="item" data-e="' + f.e + '" id="item-' + n + '"><span class="n">' + n + '</span><div class="it"><b>' + it.t + '</b>' +
          '<select id="est-' + n + '" data-path="prisma.estados.' + n + '" data-rerender="1" aria-label="Estado del ítem ' + n + '">' +
          '<option value="auto"' + (e === 'auto' ? ' selected' : '') + '>Automático: ' + etiquetas[a.e] + '</option>' +
          ['ok', 'na', 'pend'].map(function (k) { return '<option value="' + k + '"' + (e === k ? ' selected' : '') + '>' + etiquetas[k] + '</option>'; }).join('') + '</select></div>' +
          '<p class="def">' + esc(it.d) + '</p><p class="prop" id="prop-' + n + '">' + esc(a.txt) + '</p><div class="extra">' + extraItem(n) +
          '<label class="campo" for="nota-' + n + '"><small>Texto propio para el informe (opcional; sustituye a la propuesta)</small><textarea id="nota-' + n + '" data-path="prisma.notas.' + n + '" rows="2">' + esc(p.notas[n] || '') + '</textarea></label></div></div>';
      });
    });
    h += '</div>';
    h += '<div class="bloque"><h3>Exportar</h3><p class="help">El informe en texto sirve para la memoria o el TFG; el anexo LaTeX, para la plantilla de la asignatura; el proyecto JSON permite retomar el trabajo en otro equipo o entregarlo.</p>' +
      '<div class="acciones"><button type="button" class="btn primary" data-act="copiar" data-que="informe">Copiar informe (texto)</button><button type="button" class="btn" data-act="copiar" data-que="latex">Copiar anexo LaTeX</button><button type="button" class="btn" data-act="copiar" data-que="json">Copiar proyecto (JSON)</button><span class="copiado" data-copiado="export"></span></div>' +
      '<div class="fila2"><label class="campo" for="importar-archivo">Importar un proyecto (.json)<input type="file" id="importar-archivo" accept=".json,application/json"></label>' +
      '<label class="campo" for="importar-texto">o pega aquí el JSON<textarea id="importar-texto" rows="2" class="mono"></textarea></label></div>' +
      '<div class="acciones"><button type="button" class="btn" data-act="importar">Cargar el JSON pegado</button><span class="copiado" id="import-msg"></span></div>' +
      '<label class="campo" for="copia-manual" id="copia-manual-l" hidden>Tu navegador no permite copiar automáticamente: selecciona el texto y cópialo.<textarea id="copia-manual" rows="8" class="mono"></textarea></label></div>';
    return h + navPie() + '</section>';
  }
  function extraItem(n) {
    var p = st.prisma;
    if (n === 11) return '<div class="fila2"><label class="campo" for="previo">¿Se reutilizó una estrategia previa?<select id="previo" data-path="prisma.previo" data-rerender="1"><option value=""' + (!p.previo ? ' selected' : '') + '>Sin indicar</option><option value="no"' + (p.previo === 'no' ? ' selected' : '') + '>No</option><option value="si"' + (p.previo === 'si' ? ' selected' : '') + '>Sí, adaptada</option></select></label>' +
      (p.previo === 'si' ? '<label class="campo" for="previo-cita">Cita de la revisión<input type="text" id="previo-cita" data-path="prisma.previoCita" data-upd="prisma" value="' + esc(p.previoCita || '') + '"></label>' : '') + '</div>';
    if (n === 12) return '<label class="campo" for="actualizacion">Método de actualización<input type="text" id="actualizacion" data-path="prisma.actualizacion" data-upd="prisma" value="' + esc(p.actualizacion || '') + '" placeholder="p. ej., se repetirán las búsquedas antes de la publicación; alerta semanal en PubMed"></label>';
    if (n === 14) return '<div class="fila2"><label class="campo" for="revision">Revisión de la estrategia<select id="revision" data-path="prisma.revision" data-rerender="1"><option value=""' + (!p.revision ? ' selected' : '') + '>Sin indicar</option><option value="press"' + (p.revision === 'press' ? ' selected' : '') + '>Por pares, con la guía PRESS 2015</option><option value="interna"' + (p.revision === 'interna' ? ' selected' : '') + '>Dentro del equipo, sin guía</option><option value="ninguna"' + (p.revision === 'ninguna' ? ' selected' : '') + '>No se revisó</option></select></label>' +
      '<label class="campo" for="revisor">Quién la revisó<input type="text" id="revisor" data-path="prisma.revisor" data-upd="prisma" value="' + esc(p.revisor || '') + '" placeholder="p. ej., documentalista de la biblioteca"></label></div>' +
      '<p class="grupo-t">Autorrevisión con los 6 elementos de PRESS 2015</p><div class="checks">' + D.PRESS.map(function (x) {
        return '<input type="checkbox" id="press-' + x.k + '" data-path="prisma.press.' + x.k + '" data-bool="1" data-upd="prisma"' + (p.press[x.k] ? ' checked' : '') + '><label for="press-' + x.k + '"><span><b>' + x.t + '</b><small>' + esc(x.d) + '</small></span></label>';
      }).join('') + '</div>';
    if (n === 13) {
      var fu = st.bases.concat(st.registros);
      if (!fu.length) return '';
      return '<div class="fila2">' + fu.map(function (id) {
        var nom = M.baseDe(id) ? M.etiquetaBase(id) : M.REGISTROS.filter(function (x) { return x.id === id; })[0].nombre;
        return '<label class="campo" for="fe13-' + id + '">' + esc(nom) + '<input type="date" id="fe13-' + id + '" data-path="resultados.' + id + '.fecha" data-upd="prisma" value="' + esc((st.resultados[id] || {}).fecha || '') + '"></label>';
      }).join('') + '</div>';
    }
    if (n === 15) {
      var filas = fuentesRecuento();
      if (!filas.length) return '';
      return '<table class="reg"><thead><tr><th>Fuente</th><th>Registros</th></tr></thead><tbody>' + filas.map(function (f) {
        return '<tr><td>' + esc(f.nombre) + '</td><td><input type="number" min="0" id="n15-' + f.id + '" data-path="resultados.' + f.id + '.n" data-upd="prisma" value="' + esc((st.resultados[f.id] || {}).n == null ? '' : st.resultados[f.id].n) + '" aria-label="Registros de ' + esc(f.nombre) + '"></td></tr>';
      }).join('') + '</tbody><tfoot><tr><td>Total</td><td class="num" id="total15">' + totalRegistros().toLocaleString('es-ES') + '</td></tr></tfoot></table>';
    }
    if (n === 16) return '<div class="fila2"><label class="campo" for="duplicados">Duplicados eliminados<input type="number" min="0" id="duplicados" data-path="prisma.duplicados" data-upd="prisma" value="' + esc(p.duplicados || '') + '"></label>' +
      '<label class="campo" for="software">Herramienta<select id="software" data-path="prisma.software" data-upd="prisma"><option value="">Sin indicar</option>' + SOFTWARE.map(function (s) { return '<option' + (p.software === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="campo" for="dedup-texto">Procedimiento<input type="text" id="dedup-texto" data-path="prisma.dedupTexto" data-upd="prisma" value="' + esc(p.dedupTexto || '') + '" placeholder="p. ej., deduplicación automática y revisión manual de los casos dudosos"></label>';
    return '';
  }
  function totalRegistros() {
    return fuentesRecuento().reduce(function (a, f) { var n = parseInt((st.resultados[f.id] || {}).n, 10); return a + (isNaN(n) ? 0 : n); }, 0);
  }

  /* ---------- Panel ---------- */
  function renderPanel() {
    var m = marcoAct(), act = M.conceptosActivos(st), f = st.filtros;
    var h = '<div class="card"><h3>Pregunta <span class="mono">' + m.nombre + '</span></h3><p class="pq">' + esc(pregunta()) + '</p></div>';
    h += '<div class="card"><h3>Estructura de la búsqueda</h3><div class="estructura">';
    if (!act.length) h += '<p class="help">Aún no hay conceptos con términos.</p>';
    act.forEach(function (c, idx) {
      if (idx) h += '<span class="op">AND</span>';
      var partes = [];
      VOCAB_KEYS.forEach(function (v) { if (c[v].length) partes.push('<span class="c">' + c[v].length + ' ' + M.VOCABS[v].nombre.replace(' Headings', '') + '</span>'); });
      partes.push('<span class="f">' + c.libres.length + ' libres</span>');
      h += '<div class="bloque-c"><span class="letra">' + c.k + '</span><b>' + esc(etiq(c)) + '</b><small>' + partes.join(' · ') + '</small></div>';
    });
    var ft = filtroTexto();
    if (act.length && ft) h += '<span class="op">AND</span><div class="bloque-c filtro"><span class="letra">F</span><b>' + esc(ft) + '</b><small>filtro de diseño</small></div>';
    var lim = [];
    if (f.desde || f.hasta) lim.push((f.desde || '…') + '–' + (f.hasta || 'hoy'));
    if ((f.idiomas || []).length) lim.push(f.idiomas.map(function (k) { return (M.IDIOMAS.filter(function (x) { return x.id === k; })[0] || {}).es; }).join(', '));
    if (f.animales) lim.push('sin estudios solo en animales');
    if (act.length && lim.length) h += '<span class="op">LÍMITES</span><div class="bloque-c filtro"><span class="letra">L</span><b>' + esc(lim.join(' · ')) + '</b><small>límites</small></div>';
    var fuera = st.conceptos.filter(function (c) { return !c.incluir; }).map(function (c) { return c.k + ' (' + etiq(c) + ')'; });
    if (fuera.length) h += '<p class="fuera-l">No se buscan: ' + esc(fuera.join(', ')) + '</p>';
    h += '</div>';
    if (st.bases.indexOf('pubmed') >= 0 && act.length) {
      var rp = M.estrategia(st, 'pubmed');
      h += '<div class="acciones"><button type="button" class="btn sm" data-act="copiar-pubmed">Copiar cadena de PubMed</button><a class="btn sm primary" href="' + esc(rp.url) + '" target="_blank" rel="noopener">Ejecutar en PubMed</a><span class="copiado" data-copiado="pubmed"></span></div>';
    }
    h += '</div>';
    var cs = comprobaciones();
    var etq = { bad: 'error', warn: 'aviso', info: 'nota', ok: 'bien' };
    h += '<div class="card"><h3>Comprobaciones <span class="mono">' + cs.filter(function (c) { return c.sev === 'bad' || c.sev === 'warn'; }).length + ' por revisar</span></h3><ul class="comprob">' +
      cs.map(function (c) { return '<li><span class="sev ' + c.sev + '">' + etq[c.sev] + '</span><span>' + esc(c.txt) + '</span></li>'; }).join('') + '</ul></div>';
    var pf = prismaFinal(), cnt = { ok: 0, na: 0, pend: 0 }, barra = '';
    for (var n = 1; n <= 16; n++) { cnt[pf[n].e]++; barra += '<span class="' + pf[n].e + '" title="Ítem ' + n + ': ' + pf[n].e + '"></span>'; }
    h += '<div class="card"><h3>PRISMA-S <button type="button" class="linkbtn" data-act="ir" data-n="6">Ver lista</button></h3><div class="barra" aria-label="Estado de los 16 ítems">' + barra + '</div>' +
      '<div class="leyenda"><span>' + cnt.ok + ' cumplen</span><span>' + cnt.na + ' no aplican</span><span>' + cnt.pend + ' pendientes</span></div></div>';
    $('#panel').innerHTML = h;
    var malos = cs.filter(function (c) { return c.sev === 'bad' || c.sev === 'warn'; }).length;
    $('#minibar').innerHTML = '<span>Paso <b>' + st.paso + '/6</b> · ' + PASOS[st.paso - 1].t + '</span><span>' + malos + ' por revisar · PRISMA-S <b>' + (cnt.ok + cnt.na) + '/16</b></span>';
  }

  /* ---------- Render general ---------- */
  function renderPaso() {
    var fn = [null, paso1, paso2, paso3, paso4, paso5, paso6][st.paso];
    $('#paso').innerHTML = fn();
  }
  function renderTodo() { renderCasos(); renderNav(); renderPaso(); renderPanel(); }
  function refresca() { renderNav(); renderPanel(); guarda(); }

  /* Actualizaciones parciales sin perder el foco */
  function actualizaParcial(tipo) {
    if (tipo === 'pq') { var el = $('#pq-auto'); if (el) el.textContent = marcoAct().plantilla(st.comp); }
    if (tipo === 'prisma' || st.paso === 6) {
      var a = prismaAuto(), fin = prismaFinal();
      for (var n = 1; n <= 16; n++) {
        var pr = $('#prop-' + n); if (pr) pr.textContent = a[n].txt;
        var it = $('#item-' + n); if (it) it.setAttribute('data-e', fin[n].e);
        var sel = $('#est-' + n); if (sel && sel.options[0]) sel.options[0].textContent = 'Automático: ' + ({ ok: 'Cumple', na: 'No aplica', pend: 'Pendiente' })[a[n].e];
      }
      var t = $('#total15'); if (t) t.textContent = totalRegistros().toLocaleString('es-ES');
    }
  }

  function reemplazaConcepto(i) {
    var el = $('#concepto-' + i);
    if (!el) return;
    var tmp = document.createElement('div'); tmp.innerHTML = concepto(i);
    el.replaceWith(tmp.firstChild);
  }

  function marcaModificado() { st.dirty = true; }

  /* ---------- Exportación ---------- */
  function nombreFuente(id) {
    if (M.baseDe(id)) return M.etiquetaBase(id);
    var r = M.REGISTROS.filter(function (x) { return x.id === id; })[0];
    return r ? r.nombre : id;
  }
  function informeTexto() {
    var m = marcoAct(), L = [], pf = prismaFinal();
    L.push('ESTRATEGIA DE BÚSQUEDA');
    L.push('');
    L.push('Pregunta: ' + pregunta());
    L.push('Marco: ' + m.nombre);
    m.comps.forEach(function (c) { if ((st.comp[c.k] || '').trim()) L.push('  ' + c.k + ' · ' + c.nombre + ': ' + st.comp[c.k]); });
    L.push('');
    L.push('Conceptos buscados: ' + M.conceptosActivos(st).map(function (c) { return c.k + ' (' + etiq(c) + ')'; }).join(' AND '));
    var fuera = st.conceptos.filter(function (c) { return !c.incluir; }).map(function (c) { return c.k; });
    if (fuera.length) L.push('No buscados: ' + fuera.join(', '));
    L.push('');
    st.bases.forEach(function (id) {
      var r = M.estrategia(st, id), res = st.resultados[id] || {};
      L.push('== ' + M.etiquetaBase(id) + ' · fecha: ' + (res.fecha ? fechaES(res.fecha) : '[pendiente]') + ' · registros: ' + (res.n !== undefined && res.n !== '' ? res.n : '[pendiente]'));
      if (r.lineas) L.push(lineasTexto(r.lineas)); else L.push(r.unaLinea);
      L.push('');
    });
    if (st.registros.length) {
      L.push('== Registros de estudios');
      st.registros.forEach(function (id) { var rg = M.registro(st, id), res = st.resultados[id] || {}; L.push(nombreFuente(id) + ': ' + rg.texto + ' · fecha: ' + (res.fecha ? fechaES(res.fecha) : '[pendiente]') + ' · registros: ' + (res.n || '[pendiente]')); });
      L.push('');
    }
    L.push('LISTA DE COMPROBACIÓN PRISMA-S (Rethlefsen et al., 2021)');
    var et = { ok: 'Cumple', na: 'No aplica', pend: 'Pendiente' };
    D.PRISMA_S.forEach(function (sec) {
      L.push(''); L.push(sec.sec.toUpperCase());
      sec.items.forEach(function (it) { L.push(it.n + '. ' + it.t + ' [' + et[pf[it.n].e] + ']: ' + pf[it.n].txt); });
    });
    return L.join('\n');
  }
  function texEsc(s) {
    return String(s || '').replace(/\\/g, '\\textbackslash{}').replace(/([&%$#_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
  }
  function latex() {
    var m = marcoAct(), pf = prismaFinal(), L = [];
    var lst = '\\begin{lstlisting}[breaklines=true,basicstyle=\\ttfamily\\small,columns=fullflexible]';
    L.push('% Anexo generado con el Buscador de evidencia (ETS, EPC-UCLM)');
    L.push('% Requiere \\usepackage{listings}. Con pdfLaTeX, los acentos dentro de lstlisting');
    L.push('% necesitan la opción literate de listings; con LuaLaTeX o XeLaTeX no hace falta.');
    L.push('\\section*{Anexo. Estrategia de búsqueda}');
    L.push('\\subsection*{Pregunta de investigación}');
    L.push(texEsc(pregunta()));
    L.push('\\begin{description}');
    m.comps.forEach(function (c) { if ((st.comp[c.k] || '').trim()) L.push('  \\item[' + c.k + ' · ' + texEsc(c.nombre) + '] ' + texEsc(st.comp[c.k])); });
    L.push('\\end{description}');
    L.push('Conceptos buscados: ' + texEsc(M.conceptosActivos(st).map(function (c) { return c.k + ' (' + etiq(c) + ')'; }).join(' AND ')) + '.');
    st.bases.forEach(function (id) {
      var r = M.estrategia(st, id), res = st.resultados[id] || {};
      L.push('');
      L.push('\\subsection*{' + texEsc(M.etiquetaBase(id)) + '}');
      L.push('Fecha de búsqueda: ' + (res.fecha ? fechaES(res.fecha) : '[pendiente]') + '. Registros: ' + (res.n !== undefined && res.n !== '' ? res.n : '[pendiente]') + '.');
      L.push(lst);
      L.push(r.lineas ? r.lineas.map(function (l) { return l.n + '  ' + l.txt; }).join('\n') : r.unaLinea);
      L.push('\\end{lstlisting}');
    });
    if (st.registros.length) {
      L.push('\\subsection*{Registros de estudios}');
      L.push('\\begin{itemize}');
      st.registros.forEach(function (id) { var rg = M.registro(st, id), res = st.resultados[id] || {}; L.push('  \\item ' + texEsc(nombreFuente(id) + ': ' + rg.texto + '. Fecha: ' + (res.fecha ? fechaES(res.fecha) : '[pendiente]') + '. Registros: ' + (res.n || '[pendiente]') + '.')); });
      L.push('\\end{itemize}');
    }
    L.push('');
    L.push('\\subsection*{Lista de comprobación PRISMA-S}');
    L.push('Ítems de Rethlefsen et al. (2021), traducción propia.');
    var et = { ok: 'Cumple', na: 'No aplica', pend: 'Pendiente' };
    D.PRISMA_S.forEach(function (sec) {
      L.push('\\paragraph{' + texEsc(sec.sec) + '}');
      L.push('\\begin{description}');
      sec.items.forEach(function (it) { L.push('  \\item[' + it.n + '. ' + texEsc(it.t) + '] (' + et[pf[it.n].e] + ') ' + texEsc(pf[it.n].txt)); });
      L.push('\\end{description}');
    });
    return L.join('\n');
  }
  function proyectoJSON() { var o = clone(st); delete o.dirty; return JSON.stringify(o, null, 2); }

  function copiar(texto, marca) {
    var aviso = $$('[data-copiado="' + marca + '"]');
    function ok() { aviso.forEach(function (a) { a.textContent = 'Copiado'; setTimeout(function () { a.textContent = ''; }, 2500); }); }
    function manual() {
      var l = $('#copia-manual-l'), t = $('#copia-manual');
      if (l && t) { l.hidden = false; t.value = texto; t.focus(); t.select(); }
      else aviso.forEach(function (a) { a.textContent = 'No se pudo copiar: selecciona el texto a mano.'; });
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, manual);
      else manual();
    } catch (e) { manual(); }
  }

  function importa(texto) {
    var msg = $('#import-msg');
    try {
      var o = JSON.parse(texto);
      if (!o || typeof o !== 'object' || !o.marco || !Array.isArray(o.conceptos)) throw new Error('falta el marco o los conceptos');
      st = normaliza(o); st.caso = null; st.paso = 1; ui.tab = null;
      renderTodo(); guarda();
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (msg) { msg.style.color = 'var(--bad)'; msg.textContent = 'No es un proyecto válido (' + e.message + ').'; }
    }
  }

  /* ---------- Eventos ---------- */
  function onInput(e) {
    var el = e.target, path = el.getAttribute('data-path');
    if (!path) return;
    var v = el.getAttribute('data-bool') ? el.checked : el.value;
    setPath(st, path, v);
    marcaModificado();
    if (el.getAttribute('data-rerender') && e.type === 'change') { var y = window.scrollY; renderPaso(); window.scrollTo(0, y); }
    else actualizaParcial(el.getAttribute('data-upd'));
    if (/^conceptos\.\d+\.etiqueta$/.test(path)) { /* el panel muestra la etiqueta */ }
    refresca();
  }

  function onChange(e) {
    var el = e.target;
    if (el.name === 'marco') {
      st.marco = el.value; st = normaliza(st); marcaModificado(); renderPaso(); refresca(); return;
    }
    if (el.name === 'diseno') {
      st.filtros.diseno = el.value; marcaModificado(); var y = window.scrollY; renderPaso(); window.scrollTo(0, y); refresca(); return;
    }
    if (el.id === 'importar-archivo' && el.files && el.files[0]) {
      var fr = new FileReader();
      fr.onload = function () { importa(String(fr.result)); };
      fr.readAsText(el.files[0]);
      return;
    }
    var list = el.getAttribute('data-list');
    if (list) {
      var arr = (getPath(st, list) || []).slice();
      var i = arr.indexOf(el.value);
      if (el.checked && i < 0) arr.push(el.value);
      if (!el.checked && i >= 0) arr.splice(i, 1);
      if (list === 'bases') arr = M.BASES.map(function (b) { return b.id; }).filter(function (id) { return arr.indexOf(id) >= 0; });
      setPath(st, list, arr);
      marcaModificado();
      if (list === 'bases') { var y2 = window.scrollY; renderPaso(); window.scrollTo(0, y2); }
      refresca();
      return;
    }
    if (el.getAttribute('data-act') === 'incluir') {
      var k = +el.getAttribute('data-i');
      st.conceptos[k].incluir = el.checked; marcaModificado(); reemplazaConcepto(k); refresca(); return;
    }
    if (el.getAttribute('data-path')) onInput(e);
  }

  function partirTerminos(txt) {
    return txt.split(/[\n;]+/).map(function (s) { return M.limpia(s); }).filter(Boolean);
  }
  function anadeLibres(i) {
    var ta = $('#libre-' + i); if (!ta) return;
    var c = st.conceptos[i], nuevos = partirTerminos(ta.value);
    nuevos.forEach(function (t) { if (c.libres.map(function (x) { return x.toLowerCase(); }).indexOf(t.toLowerCase()) < 0) c.libres.push(t); });
    marcaModificado(); reemplazaConcepto(i); refresca();
    var nt = $('#libre-' + i); if (nt) nt.focus();
  }
  function anadeCtrl(i, v) {
    var inp = $('#add-' + v + '-' + i); if (!inp) return;
    var t = M.limpia(inp.value); if (!t) return;
    var c = st.conceptos[i];
    if (!c[v].some(function (x) { return x.t.toLowerCase() === t.toLowerCase(); })) c[v].push({ t: t, exp: true, ok: false });
    marcaModificado(); reemplazaConcepto(i); refresca();
    var ni = $('#add-' + v + '-' + i); if (ni) ni.focus();
  }

  function onClick(e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    var act = b.getAttribute('data-act'), i = +b.getAttribute('data-i'), v = b.getAttribute('data-v'), j = +b.getAttribute('data-j');
    switch (act) {
      case 'caso': {
        var id = b.getAttribute('data-id');
        if (st.dirty && ui.confirmar !== id) { ui.confirmar = id; renderCasos(); setTimeout(function () { if (ui.confirmar === id) { ui.confirmar = null; renderCasos(); } }, 4000); return; }
        ui.confirmar = null; ui.tab = null;
        if (id === 'nuevo') { st = normaliza(vacio()); st.caso = null; st.dirty = false; }
        else st = cargaCaso(id);
        renderTodo(); guarda();
        return;
      }
      case 'ir': st.paso = +b.getAttribute('data-n'); renderNav(); renderPaso(); renderPanel(); guarda(); $('#pasos-nav').scrollIntoView({ block: 'start' }); return;
      case 'tab': ui.tab = b.getAttribute('data-id'); renderPaso(); return;
      case 'add-l': anadeLibres(i); return;
      case 'add-c': anadeCtrl(i, v); return;
      case 'del-l': st.conceptos[i].libres.splice(j, 1); marcaModificado(); reemplazaConcepto(i); refresca(); return;
      case 'vaciar-l': st.conceptos[i].libres = []; marcaModificado(); reemplazaConcepto(i); refresca(); return;
      case 'del-c': st.conceptos[i][v].splice(j, 1); marcaModificado(); reemplazaConcepto(i); refresca(); return;
      case 'exp': { var t = st.conceptos[i][v][j]; t.exp = t.exp === false; marcaModificado(); reemplazaConcepto(i); refresca(); return; }
      case 'ok': { var t2 = st.conceptos[i][v][j]; t2.ok = !t2.ok; marcaModificado(); reemplazaConcepto(i); refresca(); return; }
      case 'hoy': {
        var idh = b.getAttribute('data-id'); setPath(st, 'resultados.' + idh + '.fecha', hoy());
        var inpF = $('#fe-' + idh); if (inpF) inpF.value = hoy();
        marcaModificado(); refresca(); return;
      }
      case 'copiar': {
        var que = b.getAttribute('data-que');
        if (que === 'lineas' || que === 'una') {
          var r = M.estrategia(st, ui.tab);
          copiar(que === 'lineas' ? lineasTexto(r.lineas || []) : r.unaLinea, que);
        } else if (que === 'informe') copiar(informeTexto(), 'export');
        else if (que === 'latex') copiar(latex(), 'export');
        else if (que === 'json') copiar(proyectoJSON(), 'export');
        return;
      }
      case 'copiar-pubmed': copiar(M.estrategia(st, 'pubmed').unaLinea, 'pubmed'); return;
      case 'importar': { var ta = $('#importar-texto'); if (ta && ta.value.trim()) importa(ta.value); return; }
    }
  }

  function onKey(e) {
    var el = e.target, en = el.getAttribute && el.getAttribute('data-enter');
    if (!en || e.key !== 'Enter') return;
    if (en === 'add-l' && e.shiftKey) return; /* Mayús+Intro: nueva línea */
    e.preventDefault();
    if (en === 'add-l') anadeLibres(+el.getAttribute('data-i'));
    if (en === 'add-c') anadeCtrl(+el.getAttribute('data-i'), el.getAttribute('data-v'));
  }

  /* ---------- Arranque ---------- */
  st = carga() || cargaCaso('ic');
  document.addEventListener('input', function (e) { if (e.target.closest('#paso') && e.target.type !== 'checkbox' && e.target.type !== 'radio' && e.target.tagName !== 'SELECT' && e.target.type !== 'file') onInput(e); });
  document.addEventListener('change', function (e) { if (e.target.closest('#paso')) onChange(e); });
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  renderTodo();
  var aviso = $('#aviso-carga'); if (aviso) aviso.hidden = true;

  window.__buscador = { estado: function () { return st; }, informe: informeTexto, latex: latex };
})();
