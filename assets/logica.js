/* Lógica pura y reutilizable. Funciona en navegador y en Node (para tests). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Logica = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function soloDigitos(v) {
    return String(v == null ? "" : v).replace(/[^0-9]/g, "");
  }

  function validarConfirmacion(d, maxAcompanantes) {
    var max = Number(maxAcompanantes || 5);
    var errores = [];
    var nombre = String((d && d.nombre) || "").trim();
    var apellido = String((d && d.apellido) || "").trim();
    var telefono = String((d && d.telefono) || "").trim();
    var acompanantes = Number((d && d.acompanantes) || 0);
    var estado = String((d && d.estado) || "");

    if (nombre.length < 2 || nombre.length > 80) errores.push("Escribe tu nombre (2 a 80 caracteres).");
    if (apellido.length < 2 || apellido.length > 80) errores.push("Escribe tu apellido (2 a 80 caracteres).");
    if (telefono && !/^\+?[0-9 ()\-]{6,30}$/.test(telefono)) errores.push("El teléfono no parece válido.");
    if (!Number.isInteger(acompanantes) || acompanantes < 0 || acompanantes > max) {
      errores.push("Cantidad no válida (0 a " + max + ").");
    }
    if (estado !== "asistire" && estado !== "no_podre") errores.push("Selecciona ASISTIRÉ o NO PODRÉ ASISTIR.");
    if (estado === "no_podre" && acompanantes !== 0) errores.push("Cantidad debe ser 0 si no asistes.");

    return {
      ok: errores.length === 0,
      errores: errores,
      valores: {
        nombre: nombre,
        apellido: apellido,
        telefono: telefono || null,
        acompanantes: estado === "asistire" ? acompanantes : 0,
        estado: estado
      }
    };
  }

  function sinAcentos(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function clavePersona(nombre, apellido, telefono) {
    return [nombre, apellido, soloDigitos(telefono)]
      .map(function (x) { return sinAcentos(String(x || "").trim().toLowerCase()); })
      .join("|");
  }

  function calcularTotales(filas) {
    var personas = 0, acompanantes = 0;
    (filas || []).forEach(function (f) {
      if (!f || f.estado !== "asistire") return;
      personas += 1;
      acompanantes += Number(f.acompanantes || 0);
    });
    return { personas: personas, acompanantes: acompanantes, total: personas + acompanantes };
  }

  function celdaCsv(valor) {
    var s = String(valor == null ? "" : valor);
    // Evita inyección de fórmulas al abrir en Excel.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function aCsv(filas) {
    var cabecera = ["Nombre", "Apellido", "Teléfono", "Acompañantes", "Estado", "Respondido", "Actualizado", "Enlace_edicion"];
    var estadoTxt = { asistire: "ASISTIRÉ", no_podre: "NO PODRÉ ASISTIR", cancelado: "CANCELADO" };
    var lineas = [cabecera.map(celdaCsv).join(";")];

    (filas || []).forEach(function (f) {
      var base = typeof location !== "undefined" ? String(location.href || "").split("?")[0] : "";
      var enlace = f.token ? base + "?editar=" + f.token : "";
      lineas.push([
        f.nombre, f.apellido, f.telefono,
        f.acompanantes, estadoTxt[f.estado] || f.estado,
        f.confirmado_en || "", f.actualizado_en || "", enlace
      ].map(celdaCsv).join(";"));
    });

    return "\uFEFF" + lineas.join("\r\n");
  }

  function estadoTexto(e) {
    return { asistire: "ASISTIRÉ", no_podre: "NO PODRÉ ASISTIR", cancelado: "CANCELADO" }[e] || e || "—";
  }

  return {
    soloDigitos: soloDigitos,
    validarConfirmacion: validarConfirmacion,
    clavePersona: clavePersona,
    calcularTotales: calcularTotales,
    celdaCsv: celdaCsv,
    aCsv: aCsv,
    estadoTexto: estadoTexto
  };
});
