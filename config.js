// Dados públicos do projeto Supabase e do app Strava.
// A chave publicável e o Client ID do Strava são públicos por natureza: quem protege os dados são
// as regras (RLS) do schema.sql, e a chave secreta do Strava fica só na Edge Function.
window.CARGA_CONFIG = {
  url: "https://unpivormfvzxvglhmftk.supabase.co",
  anonKey: "sb_publishable_vochTQSPHKfuYA1AhGoemg_KTo2jagp",
  stravaClientId: "293700",
  // Primeiro dia que conta: treinos (marcados ou do Strava) antes desta data são ignorados.
  inicio: "2026-10-18"
};
