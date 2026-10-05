-- HBNova Bâti - Étape 4 : chantiers et historique des statuts
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Prérequis : le script de l'étape 3 (clients et contacts) a déjà été exécuté.

-- 1. Table des chantiers
create table public.chantiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  client_id uuid not null
    references public.clients (id) on delete restrict,
  intitule text not null check (length(trim(intitule)) > 0),
  statut text not null default 'nouveau_contact'
    check (statut in (
      'nouveau_contact', 'devis_a_faire', 'devis_envoye',
      'en_chantier', 'termine', 'annule'
    )),
  budget_estime numeric(12, 2)
    check (budget_estime is null or budget_estime >= 0),
  adresse text,
  date_debut date,
  date_fin date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_fin is null or date_debut is null or date_fin >= date_debut)
);

create index chantiers_user_statut_idx on public.chantiers (user_id, statut);
create index chantiers_client_idx on public.chantiers (client_id);

create trigger chantiers_set_updated_at
  before update on public.chantiers
  for each row execute function public.set_updated_at();

-- 2. Historique des changements de statut (écrit automatiquement)
create table public.chantier_statuts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  ancien_statut text,
  nouveau_statut text not null,
  changed_at timestamptz not null default now()
);

create index chantier_statuts_chantier_idx
  on public.chantier_statuts (chantier_id, changed_at desc);

create or replace function public.log_chantier_statut()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.chantier_statuts (user_id, chantier_id, ancien_statut, nouveau_statut)
    values (new.user_id, new.id, null, new.statut);
  elsif new.statut is distinct from old.statut then
    insert into public.chantier_statuts (user_id, chantier_id, ancien_statut, nouveau_statut)
    values (new.user_id, new.id, old.statut, new.statut);
  end if;
  return new;
end;
$$;

revoke execute on function public.log_chantier_statut() from public, anon, authenticated;

create trigger chantiers_log_statut
  after insert or update of statut on public.chantiers
  for each row execute function public.log_chantier_statut();

-- 3. Sécurité par ligne (RLS)
alter table public.chantiers enable row level security;
alter table public.chantier_statuts enable row level security;

create policy "chantiers_select_own" on public.chantiers
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "chantiers_insert_own" on public.chantiers
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = (select auth.uid())
    )
  );

create policy "chantiers_update_own" on public.chantiers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = (select auth.uid())
    )
  );

create policy "chantiers_delete_own" on public.chantiers
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- L'historique se lit seulement : il est écrit par le déclencheur ci-dessus
create policy "chantier_statuts_select_own" on public.chantier_statuts
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 4. Droits d'accès
revoke all on public.chantiers from anon;
revoke all on public.chantier_statuts from anon;
grant select, insert, update, delete on public.chantiers to authenticated;
grant select on public.chantier_statuts to authenticated;
