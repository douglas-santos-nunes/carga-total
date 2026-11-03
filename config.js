// Preencha com os dados do seu projeto Supabase (Project Settings > API).
// A anon key e o Client ID do Strava são públicos por natureza: quem protege os dados são
// as regras (RLS) do schema.sql, e a chave secreta do Strava fica só na Edge Function.
window.CARGA_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA-ANON-KEY",
  stravaClientId: "SEU-CLIENT-ID-STRAVA" // opcional
};
