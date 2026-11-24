import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const L = require("../assets/logica.js");

// Sintaxis de los archivos JS de la etapa 1
for (const f of ["config.js", "supabase.js", "logica.js"]) {
  execFileSync(process.execPath, ["--check", new URL(`../assets/${f}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1")], { stdio: "pipe" });
}

// Validación de formularios
const buena = L.validarConfirmacion({
  nombre: "Prueba", apellido: "Control", telefono: "+54 9 11 1234-5678",
  acompanantes: 2, estado: "asistire"
}, 5);
assert.equal(buena.ok, true, JSON.stringify(buena.errores));
assert.equal(buena.valores.telefono, "+54 9 11 1234-5678");

const mala = L.validarConfirmacion({
  nombre: "A", apellido: "", telefono: "abc", acompanantes: 9, estado: "no_podre"
}, 5);
assert.equal(mala.ok, false);
assert.ok(mala.errores.length >= 4);

// Duplicados: normalización de nombre, apellido y teléfono
assert.equal(
  L.clavePersona(" Prueba ", "Control", "11-1234"),
  L.clavePersona("prueba", "control", "111234")
);

// Totales: solo cuentan quienes asistirán
const totales = L.calcularTotales([
  { estado: "asistire", acompanantes: 2 },
  { estado: "asistire", acompanantes: 0 },
  { estado: "no_podre", acompanantes: 3 },
  { estado: "cancelado", acompanantes: 1 }
]);
assert.deepEqual(totales, { personas: 2, acompanantes: 2, total: 4 });

// CSV: evitar inyección de fórmulas
assert.ok(L.celdaCsv("=SUM(A1)").startsWith("'="));

// Esquema SQL
const sql = readFileSync(new URL("../sql/schema.sql", import.meta.url), "utf8");
for (const needle of [
  "create table if not exists public.invitados",
  "create table if not exists public.admins",
  "enable row level security",
  "confirmar_asistencia",
  "actualizar_mi_confirmacion",
  "listado_confirmados",
  "totales_publicos",
  "DUPLICADO"
]) assert.ok(sql.includes(needle), `Falta en SQL: ${needle}`);
assert.match(sql, /token\s+uuid\s+not\s+null\s+unique/);

for (const ejemplo of ["Juan", "María", "Test User", "ejemplo@ejemplo.com"]) {
  assert.ok(!sql.includes(ejemplo), `Dato ficticio en SQL: ${ejemplo}`);
}

console.log("ETAPA 1 OK · sintaxis, validación, duplicados, totales, CSV y esquema SQL");
