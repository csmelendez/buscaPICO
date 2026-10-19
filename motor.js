/* Buscador de evidencia PICO · motor de traducción
   Convierte la estructura de conceptos (vocabulario controlado + texto libre)
   en la sintaxis de cada plataforma. Sin dependencias. */
(function () {
  'use strict';

  /* ---------- Fuentes ---------- */
  var BASES = [
    { id: 'pubmed', base: 'MEDLINE', plat: 'PubMed', vocab: 'mesh', grupo: 'Bases biomédicas generales',
      desc: 'Acceso libre (NLM). Indexada con MeSH.', lineas: '#' },
    { id: 'ovidmedline', base: 'MEDLINE', plat: 'Ovid', vocab: 'mesh', grupo: 'Bases biomédicas generales',
      desc: 'Suscripción. Búsqueda línea a línea con adyacencia.', lineas: '' },
    { id: 'embase', base: 'Embase', plat: 'Embase.com', vocab: 'emtree', grupo: 'Bases biomédicas generales',
      desc: 'Suscripción (Elsevier). Indexada con Emtree; buena cobertura de productos sanitarios y congresos.', lineas: '#' },
    { id: 'ovidembase', base: 'Embase', plat: 'Ovid', vocab: 'emtree', grupo: 'Bases biomédicas generales',
      desc: 'Suscripción. Emtree con sintaxis Ovid.', lineas: '' },
    { id: 'central', base: 'CENTRAL', plat: 'Cochrane Library', vocab: 'mesh', grupo: 'Bases biomédicas generales',
      desc: 'Registro Cochrane de ensayos controlados. MeSH y texto libre.', lineas: '#' },
    { id: 'cinahl', base: 'CINAHL', plat: 'EBSCOhost', vocab: 'cinahl', grupo: 'Bases especializadas y regionales',
      desc: 'Enfermería y profesiones sanitarias. Encabezamientos propios (CINAHL Headings).', lineas: 'S' },
    { id: 'bvs', base: 'LILACS / IBECS', plat: 'Portal BVS', vocab: 'decs', grupo: 'Bases especializadas y regionales',
      desc: 'Literatura iberoamericana y española. Descriptores DeCS (trilingües).', lineas: null },
    { id: 'scopus', base: 'Scopus', plat: 'Elsevier', vocab: null, grupo: 'Multidisciplinares y de citas',
      desc: 'Suscripción. Sin tesauro propio en la búsqueda: solo texto libre.', lineas: null },
    { id: 'wos', base: 'Web of Science Core Collection', plat: 'Clarivate', vocab: null, grupo: 'Multidisciplinares y de citas',
      desc: 'Suscripción (FECYT en España). Solo texto libre.', lineas: '#' },
    { id: 'epistemonikos', base: 'Epistemonikos', plat: 'Epistemonikos', vocab: null, grupo: 'Revisiones e informes de ETS',
      desc: 'Revisiones sistemáticas y sus estudios primarios. Acceso libre.', lineas: null,
      url: 'https://www.epistemonikos.org/' },
    { id: 'inahta', base: 'HTA Database', plat: 'INAHTA', vocab: null, grupo: 'Revisiones e informes de ETS',
      desc: 'Informes de agencias de ETS. Interfaz sencilla: use pocos términos.', lineas: null,
      url: 'https://database.inahta.org/' }
  ];

  var REGISTROS = [
    { id: 'ctgov', nombre: 'ClinicalTrials.gov', desc: 'Registro de EE. UU. (NLM). Admite búsqueda por condición e intervención.' },
    { id: 'ictrp', nombre: 'WHO ICTRP', desc: 'Portal de la OMS que agrega registros nacionales y regionales.', url: 'https://trialsearch.who.int/' },
    { id: 'ctis', nombre: 'EU Clinical Trials (CTIS)', desc: 'Ensayos autorizados en la UE desde el Reglamento (UE) 536/2014.', url: 'https://euclinicaltrials.eu/' }
  ];

  var VOCABS = {
    mesh: { nombre: 'MeSH', largo: 'Medical Subject Headings (NLM)', url: function (t) { return 'https://www.ncbi.nlm.nih.gov/mesh/?term=' + encodeURIComponent(t); } },
    emtree: { nombre: 'Emtree', largo: 'Tesauro de Embase (requiere suscripción)', url: function () { return 'https://www.embase.com/'; } },
    cinahl: { nombre: 'CINAHL Headings', largo: 'Encabezamientos de CINAHL (en EBSCOhost)', url: null },
    decs: { nombre: 'DeCS', largo: 'Descriptores en Ciencias de la Salud (BIREME)', url: function () { return 'https://decs.bvsalud.org/es/'; } }
  };

  var IDIOMAS = [
    { id: 'en', es: 'inglés', en: 'English' }, { id: 'es', es: 'español', en: 'Spanish' },
    { id: 'fr', es: 'francés', en: 'French' }, { id: 'de', es: 'alemán', en: 'German' },
    { id: 'pt', es: 'portugués', en: 'Portuguese' }, { id: 'it', es: 'italiano', en: 'Italian' }
  ];

  /* Filtro Cochrane de ECA, versión de máxima sensibilidad (revisión de 2008) */
  var HSSS = {
    cita: 'Cochrane Highly Sensitive Search Strategy for identifying randomized trials in MEDLINE: sensitivity-maximizing version (2008 revision). Lefebvre C et al. Technical Supplement to Chapter 4, Cochrane Handbook v6.5 (2024).',
    pubmed: ['randomized controlled trial[pt]', 'controlled clinical trial[pt]', 'randomized[tiab]', 'placebo[tiab]',
      'drug therapy[sh]', 'randomly[tiab]', 'trial[tiab]', 'groups[tiab]'],
    ovid: ['randomized controlled trial.pt.', 'controlled clinical trial.pt.', 'randomized.ab.', 'placebo.ab.',
      'drug therapy.fs.', 'randomly.ab.', 'trial.ab.', 'groups.ab.']
  };

  /* ---------- Términos ---------- */
  function limpia(s) {
    return String(s || '').replace(/[“”"'‘’]/g, '').replace(/\s+/g, ' ').trim();
  }

  function parseTerm(raw) {
    var s = limpia(raw);
    var m = s.match(/^(\S+)\s+NEAR\/(\d+)\s+(\S+)$/i);
    if (m) return { tipo: 'prox', a: m[1], b: m[3], n: parseInt(m[2], 10), t: s, trunc: s.indexOf('*') >= 0 };
    return { tipo: s.indexOf(' ') >= 0 ? 'frase' : 'palabra', t: s, trunc: s.indexOf('*') >= 0 };
  }

  function avisosTermino(raw) {
    var p = parseTerm(raw), out = [];
    if (!p.t) return out;
    if (/\bNEAR\b/i.test(p.t) && p.tipo !== 'prox')
      out.push('«' + p.t + '»: la proximidad se escribe con dos palabras sueltas, p. ej. heart NEAR/3 failure.');
    p.t.split(/\s+/).forEach(function (w) {
      var i = w.indexOf('*');
      if (i >= 0 && i < 3 && !/^NEAR/i.test(w)) out.push('«' + w + '»: la raíz truncada tiene menos de 3 letras y recuperará demasiado ruido (algunas plataformas la rechazan).');
    });
    if (p.t.indexOf('?') >= 0) out.push('«' + p.t + '»: el comodín ? no significa lo mismo en todas las plataformas; compruébelo en cada una.');
    if (/\b(AND|OR|NOT)\b/.test(p.t)) out.push('«' + p.t + '»: no incluya operadores dentro de un término; añada cada sinónimo por separado.');
    return out;
  }

  function fmtLibre(raw, id) {
    var p = parseTerm(raw);
    if (!p.t) return null;
    var aviso = null, s;
    switch (id) {
      case 'pubmed':
        if (p.tipo === 'prox') s = '"' + p.a + ' ' + p.b + '"';
        else s = p.tipo === 'frase' ? '"' + p.t + '"' : p.t;
        break;
      case 'ovidmedline': case 'ovidembase':
        s = p.tipo === 'prox' ? p.a + ' adj' + (p.n + 1) + ' ' + p.b : p.t;
        break;
      case 'embase':
        s = p.tipo === 'prox' ? p.a + ' NEAR/' + p.n + ' ' + p.b : (p.tipo === 'frase' ? "'" + p.t + "'" : p.t);
        break;
      case 'central':
        if (p.tipo === 'prox') s = p.a + ' NEAR/' + p.n + ' ' + p.b;
        else if (p.tipo === 'frase') s = p.trunc ? p.t.split(' ').join(' NEXT ') : '"' + p.t + '"';
        else s = p.t;
        break;
      case 'scopus':
        s = p.tipo === 'prox' ? p.a + ' W/' + p.n + ' ' + p.b : (p.tipo === 'frase' ? '"' + p.t + '"' : p.t);
        break;
      case 'wos':
        s = p.tipo === 'prox' ? p.a + ' NEAR/' + p.n + ' ' + p.b : (p.tipo === 'frase' ? '"' + p.t + '"' : p.t);
        break;
      case 'cinahl':
        s = p.tipo === 'prox' ? p.a + ' N' + p.n + ' ' + p.b : (p.tipo === 'frase' ? '"' + p.t + '"' : p.t);
        break;
      case 'bvs':
        var t = p.t.replace(/\*/g, '$');
        if (p.tipo === 'prox') { s = '(' + p.a.replace(/\*/g, '$') + ' AND ' + p.b.replace(/\*/g, '$') + ')'; aviso = 'prox'; }
        else s = p.tipo === 'frase' ? '"' + t + '"' : t;
        break;
      default: /* epistemonikos, inahta */
        if (p.tipo === 'prox') { s = '(' + p.a + ' AND ' + p.b + ')'; aviso = 'prox'; }
        else s = p.tipo === 'frase' ? '"' + p.t + '"' : p.t;
    }
    return { s: s, p: p, aviso: aviso };
  }

  function grupoLibre(libres, id, campo) {
    var avisos = [], items = [];
    (libres || []).forEach(function (raw) {
      var f = fmtLibre(raw, id);
      if (!f) return;
      if (f.aviso === 'prox') avisos.push('prox');
      if (id === 'pubmed') {
        var tag = campo === 'ti' ? 'ti' : 'tiab';
        if (f.p.tipo === 'prox') { items.push(f.s + '[' + tag + ':~' + f.p.n + ']'); if (f.p.trunc) avisos.push('pubmedprox'); }
        else items.push(f.s + '[' + tag + ']');
      } else items.push(f.s);
    });
    if (!items.length) return { s: null, avisos: avisos };
    var or = (id === 'ovidmedline' || id === 'ovidembase') ? ' or ' : ' OR ';
    var g = items.join(or), s;
    var ti = campo === 'ti';
    switch (id) {
      case 'pubmed': s = items.length > 1 ? '(' + g + ')' : g; break;
      case 'ovidmedline': s = '(' + g + ').' + (ti ? 'ti' : 'ti,ab,kf') + '.'; break;
      case 'ovidembase': s = '(' + g + ').' + (ti ? 'ti' : 'ti,ab,kw') + '.'; break;
      case 'embase': case 'central': s = '(' + g + '):' + (ti ? 'ti' : 'ti,ab,kw'); break;
      case 'scopus': s = (ti ? 'TITLE(' : 'TITLE-ABS-KEY(') + g + ')'; break;
      case 'wos': s = (ti ? 'TI=(' : 'TS=(') + g + ')'; break;
      case 'cinahl': s = ti ? 'TI (' + g + ')' : 'TI (' + g + ') OR AB (' + g + ')'; break;
      case 'bvs': s = (ti ? 'ti:(' : 'tw:(') + g + ')'; break;
      default: s = '(' + g + ')';
    }
    return { s: s, avisos: avisos };
  }

  function fmtControlado(term, id) {
    var t = limpia(term.t), exp = term.exp !== false;
    if (!t) return null;
    switch (id) {
      case 'pubmed': return '"' + t + '"[Mesh' + (exp ? '' : ':NoExp') + ']';
      case 'ovidmedline': case 'ovidembase': return (exp ? 'exp ' : '') + t + '/';
      case 'central': return '[mh ' + (exp ? '' : '^') + '"' + t + '"]';
      case 'embase': return "'" + t + "'/" + (exp ? 'exp' : 'de');
      case 'cinahl': return '(MH "' + t + (exp ? '+' : '') + '")';
      case 'bvs': return 'mh:"' + t + '"';
      default: return null;
    }
  }

  /* Rodea de paréntesis salvo que la expresión ya esté entera entre un par exterior */
  function envuelve(s) {
    if (s.charAt(0) === '(') {
      var d = 0;
      for (var i = 0; i < s.length; i++) {
        if (s[i] === '(') d++;
        else if (s[i] === ')') { d--; if (d === 0 && i < s.length - 1) return '(' + s + ')'; }
      }
      if (d === 0) return s;
    }
    return '(' + s + ')';
  }

  function baseDe(id) { for (var i = 0; i < BASES.length; i++) if (BASES[i].id === id) return BASES[i]; return null; }
  function etiquetaBase(id) { var b = baseDe(id); return b ? b.base + ' (' + b.plat + ')' : id; }

  function conceptosActivos(st) {
    return (st.conceptos || []).filter(function (c) {
      return c.incluir && ((c.libres && c.libres.length) || (c.mesh && c.mesh.length) || (c.emtree && c.emtree.length) || (c.cinahl && c.cinahl.length) || (c.decs && c.decs.length));
    });
  }

  function anioActual() { return new Date().getFullYear(); }

  /* ---------- Estrategia completa para una base ---------- */
  function estrategia(st, id) {
    var b = baseDe(id);
    var res = { id: id, base: b, lineas: null, unaLinea: '', avisos: [], notas: [], url: null };
    var conc = conceptosActivos(st);
    if (!conc.length) { res.avisos.push('No hay conceptos incluidos con términos.'); return res; }

    var ovid = id === 'ovidmedline' || id === 'ovidembase';
    var lineMode = b.lineas !== null;
    var L = [];
    function push(txt) { L.push(txt); return L.length; }
    function ref(n) { return (b.lineas || '') + n; }
    function orRef(ns) {
      if (ovid) {
        var contiguo = ns.every(function (n, i) { return i === 0 || n === ns[i - 1] + 1; });
        return contiguo && ns.length > 2 ? 'or/' + ns[0] + '-' + ns[ns.length - 1] : ns.join(' or ');
      }
      return ns.map(ref).join(' OR ');
    }
    function andRef(ns) { return ovid ? ns.join(' and ') : ns.map(ref).join(' AND '); }
    function notRef(a, c) { return ovid ? a + ' not ' + c : ref(a) + ' NOT ' + ref(c); }
    var OR = ovid ? ' or ' : ' OR ', AND = ovid ? ' and ' : ' AND ';

    var conceptLines = [], singles = [], sinVocab = [], proxAviso = false, pubProx = false;
    conc.forEach(function (c) {
      var vt = [];
      if (b.vocab) {
        (c[b.vocab] || []).forEach(function (t) { var f = fmtControlado(t, id); if (f) vt.push(f); });
        if (!vt.length) sinVocab.push(c.etiqueta || c.k);
      }
      var g = grupoLibre(c.libres, id, st.campo);
      if (g.avisos.indexOf('prox') >= 0) proxAviso = true;
      if (g.avisos.indexOf('pubmedprox') >= 0) pubProx = true;
      var partes = vt.slice(); if (g.s) partes.push(g.s);
      if (!partes.length) return;
      if (lineMode) {
        var ns = partes.map(function (p) { return push(p); });
        conceptLines.push(ns.length > 1 ? push(orRef(ns)) : ns[0]);
      }
      singles.push(envuelve(partes.length > 1 ? partes.join(OR) : partes[0]));
    });

    if (sinVocab.length && b.vocab) {
      res.avisos.push('Sin términos ' + VOCABS[b.vocab].nombre + ' en: ' + sinVocab.join(', ') + '. En esta base solo se buscará por texto libre' +
        (b.vocab === 'emtree' ? ' (no traslade el MeSH sin comprobarlo: Emtree usa otros encabezamientos).' : '.'));
    }
    if (proxAviso) res.avisos.push('Esta plataforma no admite proximidad con la misma sintaxis: los términos con NEAR se han convertido en «A AND B», que es menos preciso.');
    if (pubProx) res.avisos.push('Hay truncamiento dentro de una búsqueda por proximidad. PubMed puede no aceptarlo: compruebe el resultado en «Details» del historial.');

    var final = lineMode ? (conceptLines.length > 1 ? push(andRef(conceptLines)) : conceptLines[0]) : null;
    var una = singles.join(AND);

    /* Filtros de diseño */
    var f = st.filtros || {};
    var animalesHechos = false;
    if (f.diseno === 'eca') {
      if (id === 'pubmed' || id === 'ovidmedline') {
        var src = id === 'pubmed' ? HSSS.pubmed : HSSS.ovid;
        var hs = src.map(function (x) { return push(x); });
        var orf = push(orRef(hs));
        var an = push(id === 'pubmed' ? 'animals[mh] NOT humans[mh]' : 'exp animals/ not humans.sh.');
        var filt = push(notRef(orf, an));
        final = push(andRef([final, filt]));
        una = envuelve(una) + AND + '((' + src.join(OR) + ')' + (id === 'pubmed' ? ' NOT (animals[mh] NOT humans[mh]))' : ' not (exp animals/ not humans.sh.))');
        animalesHechos = true;
        res.notas.push('Filtro de ECA: ' + HSSS.cita);
      } else if (id === 'central') {
        res.notas.push('CENTRAL ya es un registro de ensayos controlados: no necesita filtro de ECA.');
      } else {
        res.notas.push('No se incluye aquí un filtro de ECA validado para esta plataforma. Consulte la sección 3.6 del suplemento técnico del capítulo 4 del Manual Cochrane o el ISSG Search Filters Resource, y cite el filtro que use.');
      }
    } else if (f.diseno === 'rs') {
      if (id === 'pubmed') {
        final = push(ref(final) + ' AND systematic[sb]');
        una = '(' + una + ') AND systematic[sb]';
        res.notas.push('Filtro de revisiones sistemáticas: subconjunto «systematic[sb]» de PubMed (NLM).');
      } else if (id === 'epistemonikos') {
        res.notas.push('En Epistemonikos limite el tipo de documento a revisiones sistemáticas con los filtros de la interfaz.');
      } else {
        res.notas.push('No se incluye un filtro de revisiones sistemáticas para esta plataforma. Use uno publicado (ISSG Search Filters Resource) y cítelo.');
      }
    } else if (f.diseno === 'otro' && f.otroNombre) {
      if (id === 'pubmed' && limpia(f.otroPubmed)) {
        var lf = push(f.otroPubmed.trim());
        final = push(andRef([final, lf]));
        una = '(' + una + ') AND (' + f.otroPubmed.trim() + ')';
      }
      res.notas.push('Filtro publicado: ' + f.otroNombre + (f.otroCita ? ' (' + f.otroCita + ')' : '') +
        (id === 'pubmed' && limpia(f.otroPubmed) ? '.' : '. Añada la versión de este filtro para esta plataforma si existe.'));
    }

    /* Exclusión de estudios solo en animales */
    if (f.animales && !animalesHechos) {
      var aLine = null, aUna = null;
      if (id === 'pubmed') { aLine = 'animals[mh] NOT humans[mh]'; aUna = ' NOT (animals[mh] NOT humans[mh])'; }
      else if (id === 'ovidmedline') { aLine = 'exp animals/ not humans.sh.'; aUna = ' not (exp animals/ not humans.sh.)'; }
      else if (id === 'ovidembase') { aLine = '(exp animal/ or nonhuman/) not exp human/'; aUna = ' not ((exp animal/ or nonhuman/) not exp human/)'; }
      else if (id === 'embase') { aLine = '[animals]/lim NOT [humans]/lim'; aUna = ' NOT ([animals]/lim NOT [humans]/lim)'; }
      if (aLine) {
        var al = push(aLine);
        final = push(notRef(final, al));
        una = envuelve(una) + aUna;
      } else if (id !== 'central') {
        res.notas.push('La exclusión de estudios en animales no tiene sintaxis estándar aquí: use el limitador de la interfaz si existe, o descarte en el cribado.');
      }
    }

    /* Límites */
    var y1 = parseInt(f.desde, 10), y2 = parseInt(f.hasta, 10);
    var hayFecha = !isNaN(y1) || !isNaN(y2);
    if (hayFecha) {
      if (isNaN(y1)) y1 = 1900;
      if (isNaN(y2)) y2 = anioActual();
    }
    var idi = (f.idiomas || []).map(function (k) { for (var i = 0; i < IDIOMAS.length; i++) if (IDIOMAS[i].id === k) return IDIOMAS[i]; return null; }).filter(Boolean);
    var interfaz = [];
    if (hayFecha) {
      var fl = null, fu = null;
      switch (id) {
        case 'pubmed': fl = ref(final) + ' AND ' + y1 + ':' + y2 + '[dp]'; fu = ' AND ' + y1 + ':' + y2 + '[dp]'; break;
        case 'ovidmedline': case 'ovidembase': fl = 'limit ' + final + ' to yr="' + y1 + '-' + y2 + '"'; fu = null; break;
        case 'embase': fl = ref(final) + ' AND [' + y1 + '-' + y2 + ']/py'; fu = ' AND [' + y1 + '-' + y2 + ']/py'; break;
        case 'scopus': fu = ' AND PUBYEAR > ' + (y1 - 1) + ' AND PUBYEAR < ' + (y2 + 1); break;
        case 'wos': fl = ref(final) + ' AND PY=(' + y1 + '-' + y2 + ')'; fu = ' AND PY=(' + y1 + '-' + y2 + ')'; break;
        default: interfaz.push('fecha ' + y1 + '–' + y2);
      }
      if (fl && lineMode) final = push(fl);
      if (fu) una = envuelve(una) + fu;
      if (ovid) res.notas.push('En Ovid, el límite de años se aplica con «limit» sobre la última línea; la versión en una línea no lo incluye.');
    }
    if (idi.length) {
      var ll = null, lu = null;
      switch (id) {
        case 'pubmed': lu = ' AND (' + idi.map(function (x) { return x.en.toLowerCase() + '[la]'; }).join(' OR ') + ')'; ll = ref(final) + lu; break;
        case 'ovidmedline': case 'ovidembase': ll = 'limit ' + final + ' to (' + idi.map(function (x) { return x.en.toLowerCase(); }).join(' or ') + ')'; break;
        case 'embase': lu = ' AND (' + idi.map(function (x) { return '[' + x.en.toLowerCase() + ']/lim'; }).join(' OR ') + ')'; ll = ref(final) + lu; break;
        case 'scopus': lu = ' AND (' + idi.map(function (x) { return 'LIMIT-TO(LANGUAGE, "' + x.en + '")'; }).join(' OR ') + ')'; break;
        case 'wos': lu = ' AND LA=(' + idi.map(function (x) { return x.en; }).join(' OR ') + ')'; ll = ref(final) + lu; break;
        default: interfaz.push('idioma: ' + idi.map(function (x) { return x.es; }).join(', '));
      }
      if (ll && lineMode) final = push(ll);
      if (lu) una = envuelve(una) + lu;
    }
    if (interfaz.length) res.notas.push('Aplique con los limitadores de la interfaz (no se escriben en la cadena): ' + interfaz.join('; ') + '.');

    /* Notas por plataforma */
    switch (id) {
      case 'pubmed':
        res.notas.push('[Mesh] explota por defecto; [Mesh:NoExp] busca solo el descriptor. Al etiquetar el texto libre con [tiab] se desactiva el mapeo automático de términos.');
        res.url = 'https://pubmed.ncbi.nlm.nih.gov/?term=' + encodeURIComponent(una);
        break;
      case 'ovidmedline':
        res.notas.push('«exp Término/» explota el descriptor. .ti,ab,kf. busca en título, resumen y palabras clave del autor. adjN admite hasta N-1 palabras intermedias en cualquier orden.');
        break;
      case 'ovidembase':
        res.notas.push('Los encabezamientos Emtree van en minúsculas. .ti,ab,kw. busca en título, resumen y palabras clave del autor.');
        break;
      case 'embase':
        res.notas.push("/exp explota el término Emtree y /de lo busca sin explotar. Las frases van entre comillas simples y admiten truncamiento ('heart infarct*').");
        break;
      case 'central':
        res.notas.push('Escriba cada línea en el Search Manager. [mh "X"] explota el MeSH y [mh ^"X"] busca solo ese descriptor. Para truncar dentro de una frase se usa NEXT (nutrition* NEXT support).');
        break;
      case 'cinahl':
        res.notas.push('(MH "X+") explota el encabezamiento CINAHL. Los encabezamientos de CINAHL no coinciden siempre con el MeSH. Nn busca a N palabras en cualquier orden.');
        break;
      case 'scopus':
        res.notas.push('TITLE-ABS-KEY incluye título, resumen y palabras clave (también las de indización). W/n busca a n palabras en cualquier orden.');
        break;
      case 'wos':
        res.notas.push('TS= busca en título, resumen y palabras clave. Web of Science aplica lematización por defecto.');
        break;
      case 'bvs':
        res.notas.push('Sintaxis orientativa del buscador iAHx de la BVS: mh: para descriptores DeCS y tw: para palabras del título, resumen y descriptores. El truncamiento es $. Compruebe la cadena en la búsqueda avanzada antes de darla por buena.');
        res.url = 'https://pesquisa.bvsalud.org/';
        break;
      case 'epistemonikos':
        res.notas.push('Pegue la cadena en la búsqueda avanzada (título y resumen). Si el buscador no la interpreta bien, busque por concepto y combine manualmente.');
        res.url = b.url;
        break;
      case 'inahta':
        res.notas.push('La interfaz de INAHTA es sencilla: empiece por la intervención sola y añada la población solo si los resultados son demasiados.');
        res.url = b.url;
        break;
    }
    res.notas.push('Los operadores de proximidad no cuentan las palabras igual en todas las plataformas: revise la ayuda de cada una si la distancia es crítica.');

    res.unaLinea = una;
    if (lineMode) res.lineas = L.map(function (t, i) { return { n: ref(i + 1), txt: t }; });
    return res;
  }

  /* ---------- Registros ---------- */
  function terminoPrincipal(c) {
    if (!c) return '';
    var libres = (c.libres || []).map(parseTerm).filter(function (p) { return p.tipo !== 'prox' && !p.trunc && p.t; });
    if (libres.length) return libres[0].t;
    if (c.mesh && c.mesh[0]) return c.mesh[0].t;
    return c.etiqueta || '';
  }

  function registro(st, id) {
    var cs = st.conceptos || [];
    function porK(ks) { for (var i = 0; i < ks.length; i++) for (var j = 0; j < cs.length; j++) if (cs[j].k === ks[i]) return cs[j]; return null; }
    var cond = terminoPrincipal(porK(['TC', 'P', 'S']));
    var intr = terminoPrincipal(porK(['I', 'E', 'PI']));
    var r = { id: id, cond: cond, intr: intr, url: null, texto: '' };
    if (id === 'ctgov') {
      var q = [];
      if (cond) q.push('cond=' + encodeURIComponent(cond));
      if (intr) q.push('intr=' + encodeURIComponent(intr));
      r.url = 'https://clinicaltrials.gov/search' + (q.length ? '?' + q.join('&') : '');
      r.texto = 'Condición: ' + (cond || '—') + ' · Intervención: ' + (intr || '—');
    } else {
      var reg = null; for (var k = 0; k < REGISTROS.length; k++) if (REGISTROS[k].id === id) reg = REGISTROS[k];
      r.url = reg && reg.url;
      r.texto = [cond, intr].filter(Boolean).join(' AND ');
    }
    return r;
  }

  window.Motor = {
    BASES: BASES, REGISTROS: REGISTROS, VOCABS: VOCABS, IDIOMAS: IDIOMAS, HSSS: HSSS,
    parseTerm: parseTerm, avisosTermino: avisosTermino, fmtLibre: fmtLibre, fmtControlado: fmtControlado,
    estrategia: estrategia, registro: registro, baseDe: baseDe, etiquetaBase: etiquetaBase,
    conceptosActivos: conceptosActivos, limpia: limpia
  };
})();
