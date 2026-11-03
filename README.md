# Carga Total

Placar de evolução na academia para duas pessoas. Cada medição e cada treino dá XP, e o nível aparece como a carga da sua barra (20 kg vazia, depois anilhas de 10, 15, 20 e 25 kg). Login sem senha, por link no e-mail.

Site estático (GitHub Pages) + Supabase (login e banco).

## Configurar o Supabase (uns 5 minutos)

1. Crie um projeto grátis em https://supabase.com.
2. **SQL Editor** → cole e rode `supabase/schema.sql`.
3. Ainda no SQL Editor, libere os dois e-mails:
   ```sql
   insert into public.allowed_emails (email) values ('voce@email.com'), ('esposa@email.com');
   ```
4. **Authentication → URL Configuration**: em *Site URL* coloque o endereço do GitHub Pages (ex.: `https://SEU-USUARIO.github.io/carga-total/`) e adicione o mesmo em *Redirect URLs*.
5. **Project Settings → API**: copie a *Project URL* e a *anon public key* para o `config.js`, faça commit e push.

A anon key pode ficar pública: quem protege os dados são as regras (RLS) do schema. Só os e-mails da tabela `allowed_emails` leem ou gravam, e cada pessoa só altera o próprio registro.

## Testar sem banco

Com o `config.js` sem preencher, a página abre em modo demonstração com dados de exemplo.
