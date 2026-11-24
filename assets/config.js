/* ============================================================
   CONFIGURACIÓN DEL PROYECTO
   Los datos de fecha, hora, dirección y anfitrión son PROVISORIOS:
   reemplazalos por los reales antes de publicar.
   No hay invitados ni confirmaciones precargadas.
   La clave anon es pública por diseño: la seguridad está en RLS.
   ============================================================ */
window.APP_CONFIG = {
  SUPABASE_URL: "https://euckzzihesnlnehfxivf.supabase.co",
  SUPABASE_ANON_KEY: "TU_ANON_KEY",

  EVENTO: {
    titulo: "¡Despedida de Fin de Año!",
    fechaISO: "2026-12-31T13:00:00-03:00",
    finISO: "2026-12-31T18:00:00-03:00",
    fechaTexto: "jueves, 31 de diciembre de 2026",
    horaInicio: "13:00",
    lugar: "Dirección del evento · completar en config.js",
    mapa: "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent("direccion del evento - completar en config.js"),
    anfitrion: "la organización",
    bienvenida: "Nos juntamos de día, con comida, risas y un brindis temprano para cerrar el año. Ven cómodo y con ganas, lo demás lo ponemos nosotros.",
    /* Foto de portada optimizada. Si querés sacarla, dejá "" */
    FOTO_FONDO: "assets/foto.jpg"
  },

  MAX_ACOMPANANTES: 5,
  REFRESCO_LISTA_MS: 10000
};
