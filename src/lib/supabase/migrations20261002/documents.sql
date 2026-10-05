-- HBNova Bâti - Étape 5 : devis, factures, paiements et stockage des PDF
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Prérequis : les scripts des étapes 3 et 4 ont déjà été exécutés.

-- 1. Devis (les numéros viennent de votre logiciel de facturation)
create table public.devis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  chantier_id uuid not null
    references public.chantiers (id) on delete restrict,
  numero text not null check (length(trim(numero)) > 0),
  statut text not null default 'envoye'
    check (statut in ('envoye', 'accepte', 'refuse', 'expire')),
  date_emission date not null default current_date,
  date_validite date,
  montant_ht numeric(12, 2) not null check (montant_ht >= 0),
  montant_ttc numeric(12, 2) not null,
  montant_tva numeric(12, 2) generated always as (montant_ttc - montant_ht) stored,
  pdf_path text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, numero),
  check (montant_ttc >= montant_ht),
  check (date_validite is null or date_validite >= date_emission)
);

create index devis_chantier_idx on public.devis (chantier_id);

create trigger devis_set_updated_at
  before update on public.devis
  for each row execute function public.set_updated_at();

-- 2. Factures (acompte, situation ou solde)
create table public.factures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  chantier_id uuid not null
    references public.chantiers (id) on delete restrict,
  numero text not null check (length(trim(numero)) > 0),
  type text not null default 'acompte'
    check (type in ('acompte', 'situation', 'solde')),
  date_emission date not null default current_date,
  date_echeance date not null,
  montant_ht numeric(12, 2) not null check (montant_ht >= 0),
  montant_ttc numeric(12, 2) not null,
  montant_tva numeric(12, 2) generated always as (montant_ttc - montant_ht) stored,
  pdf_path text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, numero),
  check (montant_ttc >= montant_ht),
  check (date_echeance >= date_emission)
);

create index factures_chantier_idx on public.factures (chantier_id);

create trigger factures_set_updated_at
  before update on public.factures
  for each row execute function public.set_updated_at();

-- 3. Paiements reçus
create table public.paiements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  facture_id uuid not null references public.factures (id) on delete cascade,
  date_paiement date not null default current_date,
  montant numeric(12, 2) not null check (montant > 0),
  mode text not null default 'virement'
    check (mode in ('virement', 'cheque', 'especes', 'carte', 'autre')),
  notes text,
  created_at timestamptz not null default now()
);

create index paiements_facture_idx on public.paiements (facture_id);

-- 4. Vue de suivi : montant payé, reste à payer et statut de paiement calculés
create view public.factures_suivi
with (security_invoker = true) as
select
  f.*,
  coalesce(p.paye, 0) as montant_paye,
  f.montant_ttc - coalesce(p.paye, 0) as reste_a_payer,
  case
    when coalesce(p.paye, 0) >= f.montant_ttc then 'payee'
    when f.date_echeance < current_date then 'en_retard'
    when coalesce(p.paye, 0) > 0 then 'partielle'
    else 'a_payer'
  end as statut_paiement
from public.factures f
left join (
  select facture_id, sum(montant) as paye
  from public.paiements
  group by facture_id
) p on p.facture_id = f.id;

-- 5. Sécurité par ligne (RLS)
alter table public.devis enable row level security;
alter table public.factures enable row level security;
alter table public.paiements enable row level security;

create policy "devis_select_own" on public.devis
  for select to authenticated using (user_id = (select auth.uid()));
create policy "devis_insert_own" on public.devis
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.chantiers c
                where c.id = chantier_id and c.user_id = (select auth.uid()))
  );
create policy "devis_update_own" on public.devis
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.chantiers c
                where c.id = chantier_id and c.user_id = (select auth.uid()))
  );
create policy "devis_delete_own" on public.devis
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "factures_select_own" on public.factures
  for select to authenticated using (user_id = (select auth.uid()));
create policy "factures_insert_own" on public.factures
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.chantiers c
                where c.id = chantier_id and c.user_id = (select auth.uid()))
  );
create policy "factures_update_own" on public.factures
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.chantiers c
                where c.id = chantier_id and c.user_id = (select auth.uid()))
  );
create policy "factures_delete_own" on public.factures
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "paiements_select_own" on public.paiements
  for select to authenticated using (user_id = (select auth.uid()));
create policy "paiements_insert_own" on public.paiements
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.factures f
                where f.id = facture_id and f.user_id = (select auth.uid()))
  );
create policy "paiements_update_own" on public.paiements
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "paiements_delete_own" on public.paiements
  for delete to authenticated using (user_id = (select auth.uid()));

-- 6. Droits d'accès
revoke all on public.devis from anon;
revoke all on public.factures from anon;
revoke all on public.paiements from anon;
revoke all on public.factures_suivi from anon;
grant select, insert, update, delete on public.devis to authenticated;
grant select, insert, update, delete on public.factures to authenticated;
grant select, insert, update, delete on public.paiements to authenticated;
grant select on public.factures_suivi to authenticated;

-- 7. Stockage privé des PDF (chaque utilisateur n'accède qu'à son dossier)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy "documents_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "documents_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "documents_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "documents_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
