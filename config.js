// Krashout OS — configuración pública.
// La "anon key" de Supabase está hecha para ir en el navegador: sola no abre nada,
// porque las reglas RLS (supabase/schema.sql) solo dejan ver y cambiar las filas de quien inició sesión.
// NUNCA pongas aquí la "service_role key".
window.KRASHOUT_CONFIG = {
  supabaseUrl: 'PEGAR_PROJECT_URL',      // ej. https://abcdefghijkl.supabase.co
  supabaseAnonKey: 'PEGAR_ANON_KEY'      // Project Settings → API → anon public
};
