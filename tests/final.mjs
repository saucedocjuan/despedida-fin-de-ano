import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const r = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

for (const f of ["index.html", "admin.html", "README.md", "assets/foto.jpg", "sql/schema.sql",
  "assets/config.js", "assets/app.js", "assets/admin.js", "assets/logica.js", "assets/styles.css"]) {
  assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), `Falta ${f}`);
}

// Versión simplificada
const html = r("index.html");
for (const ausente of ['id="music"', 'id="sobre"', 'id="calendario"', 'id="compartir"', 'class="agenda"']) {
  assert.ok(!html.includes(ausente), `Debería estar quitado: ${ausente}`);
}
for (const presente of ["¡Despedida", "de Fin de Año!", "id=\"countdown\"", "id=\"mapaBtn\"",
  "id=\"rsvpForm\"", "¡Ya confirmaron!", "class=\"tarjeta\""]) {
  assert.ok(html.includes(presente), `Falta en index.html: ${presente}`);
}

const app = r("assets/app.js");
for (const referencia of ['$("#music")', '$("#sobre")', '$("#calendario")', '$("#compartir")', '$("#sobreTexto")']) {
  assert.ok(!app.includes(referencia), `app.js aún referencia ${referencia}`);
}
assert.ok(app.includes("FOTO_FONDO"));

const config = r("assets/config.js");
assert.ok(config.includes('FOTO_FONDO: "assets/foto.jpg"'));

const admin = r("assets/admin.js");
for (const funcion of ["signInWithPassword", "Registro actualizado", "Registro eliminado", "Exportar CSV", "renderStats"]) {
  assert.ok(admin.includes(funcion) || r("admin.html").includes(funcion), `Falta en admin: ${funcion}`);
}

console.log("FINAL OK · aplicación simplificada, foto integrada y entregables completos");
