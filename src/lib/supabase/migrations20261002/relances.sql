-- HBNova Bâti - Étape 7 : journal des relances
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Prérequis : les scripts des étapes 3, 4 et 5 ont déjà été exécutés.

create table public.relances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  facture_id uuid not null references public.factures (id) on delete cascade,
  niveau smallint not null check (niveau between 1 and 3),
  canal text not null
    check (canal in ('email', 'sms', 'courrier', 'telephone')),
  envoyee_le timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index relances_facture_idx
  on public.relances (facture_id, envoyee_le desc);

alter table public.relances enable row level security;

create policy "relances_select_own" on public.relances
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "relances_insert_own" on public.relances
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.factures f
      where f.id = facture_id and f.user_id = (select auth.uid())
    )
  );

create policy "relances_update_own" on public.relances
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "relances_delete_own" on public.relances
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.relances from anon;
grant select, insert, update, delete on public.relances to authenticated;
