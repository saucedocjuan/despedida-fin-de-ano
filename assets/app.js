/* Invitación pública · etapa 2 (interfaz, cuenta regresiva y efectos) */
(function () {
  "use strict";
  var C = window.APP_CONFIG || {};
  var E = C.EVENTO || {};
  var $ = function (s) { return document.querySelector(s); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Contenido del evento ---------- */
  $("#bienvenida").innerHTML = String(E.bienvenida || "").replace(/<[^>]*>/g, "");
  $("#d-fecha").textContent = E.fechaTexto || "—";
  $("#d-hora").textContent = E.horaInicio || "—";
  $("#d-lugar").textContent = E.lugar || "—";
  $("#mapaBtn").href = E.mapa || "#";
  $("#anfitrion").textContent = E.anfitrion || "La organización";
  $("#year").textContent = new Date().getFullYear();

  /* Foto de portada opcional: configurar FOTO_FONDO en config.js */
  var foto = E.FOTO_FONDO || C.FOTO_FONDO || "";
  if (foto) {
    var tapa = $("#tarjetaFoto");
    var urlFoto = new URL(String(foto), location.href).href;
    tapa.style.setProperty("--foto", 'url("' + urlFoto.replace(/"/g, "") + '")');
    tapa.classList.add("con-foto");
  }

  /* ---------- Cuenta regresiva ---------- */
  var inicio = new Date(E.fechaISO);
  var timer = null;
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var diff = inicio.getTime() - Date.now();
    var box = $("#countdown");
    if (!isFinite(diff)) { box.innerHTML = '<div class="unit"><b>Fecha a configurar</b></div>'; if (timer) clearInterval(timer); return; }
    if (diff <= 0) {
      box.classList.add("done");
      box.innerHTML = '<div class="unit"><b>¡La fiesta ya comenzó!</b></div>';
      if (timer) clearInterval(timer);
      return;
    }
    var s = Math.floor(diff / 1000);
    $("#cd-d").textContent = pad(Math.floor(s / 86400));
    $("#cd-h").textContent = pad(Math.floor(s % 86400 / 3600));
    $("#cd-m").textContent = pad(Math.floor(s % 3600 / 60));
    $("#cd-s").textContent = pad(s % 60);
  }
  tick();
  timer = setInterval(tick, 1000);

  /* ---------- Animación de entrada ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  /* ---------- Avisos ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }
  window.toastInvitacion = toast;

  /* ---------- Partículas y confeti ---------- */
  var canvas = $("#fx"), ctx = canvas.getContext("2d");
  var W = 0, H = 0, parts = [];
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!reduce && !parts.length) {
      var n = Math.min(28, Math.floor(W / 40));
      for (var i = 0; i < n; i++) parts.push({
        x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + .5,
        vy: -(Math.random() * .25 + .07), vx: (Math.random() - .5) * .1,
        a: Math.random() * .4 + .12, hue: [44, 168, 340][i % 3], tw: Math.random() * 6.28
      });
    }
  }
  function confetti(x, y, count) {
    var hues = [44, 168, 340, 0];
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2, sp = Math.random() * 6 + 2;
      parts.push({
        x: x == null ? W / 2 : x, y: y == null ? H * .4 : y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.5,
        r: Math.random() * 3.5 + 2, a: 1, conf: true,
        hue: hues[i % hues.length], rot: Math.random() * 6.28,
        vr: (Math.random() - .5) * .3, life: 1
      });
    }
  }
  window.confettiInvitacion = confetti;

  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      if (p.conf) {
        p.vy += .15; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= .007;
        if (p.life <= 0 || p.y > H + 30) { parts.splice(i, 1); continue; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = "hsl(" + p.hue + " 85% 68%)";
        ctx.fillRect(-p.r, -p.r * .45, p.r * 2, p.r * .9);
        ctx.restore();
      } else if (!reduce) {
        p.y += p.vy; p.x += p.vx; p.tw += .02;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        ctx.globalAlpha = p.a * (.55 + .45 * Math.sin(p.tw));
        ctx.fillStyle = "hsl(" + p.hue + " 90% 72%)";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  addEventListener("resize", resize);
  resize(); frame();

  /* ---------- Estado de configuración ---------- */
  window.RSVP_HABILITADO = !!window.APP_READY;
  if (!window.RSVP_HABILITADO) {
    $("#setupNotice").classList.remove("hidden");
    $("#submitBtn").disabled = true;
    $("#mapaBtn").classList.add("disabled");
  }
})();

/* ============================================================
   Confirmación, edición/cancelación segura y lista pública
   ============================================================ */
