# Carga Total

Placar pessoal de evolução na academia. Cada medição e cada treino dá XP, e o nível aparece como a carga da sua barra (20 kg vazia, depois anilhas de 10, 15, 20 e 25 kg). Cada pessoa tem o próprio perfil e só vê os próprios dados. Login sem senha, por link no e-mail. Treinos do Strava podem entrar sozinhos.

Site estático (GitHub Pages) + Supabase (login, banco e uma função para o Strava).

## 1. Supabase (uns 5 minutos)

1. Crie um projeto grátis em https://supabase.com.
2. **SQL Editor** → cole e rode `supabase/schema.sql`.
3. Ainda no SQL Editor, libere os e-mails de quem vai usar:
   ```sql
   insert into public.allowed_emails (email) values ('voce@email.com'), ('esposa@email.com');
   ```
4. **Authentication → URL Configuration**: em *Site URL* coloque o endereço do GitHub Pages (ex.: `https://SEU-USUARIO.github.io/carga-total/`) e adicione o mesmo em *Redirect URLs*.
5. **Project Settings → API**: copie a *Project URL* e a *anon public key* para o `config.js`, faça commit e push.

## 2. Strava (opcional, uns 10 minutos)

1. Em https://www.strava.com/settings/api crie um app. Em *Authorization Callback Domain* coloque `SEU-USUARIO.github.io`.
2. Copie o **Client ID** para `stravaClientId` no `config.js`.
3. No Supabase, **Edge Functions → Deploy a new function → Via Editor**, nome `strava`, cole o conteúdo de `supabase/functions/strava/index.ts` e publique.
4. **Edge Functions → Secrets**: crie `STRAVA_CLIENT_ID` e `STRAVA_CLIENT_SECRET` com os valores do app do Strava.
5. Apps novos do Strava aceitam só a conta do dono. Para a segunda pessoa conectar, peça o aumento de capacidade de atletas na própria página de API do Strava.

## Segurança

A anon key e o Client ID podem ficar públicos. As regras (RLS) do schema garantem que só os e-mails liberados entram e que cada pessoa só lê e altera o próprio registro. Os tokens do Strava ficam numa tabela que a página não consegue ler; só a Edge Function usa.

## Testar sem banco

Com o `config.js` sem preencher, a página abre em modo demonstração com dados de exemplo.
