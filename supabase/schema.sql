-- Carga Total: rode este arquivo inteiro no SQL Editor do Supabase.

-- E-mails liberados para usar o placar (sem policies: a página não consegue ler esta tabela).
create table if not exists public.allowed_emails (
  email text primary key
);
alter table public.allowed_emails enable row level security;

-- Um registro por pessoa: perfil, medições, dias de treino e resumo do Strava.
create table if not exists public.players (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 1 and 24),
  mascot text,
  color text not null default 'p25' check (color in ('p10', 'p15', 'p20', 'p25')),
  goal text not null default 'recomp' check (goal in ('emagrecer', 'ganhar', 'recomp')),
  height numeric,
  measurements jsonb not null default '[]'::jsonb,
  checkins jsonb not null default '[]'::jsonb,
  strava jsonb,
  created_at timestamptz not null default now()
);
alter table public.players enable row level security;
-- Meta de treinos por semana de cada pessoa (mantém a sequência).
alter table public.players add column if not exists weekly_goal smallint not null default 3 check (weekly_goal between 1 and 7);

-- Tokens do Strava: só a Edge Function (service role) mexe aqui; sem policies para a página.
create table if not exists public.strava_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  updated_at timestamptz not null default now()
);
alter table public.strava_tokens enable row level security;

create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Cada pessoa só vê e altera o próprio registro.
drop policy if exists "membros leem" on public.players;
drop policy if exists "le o proprio" on public.players;
create policy "le o proprio" on public.players
  for select to authenticated using (id = auth.uid() and public.is_member());

drop policy if exists "cria o proprio" on public.players;
create policy "cria o proprio" on public.players
  for insert to authenticated with check (id = auth.uid() and public.is_member());

drop policy if exists "edita o proprio" on public.players;
create policy "edita o proprio" on public.players
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and public.is_member());

drop policy if exists "apaga o proprio" on public.players;
create policy "apaga o proprio" on public.players
  for delete to authenticated using (id = auth.uid());

-- Atualização ao vivo entre aparelhos (celular e computador da mesma pessoa).
do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;

-- Por último, libere os e-mails (troque pelos de vocês e rode só esta linha):
-- insert into public.allowed_emails (email) values ('voce@email.com'), ('esposa@email.com');
