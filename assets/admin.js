/* Panel privado del organizador */
(function () {
  "use strict";
  var C = window.APP_CONFIG || {};
  var $ = function (s) { return document.querySelector(s); };
  var L = window.Logica;
  var sb = window.sb;
  var filas = [];

  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }
  var toastTimer;

  function error(el, msg) { el.textContent = msg; el.classList.add("show"); }
  function limpiar(el) { el.textContent = ""; el.classList.remove("show"); }

  if (!window.APP_READY || !sb || !L) {
    $("#setupNotice").classList.remove("hidden");
    $("#loginBtn").disabled = true;
    return;
  }

  var sel = $("#admAcompanantes");
  for (var i = 0; i <= (C.MAX_ACOMPANANTES || 5); i++) {
    var op = document.createElement("option");
    op.value = String(i); op.textContent = i === 0 ? "0" : "+" + i;
    sel.appendChild(op);
  }

  /* ---------- Autenticación ---------- */
  async function verSesion() {
    var res = await sb.auth.getSession();
    if (res.data && res.data.session) await entrar(res.data.session.user.email || "organizador");
  }

  $("#loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    limpiar($("#loginError"));
    $("#loginBtn").disabled = true;
    $("#loginBtn").textContent = "Entrando…";
    var res = await sb.auth.signInWithPassword({
      email: $("#email").value.trim(), password: $("#password").value
    });
    if (res.error) {
      error($("#loginError"), "No se pudo ingresar: " + res.error.message);
    } else {
      await entrar(res.data.user.email || "organizador");
    }
    $("#loginBtn").disabled = false;
    $("#loginBtn").textContent = "Entrar al panel";
  });

  $("#logoutBtn").addEventListener("click", async function () {
    await sb.auth.signOut();
    filas = [];
    $("#adminPanel").classList.add("hidden");
    $("#loginCard").classList.remove("hidden");
    $("#logoutBtn").classList.add("hidden");
  });

  async function entrar(email) {
    var check = await sb.rpc("es_admin");
    if (!check.data) {
      error($("#loginError"), "Tu usuario no tiene permisos de organizador. Solicita acceso al administrador del proyecto.");
      await sb.auth.signOut();
      return;
    }
    $("#loginCard").classList.add("hidden");
    $("#adminPanel").classList.remove("hidden");
    $("#logoutBtn").classList.remove("hidden");
    toast("Hola de nuevo, " + email);
    await cargar();
  }

  /* ---------- Carga y estadísticas ---------- */
  async function cargar() {
    $("#adminStatus").textContent = "Cargando…";
    var res = await sb.from("invitados").select(
      "id,nombre,apellido,telefono,acompanantes,estado,token,creado_en,actualizado_en,confirmado_en"
    ).order("creado_en", { ascending: false });

    if (res.error) {
      error($("#adminError"), "No se pudieron cargar los registros: " + res.error.message);
      $("#adminStatus").textContent = "Error de carga";
      return;
    }
    filas = res.data || [];
    renderStats();
    renderTabla();
    $("#adminStatus").textContent = filas.length + " registros · actualizado a las " +
      new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  }

  function renderStats() {
    var t = L.calcularTotales(filas);
    var si = filas.filter(function (f) { return f.estado === "asistire"; }).length;
    var no = filas.filter(function (f) { return f.estado === "no_podre"; }).length;
    var cancel = filas.filter(function (f) { return f.estado === "cancelado"; }).length;
    var tasa = filas.length ? Math.round((si + no + cancel) / filas.length * 100) : 0;

    var datos = [
      [filas.length, "Registros totales"], [si, "Asistiré"],
      [no, "No podré asistir"], [cancel, "Cancelados"],
      [t.total, "Asistentes estimados"], [tasa + "%", "Tasa de respuesta"]
    ];
    var box = $("#stats"); box.textContent = "";
    datos.forEach(function (d) {
      var div = document.createElement("div"); div.className = "stat";
      var b = document.createElement("b"); b.textContent = d[0];
      var s = document.createElement("span"); s.textContent = d[1];
      div.appendChild(b); div.appendChild(s); box.appendChild(div);
    });
  }

  function visibles() {
    var q = $("#buscar").value.trim().toLowerCase();
    var estado = $("#filtroEstado").value;
    return filas.filter(function (f) {
      var texto = [f.nombre, f.apellido, f.telefono].join(" ").toLowerCase();
      return (!q || texto.indexOf(q) !== -1) && (!estado || f.estado === estado);
    });
  }

  function td(texto) { var c = document.createElement("td"); c.textContent = texto == null ? "—" : texto; return c; }

  function renderTabla() {
    var body = $("#tablaBody"); body.textContent = "";
    var rows = visibles();
    if (!rows.length) {
      var tr = document.createElement("tr"), c = document.createElement("td");
      c.colSpan = 7; c.textContent = "Sin registros para este filtro."; tr.appendChild(c); body.appendChild(tr);
      return;
    }
    rows.forEach(function (f) {
      var tr = document.createElement("tr");
      tr.appendChild(td(f.nombre)); tr.appendChild(td(f.apellido)); tr.appendChild(td(f.telefono || "—"));
      tr.appendChild(td(f.acompanantes));

      var cEstado = document.createElement("td");
      var badge = document.createElement("span");
      badge.className = "badge " + f.estado;
      badge.textContent = L.estadoTexto(f.estado);
      cEstado.appendChild(badge); tr.appendChild(cEstado);

      tr.appendChild(td(f.confirmado_en ? new Date(f.confirmado_en).toLocaleString("es") : "—"));

      var cAcc = document.createElement("td"), wrap = document.createElement("div");
      wrap.className = "acciones";
      [["editar", "Editar", "ghost"], ["enlace", "Enlace", "ghost"], ["eliminar", "Eliminar", "danger"]].forEach(function (a) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "btn small " + a[2];
        b.textContent = a[1]; b.dataset.accion = a[0]; b.dataset.id = f.id; b.dataset.token = f.token || "";
        wrap.appendChild(b);
      });
      cAcc.appendChild(wrap); tr.appendChild(cAcc); body.appendChild(tr);
    });
  }

  $("#buscar").addEventListener("input", renderTabla);
  $("#filtroEstado").addEventListener("change", renderTabla);
  $("#recargarBtn").addEventListener("click", cargar);

  /* ---------- Alta / edición / baja ---------- */
  function resetForm() {
    $("#adminForm").reset();
    $("#regId").value = "";
    $("#admSubmit").textContent = "Agregar invitado";
    $("#cancelEditBtn").classList.add("hidden");
    $("#admAcompanantes").value = "0";
    limpiar($("#adminError"));
  }

  $("#cancelEditBtn").addEventListener("click", resetForm);

  $("#adminForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    limpiar($("#adminError"));
    var estado = $("#admEstado").value;
    var datos = {
      nombre: $("#admNombre").value, apellido: $("#admApellido").value,
      telefono: $("#admTelefono").value, acompanantes: $("#admAcompanantes").value,
      estado: estado === "cancelado" ? "asistire" : estado
    };
    var v = L.validarConfirmacion(datos, C.MAX_ACOMPANANTES || 5);
    if (!v.ok) { error($("#adminError"), v.errores.join(" ")); return; }

    var payload = {
      nombre: v.valores.nombre, apellido: v.valores.apellido, telefono: v.valores.telefono,
      acompanantes: v.valores.acompanantes, estado: v.valores.estado
    };
    var id = $("#regId").value;
    if (estado === "cancelado" && id) {
      payload = { estado: "cancelado", acompanantes: 0 };
    }

    var res = id
      ? await sb.from("invitados").update(payload).eq("id", id).select()
      : await sb.from("invitados").insert(payload).select();

    if (res.error) {
      var m = res.error.code === "23505"
        ? "Ya existe un invitado con ese nombre, apellido y teléfono."
        : "No se pudo guardar: " + res.error.message;
      error($("#adminError"), m);
      return;
    }
    toast(id ? "Registro actualizado" : "Invitado agregado");
    resetForm();
    await cargar();
  });

  $("#tablaBody").addEventListener("click", async function (e) {
    var b = e.target.closest("button[data-accion]");
    if (!b) return;
    var id = b.dataset.id, token = b.dataset.token;

    if (b.dataset.accion === "editar") {
      var f = filas.filter(function (x) { return x.id === id; })[0];
      if (!f) return;
      $("#regId").value = f.id;
      $("#admNombre").value = f.nombre; $("#admApellido").value = f.apellido;
      $("#admTelefono").value = f.telefono || "";
      $("#admAcompanantes").value = String(f.acompanantes || 0);
      $("#admEstado").value = f.estado;
      $("#admSubmit").textContent = "Guardar cambios";
      $("#cancelEditBtn").classList.remove("hidden");
      limpiar($("#adminError"));
      $("#admNombre").scrollIntoView({ behavior: "smooth", block: "center" });
      $("#admNombre").focus();
      return;
    }

    if (b.dataset.accion === "enlace") {
      var link = location.href.split("?")[0].replace(/admin\.html$/, "index.html") + "?editar=" + token;
      try { await navigator.clipboard.writeText(link); toast("Enlace privado copiado 🔗"); }
      catch (err) { window.prompt("Copia este enlace:", link); }
      return;
    }

    if (b.dataset.accion === "eliminar") {
      if (!window.confirm("¿Eliminar este registro permanentemente?")) return;
      var res = await sb.from("invitados").delete().eq("id", id);
      if (res.error) { error($("#adminError"), "No se pudo eliminar: " + res.error.message); return; }
      toast("Registro eliminado");
      await cargar();
    }
  });

  /* ---------- Exportar CSV ---------- */
  $("#exportarBtn").addEventListener("click", function () {
    if (!filas.length) { toast("No hay registros para exportar"); return; }
    var base = location.href.split("?")[0].replace(/admin\.html$/, "index.html");
    // Se construye aquí para que los enlaces apunten a index.html y no a admin.html
    var csv = "\uFEFF" + [["Nombre", "Apellido", "Teléfono", "Acompañantes", "Estado", "Respondido", "Actualizado", "Enlace_edicion"]
      .map(L.celdaCsv).join(";")].concat(filas.map(function (f) {
        var estado = { asistire: "ASISTIRÉ", no_podre: "NO PODRÉ ASISTIR", cancelado: "CANCELADO" }[f.estado] || f.estado;
        return [f.nombre, f.apellido, f.telefono, f.acompanantes, estado,
          f.confirmado_en || "", f.actualizado_en || "",
          f.token ? base + "?editar=" + f.token : ""].map(L.celdaCsv).join(";");
      })).join("\r\n");

    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    var a = document.createElement("a"); a.href = url;
    a.download = "confirmaciones-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("CSV descargado 📄");
  });

  verSesion();
})();
