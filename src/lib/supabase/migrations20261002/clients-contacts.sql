-- HBNova Bâti - Étape 3 : clients et contacts
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.

-- 1. Fonction qui met à jour la date de modification automatiquement
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Table des clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  type text not null default 'particulier'
    check (type in ('particulier', 'professionnel')),
  nom text not null check (length(trim(nom)) > 0),  -- nom ou raison sociale
  telephone text,
  email text,
  adresse_facturation text,
  adresse_chantier text,
  notes text,
  archived_at timestamptz,                           -- suppression logique
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_user_nom_idx on public.clients (user_id, lower(nom));
create index clients_user_archived_idx on public.clients (user_id, archived_at);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- 3. Table des contacts (plusieurs interlocuteurs par client)
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  nom text not null check (length(trim(nom)) > 0),
  fonction text,
  telephone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_client_idx on public.contacts (client_id);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- 4. Sécurité par ligne (RLS) : chaque utilisateur ne voit que ses données
alter table public.clients enable row level security;
alter table public.contacts enable row level security;

create policy "clients_select_own" on public.clients
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "clients_insert_own" on public.clients
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "clients_update_own" on public.clients
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "clients_delete_own" on public.clients
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "contacts_select_own" on public.contacts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "contacts_insert_own" on public.contacts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = (select auth.uid())
    )
  );

create policy "contacts_update_own" on public.contacts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = (select auth.uid())
    )
  );

create policy "contacts_delete_own" on public.contacts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 5. Droits d'accès : seuls les utilisateurs connectés, jamais le public
revoke all on public.clients from anon;
revoke all on public.contacts from anon;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
