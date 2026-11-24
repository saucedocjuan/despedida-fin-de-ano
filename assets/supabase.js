/* Inicialización del cliente Supabase (UMD, sin build). */
(function () {
  var c = window.APP_CONFIG || {};
  var url = String(c.SUPABASE_URL || "");
  var key = String(c.SUPABASE_ANON_KEY || "");

  var urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
  var keyOk = key.length > 60 && !/^TU_|PLACEHOLDER|YOUR_/i.test(key);

  window.APP_READY = urlOk && keyOk && !!window.supabase;

  window.sb = window.APP_READY
    ? window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  if (!window.APP_READY) {
    console.warn("[Invitación] Supabase no configurado. Se muestran solo las secciones estáticas.");
  }
})();
