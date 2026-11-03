-- Carga Total: rode este arquivo inteiro no SQL Editor do Supabase.

-- E-mails liberados para usar o placar (fica fora do alcance da página: sem policies = ninguém lê pelo site).
create table if not exists public.allowed_emails (
  email text primary key
);
alter table public.allowed_emails enable row level security;

-- Um registro por pessoa: perfil + medições + dias de treino.
create table if not exists public.players (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 1 and 24),
  mascot text,
  goal text not null default 'recomp' check (goal in ('emagrecer', 'ganhar', 'recomp')),
  height numeric,
  measurements jsonb not null default '[]'::jsonb,
  checkins jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.players enable row level security;

create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Membros veem todo mundo (é um duelo); cada um só cria, altera e apaga o próprio registro.
drop policy if exists "membros leem" on public.players;
create policy "membros leem" on public.players
  for select to authenticated using (public.is_member());

drop policy if exists "cria o proprio" on public.players;
create policy "cria o proprio" on public.players
  for insert to authenticated with check (id = auth.uid() and public.is_member());

drop policy if exists "edita o proprio" on public.players;
create policy "edita o proprio" on public.players
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and public.is_member());

drop policy if exists "apaga o proprio" on public.players;
create policy "apaga o proprio" on public.players
  for delete to authenticated using (id = auth.uid());

-- Atualização ao vivo: quando um registra, a tela do outro atualiza sozinha.
do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;

-- Por último, libere os dois e-mails (troque pelos de vocês e rode só estas linhas):
-- insert into public.allowed_emails (email) values ('voce@email.com'), ('esposa@email.com');