(function () {
  "use strict";
  var C = window.APP_CONFIG || {};
  var E = C.EVENTO || {};
  var $ = function (s) { return document.querySelector(s); };
  var L = window.Logica;
  var sb = window.sb;
  var toast = window.toastInvitacion;
  var confetti = window.confettiInvitacion;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var form = $("#rsvpForm");
  var submitBtn = $("#submitBtn");
  var errorBox = $("#formError");
  var editBanner = $("#editBanner");
  var confirmPanel = $("#confirmPanel");
  var modoEdicion = false;
  var tokenActual = null;

  if (!window.RSVP_HABILITADO || !sb || !L) {
    $("#estadoLista").textContent = "Lista disponible al conectar Supabase.";
    return;
  }

  function mostrarError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("show");
  }
  function limpiarError() { errorBox.classList.remove("show"); errorBox.textContent = ""; }

  function estadoElegido() {
    var r = form.querySelector('input[name="estado"]:checked');
    return r ? r.value : "";
  }
  form.addEventListener("change", limpiarError);

  function linkDe(token) {
    return location.href.split("?")[0] + "?editar=" + token;
  }

  function mensajeError(err) {
    var code = String(err && err.code || "");
    var msg = String(err && err.message || "");
    if (code === "23505" || /DUPLICADO/.test(msg)) {
      return "Ya hay una confirmación con ese nombre, apellido y teléfono. Usá tu enlace privado para cambiarla.";
    }
    if (code === "P0002" || /NO_ENCONTRADO/.test(msg)) {
      return "No encontramos esa confirmación. Pedile a la organización tu enlace privado.";
    }
    if (code === "22023") return "Revisa los datos: nombre, apellido y cantidad de personas.";
    return "No se pudo guardar. Revisá la conexión y probá de nuevo.";
  }

  function datosDelFormulario() {
    return {
      nombre: $("#nombre").value,
      apellido: $("#apellido").value,
      telefono: $("#telefono").value,
      acompanantes: 0,
      estado: estadoElegido()
    };
  }

  function rellenarFormulario(f) {
    $("#nombre").value = f.nombre || "";
    $("#apellido").value = f.apellido || "";
    $("#telefono").value = f.telefono || "";
    var r = form.querySelector('input[name="estado"][value="' + (f.estado || "asistire") + '"]');
    if (r) r.checked = true;
  }

  function ponerModoEdicion(f) {
    modoEdicion = true;
    tokenActual = f.token;
    editBanner.classList.remove("hidden");
    submitBtn.textContent = "Guardar cambios";
    rellenarFormulario(f);
    if (location.search.indexOf("editar=") === -1) {
      history.replaceState(null, "", linkDe(f.token));
    }
  }

  function salirModoEdicion() {
    modoEdicion = false;
    tokenActual = null;
    editBanner.classList.add("hidden");
    submitBtn.textContent = "Enviar confirmación";
    form.reset();
    if (location.search.indexOf("editar=") !== -1) {
      history.replaceState(null, "", location.href.split("?")[0]);
    }
  }

  function mostrarConfirmacion(f, tipo) {
    form.classList.add("hidden");
    editBanner.classList.add("hidden");
    confirmPanel.style.display = "block";

    var n = (f.nombre || "") + " " + (f.apellido || "");
    var textos = {
      recibida: "¡Listo, " + n + "! Te anotamos para el " + E.fechaTexto + ".",
      actualizada: "Datos nuevos guardados, " + n + ".",
      no_podre: "Gracias por avisar, " + n + ". Te vamos a extrañar igual.",
      cancelado: "Listo, " + n + ": te sacamos de la lista. Si te animás, usá el enlace privado."
    };
    $("#confirmTitulo").textContent = tipo === "cancelado" ? "Cancelado"
      : tipo === "actualizada" ? "Datos actualizados" : "¡Anotado!";
    $("#confirmTexto").textContent = textos[tipo] || textos.recibida;

    var link = linkDe(f.token);
    $("#linkEditar").value = link;
    $("#whatsappLink").href = "https://wa.me/?text=" + encodeURIComponent("Mi enlace privado para editar mi confirmación: " + link);
    try { localStorage.setItem("invitacion.token", f.token); } catch (e) {}
  }

  /* Enviar / actualizar */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    limpiarError();
    var validacion = L.validarConfirmacion(datosDelFormulario(), C.MAX_ACOMPANANTES || 5);
    if (!validacion.ok) { mostrarError(validacion.errores.join(" ")); return; }

    var v = validacion.valores;
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando…";
    try {
      var rpc = modoEdicion ? "actualizar_mi_confirmacion" : "confirmar_asistencia";
      var payload = modoEdicion
        ? { p_token: tokenActual, p_nombre: v.nombre, p_apellido: v.apellido, p_telefono: v.telefono,
            p_acompanantes: v.acompanantes, p_estado: v.estado, p_cancelar: false }
        : { p_nombre: v.nombre, p_apellido: v.apellido, p_telefono: v.telefono,
            p_acompanantes: v.acompanantes, p_estado: v.estado };

      var res = await sb.rpc(rpc, payload);
      if (res.error) { mostrarError(mensajeError(res.error)); return; }
      var fila = Array.isArray(res.data) ? res.data[0] : res.data;
      if (!fila) { mostrarError("No se pudo guardar la respuesta. Inténtalo de nuevo."); return; }

      var tipo = fila.estado === "no_podre" ? "no_podre" : (modoEdicion ? "actualizada" : "recibida");
      mostrarConfirmacion(fila, tipo);
      toast("¡Anotado! ✓");
      if (fila.estado === "asistire") confetti(innerWidth / 2, innerHeight * .4, reduce ? 20 : 110);
      await cargarLista();
    } catch (err) {
      mostrarError(mensajeError(err));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = modoEdicion ? "Guardar cambios" : "Enviar confirmación";
    }
  });

  /* Cancelar con token */
  $("#cancelarBtn").addEventListener("click", async function () {
    if (!tokenActual || !window.confirm("¿Cancelar tu confirmación? Esta acción quitará tu nombre de la lista pública.")) return;
    this.disabled = true;
    var res = await sb.rpc("actualizar_mi_confirmacion", {
      p_token: tokenActual, p_nombre: $("#nombre").value, p_apellido: $("#apellido").value,
      p_telefono: $("#telefono").value, p_acompanantes: 0, p_estado: "asistire", p_cancelar: true
    });
    this.disabled = false;
    if (res.error) { mostrarError(mensajeError(res.error)); return; }
    var fila = Array.isArray(res.data) ? res.data[0] : res.data;
    mostrarConfirmacion(fila, "cancelado");
    toast("Listo, cancelado");
    await cargarLista();
  });

  $("#salirEditBtn").addEventListener("click", function () { salirModoEdicion(); limpiarError(); });
  $("#volverForm").addEventListener("click", function () {
    confirmPanel.style.display = "none";
    form.classList.remove("hidden");
    if (modoEdicion) {
      editBanner.classList.remove("hidden");
      submitBtn.textContent = "Guardar cambios";
    } else {
      salirModoEdicion();
    }
    $("#nombre").focus();
  });
  $("#copiarLink").addEventListener("click", async function () {
    var v = $("#linkEditar").value;
    try { await navigator.clipboard.writeText(v); toast("Enlace copiado 🔗"); }
    catch (e) { $("#linkEditar").select(); toast("Selecciona y copia el enlace"); }
  });

  /* Cargar edición desde ?editar=TOKEN */
  async function cargarDesdeToken(token) {
    var res = await sb.rpc("obtener_mi_confirmacion", { p_token: token });
    if (res.error || !res.data || !res.data.length) {
      toast("Ese enlace no es válido o ya no existe");
      return;
    }
    ponerModoEdicion(res.data[0]);
    toast("Tu respuesta está lista para editar");
    $("#rsvpForm").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  /* Lista pública y totales */
  async function cargarLista() {
    var lista = $("#listaConfirmados");
    try {
      var [filasRes, totalesRes] = await Promise.all([
        sb.rpc("listado_confirmados"),
        sb.rpc("totales_publicos")
      ]);
      if (filasRes.error || totalesRes.error) throw (filasRes.error || totalesRes.error);

      var filas = filasRes.data || [];
      lista.textContent = "";
      if (!filas.length) {
        var vacio = document.createElement("div");
        vacio.className = "vacio";
        vacio.textContent = "Todavía nadie se anotó. ¡Podés ser el primero!";
        lista.appendChild(vacio);
      } else {
        filas.forEach(function (f) {
          var item = document.createElement("div");
          item.className = "asistente";
          var av = document.createElement("div");
          av.className = "av";
          av.setAttribute("aria-hidden", "true");
          av.textContent = ((f.nombre || "?")[0] + (f.apellido || "")[0]).toUpperCase();
          var datos = document.createElement("div");
          var nom = document.createElement("div");
          nom.className = "nom";
          nom.textContent = (f.nombre || "") + " " + (f.apellido || "");
          datos.appendChild(nom);
          item.appendChild(av); item.appendChild(datos);
          lista.appendChild(item);
        });
      }

      var t = (totalesRes.data && totalesRes.data[0]) || { personas: 0, acompanantes: 0, total: 0 };
      $("#totPersonas").textContent = t.personas;
      $("#totGeneral").textContent = t.total;
      $("#estadoLista").textContent = "Actualizado a las " +
        new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    } catch (err) {
      $("#estadoLista").textContent = "No se pudo cargar la lista. Reintentando…";
    }
  }

  cargarLista();
  setInterval(cargarLista, C.REFRESCO_LISTA_MS || 10000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) cargarLista(); });

  var tokenUrl = new URLSearchParams(location.search).get("editar");
  if (tokenUrl) cargarDesdeToken(tokenUrl);
})();
