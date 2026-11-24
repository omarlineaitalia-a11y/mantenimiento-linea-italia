/* Misión Enfoque · ALMACENAMIENTO
 * Dos modos con la MISMA lógica de negocio:
 *   FIREBASE: si existe window.FIREBASE_CONFIG (../firebase-config.js de app-web) y la URL no trae ?demo.
 *   DEMO:     localStorage de este navegador (sin internet). Emula las reglas genéricas de app-web
 *             para que el arranque, los permisos y la bóveda se prueben igual que en Firebase.
 *
 * Datos (todo bajo apps/misionenfoque/ — funciona con las reglas EXISTENTES de app-web, sin reglas nuevas):
 *   config/personal   { p: { <usuario>: { n, r:'general'|'usuario', a, cargo, perm:{...} } } }
 *   config/boveda     { pub (RSA-OAEP SPKI base64), priv:{c,iv,sal,it} (llave privada cifrada con la contraseña de la general) }
 *   boveda/<usuario>  { c (contraseña cifrada con la llave pública), t }
 *   respuestas/<folio> { encuesta completa, capturadoPor, ts }
 * Correo interno de cada cuenta: <usuario>@mision-enfoque.app
 */
(function () {
  'use strict';
  var BASE = 'apps/misionenfoque';
  var DOMINIO = 'mision-enfoque.app';
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var PERMISOS = ['verEstadisticas', 'verNombres', 'descargarInformes', 'exportarExcel'];
  var PERM_TXT = { verEstadisticas: 'Ver estadísticas', verNombres: 'Ver nombres', descargarInformes: 'Descargar informes', exportarExcel: 'Exportar a Excel' };
  var BORRAR = { __borrar: true }, AHORA = { __ahora: true };
  var qs = new URLSearchParams(location.search);
  var cfg = window.FIREBASE_CONFIG;
  var cfgOk = !!(cfg && cfg.apiKey && cfg.projectId && !/TU_/.test(cfg.apiKey));
  var MODO = (qs.has('demo') || !cfgOk) ? 'demo' : 'firebase';

  function error(msg, code) { var e = new Error(msg); if (code) e.code = code; return e; }
  function copia(o) { return o == null ? null : JSON.parse(JSON.stringify(o)); }
  function esObj(o) { return o && typeof o === 'object' && !Array.isArray(o) && o !== BORRAR && o !== AHORA; }
  function lsGet(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function conTiempo(p, ms) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(error('tiempo', 'tiempo')); }, ms); })]); }
  function cargarScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res;
      s.onerror = function () { rej(error('No se pudo cargar ' + src + '. Revisa tu conexión a internet.')); };
      document.head.appendChild(s);
    });
  }

  /* =====================================================================
   * BACKEND FIREBASE (SDK compat 10.12.2, el mismo de app-web)
   * ===================================================================== */
  function BackendFirebase() {
    var app, db, auth, FV, FP;
    function conv(v) {
      if (v === BORRAR) return FV.delete();
      if (v === AHORA) return FV.serverTimestamp();
      if (Array.isArray(v)) return v.map(conv);
      if (esObj(v)) { var o = {}; Object.keys(v).forEach(function (k) { if (v[k] !== undefined) o[k] = conv(v[k]); }); return o; }
      return v;
    }
    function norm(v) {
      if (v && typeof v.toMillis === 'function') return v.toMillis();
      if (Array.isArray(v)) return v.map(norm);
      if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = norm(v[k]); }); return o; }
      return v;
    }
    return {
      iniciar: function () {
        return cargarScript(SDK + 'firebase-app-compat.js')
          .then(function () { return Promise.all([cargarScript(SDK + 'firebase-auth-compat.js'), cargarScript(SDK + 'firebase-firestore-compat.js')]); })
          .then(function () {
            // instancia con nombre propio: la sesión NO se mezcla con la de las apps de mantenimiento
            app = firebase.apps.find(function (a) { return a.name === 'misionenfoque'; }) || firebase.initializeApp(cfg, 'misionenfoque');
            db = app.firestore(); auth = app.auth();
            FV = firebase.firestore.FieldValue; FP = firebase.firestore.FieldPath;
            try { db.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
            // guarda en el teléfono lo que no se pudo enviar (sin señal) y lo sube al volver la conexión
            try { db.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}
          });
      },
      usuarioActual: function () { var u = auth.currentUser; return u ? { uid: u.uid, email: u.email } : null; },
      esperarAuth: function () { return new Promise(function (res) { var un = auth.onAuthStateChanged(function (u) { un(); res(u ? { uid: u.uid, email: u.email } : null); }); }); },
      entrar: function (email, pass) { return auth.signInWithEmailAndPassword(email, pass); },
      crear: function (email, pass) { return auth.createUserWithEmailAndPassword(email, pass); },
      crearSecundaria: function (email, pass) {
        // segunda instancia: crea la cuenta sin cerrar la sesión de la administradora general
        var sec = firebase.apps.find(function (a) { return a.name === 'secundaria'; }) || firebase.initializeApp(cfg, 'secundaria');
        var sa = sec.auth();
        return sa.setPersistence(firebase.auth.Auth.Persistence.NONE)
          .then(function () { return sa.createUserWithEmailAndPassword(email, pass).then(function () { return 'creada'; }); })
          .catch(function (e) {
            if (e.code !== 'auth/email-already-in-use') throw e;
            return sa.signInWithEmailAndPassword(email, pass).then(function () { return 'existe-ok'; }).catch(function () { throw e; });
          })
          .then(function (r) { return sa.signOut().then(function () { return r; }); }, function (e) { return sa.signOut().then(function () { throw e; }, function () { throw e; }); });
      },
      reautenticar: function (pass) { var u = auth.currentUser; return u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, pass)); },
      cambiarPass: function (nueva) { return auth.currentUser.updatePassword(nueva); },
      salir: function () { return auth.signOut(); },
      leer: function (r) { return db.doc(r).get().then(function (s) { return s.exists ? norm(s.data()) : null; }); },
      escribir: function (r, data, merge) { return db.doc(r).set(conv(data), merge ? { merge: true } : {}); },
      actualizar: function (r, pares) {
        var args = [];
        pares.forEach(function (p) { args.push(new (Function.prototype.bind.apply(FP, [null].concat(p[0])))(), conv(p[1])); });
        var ref = db.doc(r); return ref.update.apply(ref, args);
      },
      borrar: function (r) { return db.doc(r).delete(); },
      listar: function (c) { return db.collection(c).get().then(function (q) { return q.docs.map(function (d) { var o = norm(d.data()); o.id = d.id; return o; }); }); },
      lote: function (ops) {
        var b = db.batch();
        ops.forEach(function (o) {
          var ref = db.doc(o.ruta);
          if (o.tipo === 'delete') b.delete(ref); else b.set(ref, conv(o.data), o.merge ? { merge: true } : {});
        });
        return b.commit();
      }
    };
  }

  /* =====================================================================
   * BACKEND DEMO (localStorage) — emula la regla genérica de app-web:
   *   read  si enPersonal(app)
   *   write si (enPersonal(app) && (col != 'config' || esAdmin(app))) || (auth != null && !hayPersonal(app))
   * ===================================================================== */
  function BackendDemo() {
    var K = { d: 'me_demo_datos', a: 'me_demo_auth', s: 'me_demo_sesion' };
    function datos() { return lsGet(K.d, {}); }
    function guardar(d) { if (!lsSet(K.d, d)) throw error('No se pudo guardar en este navegador (almacenamiento lleno o bloqueado).'); }
    function usuarios() { return lsGet(K.a, {}); }
    function sesion() { try { return localStorage.getItem(K.s) || null; } catch (e) { return null; } }
    function denegado() { return error('Missing or insufficient permissions.', 'permission-denied'); }
    function regla(op, ruta, d) {
      var em = sesion(); var partes = ruta.split('/'); // apps/misionenfoque/col/...
      if (partes[0] !== 'apps') return false;
      var col = partes[2];
      var pers = d[BASE + '/config/personal'];
      var hay = !!pers;
      var nom = em ? em.split('@')[0].split('.')[0] : null;
      var per = hay && nom && pers.p && pers.p[nom];
      var en = !!(em && per && per.a !== false);
      var adm = en && (per.r === 'admin' || per.r === 'general');
      if (op === 'read') return en;
      return (en && (col !== 'config' || adm)) || (!!em && !hay);
    }
    function resolver(v) {
      if (v === AHORA) return Date.now();
      if (Array.isArray(v)) return v.map(resolver);
      if (esObj(v)) { var o = {}; Object.keys(v).forEach(function (k) { if (v[k] !== undefined && v[k] !== BORRAR) o[k] = resolver(v[k]); }); return o; }
      return v;
    }
    function fusionar(a, b) {
      var o = esObj(a) ? copia(a) : {};
      Object.keys(b).forEach(function (k) {
        if (b[k] === BORRAR) delete o[k];
        else if (esObj(b[k])) o[k] = fusionar(o[k], b[k]);
        else if (b[k] !== undefined) o[k] = resolver(b[k]);
      });
      return o;
    }
    function aplicar(d, o) {
      if (o.tipo === 'delete') delete d[o.ruta];
      else d[o.ruta] = o.merge ? fusionar(d[o.ruta], o.data) : resolver(o.data);
    }
    var esperar = function (v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 40); }); };
    return {
      iniciar: function () { return Promise.resolve(); },
      usuarioActual: function () { var e = sesion(); return e && usuarios()[e] ? { uid: usuarios()[e].uid, email: e } : null; },
      esperarAuth: function () { return Promise.resolve(this.usuarioActual()); },
      entrar: function (email, pass) {
        var u = usuarios()[email];
        if (!u || u.pass !== pass) return Promise.reject(error('bad', 'auth/invalid-credential'));
        localStorage.setItem(K.s, email); return esperar();
      },
      crear: function (email, pass) {
        var us = usuarios();
        if (us[email]) return Promise.reject(error('x', 'auth/email-already-in-use'));
        if (String(pass).length < 6) return Promise.reject(error('x', 'auth/weak-password'));
        us[email] = { pass: pass, uid: 'demo-' + Math.random().toString(36).slice(2, 10) }; lsSet(K.a, us);
        localStorage.setItem(K.s, email); return esperar();
      },
      crearSecundaria: function (email, pass) {
        var us = usuarios();
        if (us[email]) return us[email].pass === pass ? esperar('existe-ok') : Promise.reject(error('x', 'auth/email-already-in-use'));
        if (String(pass).length < 6) return Promise.reject(error('x', 'auth/weak-password'));
        us[email] = { pass: pass, uid: 'demo-' + Math.random().toString(36).slice(2, 10) }; lsSet(K.a, us); return esperar('creada');
      },
      reautenticar: function (pass) { var e = sesion(), u = usuarios()[e]; return (u && u.pass === pass) ? esperar() : Promise.reject(error('x', 'auth/wrong-password')); },
      cambiarPass: function (nueva) {
        if (String(nueva).length < 6) return Promise.reject(error('x', 'auth/weak-password'));
        var us = usuarios(), e = sesion(); us[e].pass = nueva; lsSet(K.a, us); return esperar();
      },
      salir: function () { try { localStorage.removeItem(K.s); } catch (e) {} return esperar(); },
      leer: function (r) { var d = datos(); if (!regla('read', r, d)) return Promise.reject(denegado()); return esperar(copia(d[r] || null)); },
      escribir: function (r, data, merge) { var d = datos(); if (!regla('write', r, d)) return Promise.reject(denegado()); aplicar(d, { ruta: r, data: data, merge: merge }); guardar(d); return esperar(); },
      actualizar: function (r, pares) {
        var d = datos(); if (!regla('write', r, d)) return Promise.reject(denegado());
        if (!d[r]) return Promise.reject(error('No existe el documento', 'not-found'));
        pares.forEach(function (p) {
          var segs = p[0], o = d[r];
          for (var i = 0; i < segs.length - 1; i++) { if (!esObj(o[segs[i]])) o[segs[i]] = {}; o = o[segs[i]]; }
          var k = segs[segs.length - 1];
          if (p[1] === BORRAR) delete o[k]; else o[k] = resolver(p[1]);
        });
        guardar(d); return esperar();
      },
      borrar: function (r) { var d = datos(); if (!regla('write', r, d)) return Promise.reject(denegado()); delete d[r]; guardar(d); return esperar(); },
      listar: function (c) {
        var d = datos(); if (!regla('read', c + '/x', d)) return Promise.reject(denegado());
        var pre = c + '/';
        return esperar(Object.keys(d).filter(function (k) { return k.indexOf(pre) === 0 && k.slice(pre.length).indexOf('/') < 0; })
          .map(function (k) { var o = copia(d[k]); o.id = k.slice(pre.length); return o; }));
      },
      lote: function (ops) {
        var d = datos();
        for (var i = 0; i < ops.length; i++) if (!regla('write', ops[i].ruta, d)) return Promise.reject(denegado());
        ops.forEach(function (o) { aplicar(d, o); }); guardar(d); return esperar();
      }
    };
  }

  /* =====================================================================
   * BÓVEDA (WebCrypto): contraseñas visibles solo para la administradora general
   * ===================================================================== */
  var S = (window.crypto && crypto.subtle) || null, IT = 200000;
  var te = new TextEncoder(), td = new TextDecoder();
  function b64(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function sinCripto() { return error('Este navegador no permite cifrado seguro (abre la app con https).'); }
  var Boveda = {
    derivar: function (pass, sal, it) {
      return S.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
        return S.deriveKey({ name: 'PBKDF2', salt: sal, iterations: it, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
    },
    cifrarPriv: function (pk8, pass) {
      var sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      return Boveda.derivar(pass, sal, IT).then(function (k) { return S.encrypt({ name: 'AES-GCM', iv: iv }, k, pk8); })
        .then(function (c) { return { c: b64(c), iv: b64(iv), sal: b64(sal), it: IT }; });
    },
    abrirPk8: function (priv, pass) {
      return Boveda.derivar(pass, unb64(priv.sal), priv.it || IT)
        .then(function (k) { return S.decrypt({ name: 'AES-GCM', iv: unb64(priv.iv) }, k, unb64(priv.c)); });
    },
    importarPriv: function (pk8) { return S.importKey('pkcs8', pk8, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']); },
    crear: function (pass) {
      if (!S) return Promise.reject(sinCripto());
      var par;
      return S.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt'])
        .then(function (p) { par = p; return Promise.all([S.exportKey('spki', p.publicKey), S.exportKey('pkcs8', p.privateKey)]); })
        .then(function (x) { return Boveda.cifrarPriv(x[1], pass).then(function (priv) { return { doc: { pub: b64(x[0]), priv: priv, alg: 'RSA-OAEP-2048/SHA-256 + AES-GCM-256/PBKDF2' }, llave: par.privateKey }; }); });
    },
    cifrar: function (pub, texto) {
      if (!S) return Promise.reject(sinCripto());
      return S.importKey('spki', unb64(pub), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'])
        .then(function (k) { return S.encrypt({ name: 'RSA-OAEP' }, k, te.encode(texto)); }).then(b64);
    },
    descifrar: function (llave, c) { return S.decrypt({ name: 'RSA-OAEP' }, llave, unb64(c)).then(function (b) { return td.decode(b); }); }
  };

  /* =====================================================================
   * LÓGICA DE NEGOCIO (igual en ambos modos)
   * ===================================================================== */
  var B = null, perfil = null, llavePriv = null, listo = null;
  function ruta(r) { return BASE + '/' + r; }
  function normU(u) { return String(u || '').trim().toLowerCase(); }
  // empieza con letra (así nunca choca con un número de nómina de mantenimiento) y sin puntos
  function usuarioValido(u) { return /^[a-z][a-z0-9_]{2,19}$/.test(u); }
  function correo(u) { return u + '@' + DOMINIO; }
  function traducir(e) {
    var m = {
      'auth/invalid-credential': 'Usuario o contraseña incorrectos.', 'auth/invalid-login-credentials': 'Usuario o contraseña incorrectos.',
      'auth/wrong-password': 'Contraseña incorrecta.', 'auth/user-not-found': 'Usuario o contraseña incorrectos.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.', 'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'auth/network-request-failed': 'Sin conexión a internet.', 'auth/requires-recent-login': 'Vuelve a escribir tu contraseña actual.',
      'auth/operation-not-allowed': 'El acceso con correo y contraseña no está activado en Firebase.',
      'permission-denied': 'Sin permiso para esta acción.', 'unavailable': 'Sin conexión con el servidor. Intenta de nuevo.'
    };
    var msg = m[e && e.code] || (e && e.message) || 'Error';
    var x = error(msg, e && e.code); return x;
  }
  function todos(v) { var o = {}; PERMISOS.forEach(function (p) { o[p] = v; }); return o; }

  function iniciar() {
    if (!listo) { B = MODO === 'demo' ? BackendDemo() : BackendFirebase(); listo = B.iniciar(); }
    return listo;
  }

  function arrancar(clave) {
    // primera vez: crea config/personal (permitido por la rama !hayPersonal), la bóveda y la contraseña cifrada
    return Boveda.crear(clave).then(function (bv) {
      return Boveda.cifrar(bv.doc.pub, clave).then(function (c) {
        var pers = { p: { kimberly: { n: 'Kimberly', r: 'general', a: true, cargo: 'Administradora general', perm: todos(true), alta: AHORA } }, creado: AHORA };
        return B.lote([
          { tipo: 'set', ruta: ruta('config/personal'), data: pers },
          { tipo: 'set', ruta: ruta('config/boveda'), data: Object.assign({}, bv.doc, { creado: AHORA }) },
          { tipo: 'set', ruta: ruta('boveda/kimberly'), data: { c: c, t: AHORA } }
        ]).then(function () { llavePriv = bv.llave; });
      });
    });
  }

  function cargarPerfil(clave) {
    var user = B.usuarioActual();
    if (!user) return Promise.reject(error('Sin sesión'));
    var partes = String(user.email || '').split('@');
    var u = partes[0].split('.')[0];
    if (partes[1] !== DOMINIO) return B.salir().then(function () { throw error('Esta cuenta no pertenece a Misión Enfoque.'); });
    return B.leer(ruta('config/personal')).catch(function (e) { if (e.code === 'permission-denied') return null; throw traducir(e); })
      .then(function (pers) {
        if (pers) return pers;
        if (u === 'kimberly' && clave) {
          return arrancar(clave).then(function () { return B.leer(ruta('config/personal')); })
            .catch(function () { return null; });
        }
        return null;
      })
      .then(function (pers) {
        var p = pers && pers.p && pers.p[u];
        if (!p || p.a === false) {
          return B.salir().then(function () { throw error(p ? 'Tu cuenta está desactivada. Habla con la administradora general.' : 'Tu cuenta no está dada de alta en Misión Enfoque. Pide acceso a la administradora general.'); });
        }
        perfil = { usuario: u, nombre: p.n || u, cargo: p.cargo || '', rol: p.r, general: p.r === 'general', perm: p.perm || {} };
        if (perfil.general && clave && !llavePriv) {
          return desbloquear(clave).then(function () { return perfil; }, function () { perfil.bovedaError = true; return perfil; });
        }
        return perfil;
      });
  }

  function desbloquear(clave) {
    return B.leer(ruta('config/boveda')).then(function (bv) {
      if (!bv) throw error('No hay bóveda creada.');
      return Boveda.abrirPk8(bv.priv, clave).then(Boveda.importarPriv).then(function (k) { llavePriv = k; perfil && (perfil.bovedaError = false); },
        function () { throw error('No se pudo abrir la bóveda con esa contraseña.'); });
    });
  }

  function puede(p) { return !!perfil && (perfil.general || !!(perfil.perm && perfil.perm[p])); }
  function soloGeneral() { if (!perfil || !perfil.general) throw error('Solo la administradora general puede hacer esto.'); }

  var Mision = {
    modo: MODO, PERMISOS: PERMISOS, PERM_TXT: PERM_TXT, DOMINIO: DOMINIO,
    iniciar: iniciar,
    perfil: function () { return perfil; },
    puede: puede,
    usuarioValido: usuarioValido,

    entrar: function (usuario, clave) {
      var u = normU(usuario);
      if (!usuarioValido(u)) return Promise.reject(error('Usuario no válido.'));
      if (!clave) return Promise.reject(error('Escribe tu contraseña.'));
      return iniciar().then(function () {
        return B.entrar(correo(u), clave).catch(function (e) {
          var noExiste = ['auth/invalid-credential', 'auth/user-not-found', 'auth/invalid-login-credentials'].indexOf(e.code) >= 0;
          if (u === 'kimberly' && clave === '000000' && noExiste) {
            // arranque o recuperación: si la cuenta general no existe en Authentication, se crea con 000000
            return B.crear(correo(u), clave).catch(function (e2) {
              if (e2.code === 'auth/email-already-in-use') throw error('Usuario o contraseña incorrectos.');
              throw traducir(e2);
            });
          }
          throw traducir(e);
        });
      }).then(function () { return cargarPerfil(clave); });
    },
    sesion: function () {
      return iniciar().then(function () { return B.esperarAuth(); }).then(function (u) {
        if (!u) return null;
        return cargarPerfil(null).catch(function () { return null; });
      });
    },
    salir: function () { llavePriv = null; perfil = null; return iniciar().then(function () { return B.salir(); }); },
    verificarClave: function (clave) { return B.reautenticar(clave).catch(function (e) { throw traducir(e.code === 'auth/invalid-credential' ? { code: 'auth/wrong-password' } : e); }); },

    /* ---------- respuestas */
    guardarRespuesta: function (reg) {
      reg = Object.assign({}, reg, { capturadoPor: perfil ? perfil.usuario : '' });
      var pend = lsGet('me_pendientes', {}); pend[reg.folio] = reg; lsSet('me_pendientes', pend);
      return conTiempo(B.escribir(ruta('respuestas/' + reg.folio), Object.assign({}, reg, { ts: AHORA })), 8000)
        .then(function () { var p = lsGet('me_pendientes', {}); delete p[reg.folio]; lsSet('me_pendientes', p); return 'enviada'; })
        .catch(function () { return 'pendiente'; });
    },
    pendientes: function () { return Object.keys(lsGet('me_pendientes', {})).length; },
    reintentarPendientes: function () {
      var pend = lsGet('me_pendientes', {}), ks = Object.keys(pend);
      if (!ks.length || !perfil) return Promise.resolve(0);
      return Promise.all(ks.map(function (k) {
        return conTiempo(B.escribir(ruta('respuestas/' + k), Object.assign({}, pend[k], { ts: AHORA })), 8000)
          .then(function () { var p = lsGet('me_pendientes', {}); delete p[k]; lsSet('me_pendientes', p); return 1; }).catch(function () { return 0; });
      })).then(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); });
    },
    listarRespuestas: function () {
      if (!puede('verEstadisticas')) return Promise.reject(error('No tienes permiso para ver resultados.'));
      return B.listar(ruta('respuestas')).then(function (rs) {
        var nombres = puede('verNombres');
        rs.forEach(function (r) { if (!nombres) { r.nombre = ''; r.nombreOculto = !!r.identificado; } });
        rs.sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
        return rs;
      }).catch(function (e) { throw traducir(e); });
    },
    borrarRespuesta: function (id) { soloGeneral(); return B.borrar(ruta('respuestas/' + id)).catch(function (e) { throw traducir(e); }); },

    /* ---------- personas (administradores) */
    listarPersonal: function () {
      return B.leer(ruta('config/personal')).then(function (pers) {
        var p = (pers && pers.p) || {};
        return Object.keys(p).sort().map(function (u) { var x = p[u]; return { usuario: u, nombre: x.n || u, cargo: x.cargo || '', rol: x.r, activo: x.a !== false, perm: x.perm || {} }; });
      }).catch(function (e) { throw traducir(e); });
    },
    agregarAdmin: function (d) {
      try { soloGeneral(); } catch (e) { return Promise.reject(e); }
      var u = normU(d.usuario);
      if (!usuarioValido(u)) return Promise.reject(error('Usuario no válido: usa de 3 a 20 letras minúsculas, números o guion bajo, empezando con letra (sin puntos ni espacios).'));
      if (String(d.clave || '').length < 6) return Promise.reject(error('La contraseña debe tener al menos 6 caracteres.'));
      if (!String(d.nombre || '').trim()) return Promise.reject(error('Escribe el nombre.'));
      return Mision.listarPersonal().then(function (lst) {
        if (lst.some(function (x) { return x.usuario === u; })) throw error('Ese usuario ya existe.');
        return B.crearSecundaria(correo(u), d.clave).catch(function (e) {
          if (e.code === 'auth/email-already-in-use') throw error('Ese usuario ya tuvo una cuenta con otra contraseña. Usa otro nombre de usuario (p. ej. ' + u + '2) o pide al dueño del proyecto borrar la cuenta en Firebase → Authentication.');
          throw traducir(e);
        });
      }).then(function () { return B.leer(ruta('config/boveda')); })
        .then(function (bv) { return bv ? Boveda.cifrar(bv.pub, d.clave) : null; })
        .then(function (c) {
          var perm = {}; PERMISOS.forEach(function (p) { perm[p] = !!(d.perm && d.perm[p]); });
          var nuevo = {}; nuevo[u] = { n: String(d.nombre).trim(), cargo: String(d.cargo || '').trim(), r: 'usuario', a: true, perm: perm, alta: AHORA };
          var ops = [{ tipo: 'set', ruta: ruta('config/personal'), data: { p: nuevo }, merge: true }];
          if (c) ops.push({ tipo: 'set', ruta: ruta('boveda/' + u), data: { c: c, t: AHORA } });
          return B.lote(ops);
        }).catch(function (e) { throw e.code ? traducir(e) : e; });
    },
    editarAdmin: function (u, c) {
      try { soloGeneral(); } catch (e) { return Promise.reject(e); }
      var pares = [];
      if (c.nombre != null) pares.push([['p', u, 'n'], String(c.nombre).trim()]);
      if (c.cargo != null) pares.push([['p', u, 'cargo'], String(c.cargo).trim()]);
      if (c.perm) { var perm = {}; PERMISOS.forEach(function (p) { perm[p] = !!c.perm[p]; }); pares.push([['p', u, 'perm'], perm]); }
      if (c.activo != null) {
        if (u === perfil.usuario && !c.activo) return Promise.reject(error('No puedes desactivar tu propia cuenta general.'));
        pares.push([['p', u, 'a'], !!c.activo]);
      }
      return B.actualizar(ruta('config/personal'), pares).catch(function (e) { throw traducir(e); });
    },
    eliminarAdmin: function (u) {
      try { soloGeneral(); } catch (e) { return Promise.reject(e); }
      if (u === perfil.usuario) return Promise.reject(error('No puedes eliminar tu propia cuenta general.'));
      return B.actualizar(ruta('config/personal'), [[['p', u], BORRAR]])
        .then(function () { return B.borrar(ruta('boveda/' + u)).catch(function () {}); })
        .catch(function (e) { throw traducir(e); });
    },
    bovedaAbierta: function () { return !!llavePriv; },
    desbloquearBoveda: function (clave) { try { soloGeneral(); } catch (e) { return Promise.reject(e); } return desbloquear(clave); },
    verClaves: function () {
      try { soloGeneral(); } catch (e) { return Promise.reject(e); }
      if (!llavePriv) return Promise.reject(error('Bóveda cerrada'));
      return B.listar(ruta('boveda')).then(function (docs) {
        var out = {};
        return Promise.all(docs.map(function (d) {
          return Boveda.descifrar(llavePriv, d.c).then(function (t) { out[d.id] = t; }, function () { out[d.id] = null; });
        })).then(function () { return out; });
      });
    },
    regenerarBoveda: function (clave) {
      try { soloGeneral(); } catch (e) { return Promise.reject(e); }
      return B.reautenticar(clave).catch(function (e) { throw traducir(e.code === 'auth/invalid-credential' ? { code: 'auth/wrong-password' } : e); })
        .then(function () { return Boveda.crear(clave); })
        .then(function (bv) {
          return Boveda.cifrar(bv.doc.pub, clave).then(function (c) {
            return B.listar(ruta('boveda')).then(function (docs) {
              var ops = [{ tipo: 'set', ruta: ruta('config/boveda'), data: Object.assign({}, bv.doc, { creado: AHORA }) },
                { tipo: 'set', ruta: ruta('boveda/' + perfil.usuario), data: { c: c, t: AHORA } }];
              docs.forEach(function (d) { if (d.id !== perfil.usuario) ops.push({ tipo: 'delete', ruta: ruta('boveda/' + d.id) }); });
              return B.lote(ops);
            }).then(function () { llavePriv = bv.llave; perfil.bovedaError = false; });
          });
        });
    },
    cambiarMiClave: function (actual, nueva) {
      if (String(nueva || '').length < 6) return Promise.reject(error('La contraseña nueva debe tener al menos 6 caracteres.'));
      var bv = null, pk8 = null;
      return B.reautenticar(actual).catch(function (e) { throw traducir(e.code === 'auth/invalid-credential' ? { code: 'auth/wrong-password' } : e); })
        .then(function () { return B.leer(ruta('config/boveda')).catch(function () { return null; }); })
        .then(function (x) {
          bv = x;
          if (perfil.general && bv) return Boveda.abrirPk8(bv.priv, actual).then(function (k) { pk8 = k; }, function () { pk8 = null; });
        })
        .then(function () { return B.cambiarPass(nueva).catch(function (e) { throw traducir(e); }); })
        .then(function () {
          if (perfil.general) {
            if (pk8) {
              return Boveda.cifrarPriv(pk8, nueva).then(function (priv) { return B.actualizar(ruta('config/boveda'), [[['priv'], priv]]); })
                .then(function () { return Boveda.importarPriv(pk8); }).then(function (k) { llavePriv = k; perfil.bovedaError = false; });
            }
            return Mision.regenerarBoveda(nueva);
          }
        })
        .then(function () { return B.leer(ruta('config/boveda')); })
        .then(function (b2) { return b2 ? Boveda.cifrar(b2.pub, nueva).then(function (c) { return B.escribir(ruta('boveda/' + perfil.usuario), { c: c, t: AHORA }); }) : null; });
    },

    /* ---------- datos de ejemplo (solo DEMO) */
    cargarEjemplos: function (n) {
      if (MODO !== 'demo') return Promise.reject(error('Los ejemplos solo se cargan en modo demo.'));
      var regs = generarEjemplos(n || 60);
      return B.lote(regs.map(function (r) { return { tipo: 'set', ruta: ruta('respuestas/' + r.folio), data: Object.assign({}, r, { ts: AHORA }) }; }));
    },
    borrarTodoDemo: function () {
      if (MODO !== 'demo') return Promise.reject(error('Solo en modo demo.'));
      ['me_demo_datos', 'me_demo_auth', 'me_demo_sesion', 'me_pendientes', 'me_kiosco'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      return Promise.resolve();
    },
    nuevoFolio: function () {
      var t = Date.now().toString(36).toUpperCase().slice(-5);
      var r = Math.floor(Math.random() * 1296).toString(36).toUpperCase(); while (r.length < 2) r = '0' + r;
      return t + r;
    }
  };

  /* ---------- generador de encuestas sintéticas (pruebas / demostración) */
  function generarEjemplos(n) {
    var I = window.INSTRUMENTO;
    var nombresM = ['Ana Sofía', 'Valeria', 'Ximena', 'Camila', 'Renata', 'Daniela', 'Regina', 'Fernanda', 'Mariana', 'Itzel', 'Andrea', 'Paola'];
    var nombresH = ['Diego', 'Emiliano', 'Santiago', 'Mateo', 'Leonardo', 'Iker', 'Sebastián', 'Ángel', 'Kevin', 'Joshua', 'Brandon', 'Uriel'];
    var apellidos = ['López', 'Martínez', 'Hernández', 'García', 'Ruiz', 'Delgado', 'Esparza', 'Macías', 'Romo', 'Valdivia', 'Muñoz', 'Ibarra', 'Reyes', 'Lozano'];
    function al(a) { return a[Math.floor(Math.random() * a.length)]; }
    function ent(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
    var hoy = new Date(), out = [];
    for (var i = 0; i < n; i++) {
      var d = new Date(hoy); d.setDate(d.getDate() - ent(0, 20));
      if (d.getDay() === 0) d.setDate(d.getDate() - 2); if (d.getDay() === 6) d.setDate(d.getDate() - 1);
      var turno = Math.random() < 0.58 ? 'Matutino' : 'Vespertino';
      d.setHours(turno === 'Matutino' ? ent(7, 13) : ent(14, 19), ent(0, 59), ent(0, 59), 0);
      var semestre = al([1, 1, 3, 3, 5, 5, 5, 5, 2, 4, 6]);
      var edad = Math.min(20, Math.max(14, 14 + Math.ceil(semestre / 2) + al([0, 0, 1, 1, 1, 2])));
      var rs = Math.random(), sexo = rs < 0.48 ? 'Mujer' : rs < 0.95 ? 'Hombre' : 'Prefiero no decir';
      var alto = Math.random() < (sexo === 'Hombre' ? 0.21 : 0.15);
      var perfilH = Math.random() < 0.5;
      var resp = I.preguntas.map(function (p) {
        var b = alto ? (p.dominio === (perfilH ? 'hiperactividad' : 'inatencion') ? 3.2 : 2.4) : 1.15;
        if (!alto && p.id === 'p5') b = 1.9; // procrastinar es común en todos
        return Math.max(0, Math.min(4, Math.round(b + (Math.random() - 0.5) * 2.2)));
      });
      var cal = I.calificar(resp);
      var ident = Math.random() < 0.45;
      var nombre = ident ? (sexo === 'Mujer' ? al(nombresM) : sexo === 'Hombre' ? al(nombresH) : al(nombresM.concat(nombresH))) + ' ' + al(apellidos) + ' ' + al(apellidos) : '';
      var f = cal.positivo ? 1 : 0;
      var juegos = {};
      if (Math.random() < 0.9) {
        var go = 22 + ent(0, 2), hits = Math.max(8, go - ent(0, 2) - f * ent(1, 5)), com = ent(0, 2) + f * ent(1, 4), rts = ent(380, 520) + f * ent(0, 60);
        juegos.gng = { go: go, hits: hits, om: go - hits, com: com, nogo: 30 - go, tr: rts, var: ent(60, 120) + f * ent(10, 70) };
      }
      if (Math.random() < 0.85) juegos.mem = { span: Math.max(3, Math.min(9, ent(4, 7) - f * ent(0, 1))), intentos: ent(4, 8) };
      if (Math.random() < 0.85) { var h = Math.max(5, 12 - ent(0, 2) - f * ent(0, 3)); juegos.hunt = { hits: h, total: 12, err: ent(0, 2) + f * ent(0, 3), om: 12 - h, seg: h === 12 ? ent(14, 29) : 30 }; }
      if (Math.random() < 0.85) juegos.sem = { ant: ent(0, 1) + f * ent(0, 3), om: ent(0, 1), n: 8, tr: ent(330, 480) };
      var folio = (d.getTime().toString(36).toUpperCase().slice(-5)) + i.toString(36).toUpperCase().padStart(2, '0');
      out.push({
        folio: folio, fecha: d.toISOString(), instrumento: I.id, edad: edad, sexo: sexo, semestre: semestre, grupo: al(window.CATALOGOS.grupos), turno: turno,
        nombre: nombre, identificado: ident, resp: resp, total: cal.total, inat: cal.inat, hiper: cal.hiper, positivo: cal.positivo, banda: cal.banda, sombreadas: cal.sombreadas,
        juegos: juegos, disp: { tipo: 'Celular', so: 'Android' }, duracionSeg: ent(150, 420), capturadoPor: 'kimberly', ejemplo: true
      });
    }
    return out;
  }

  window.Mision = Mision;
})();
