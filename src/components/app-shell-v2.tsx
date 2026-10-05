import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import NavLinks from "./nav-links";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default async function AppShell({
  title,
  subtitle,
  actions,
  children,
}: Props) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = (data?.claims as { email?: string } | undefined)?.email ?? "";

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-anthracite p-4 text-white md:flex">
        <div className="mb-6 flex items-center gap-3 px-2">
          <Image
            src="/brand/hbnova_icone.svg"
            alt=""
            width={36}
            height={36}
          />
          <div className="font-display leading-tight">
            <span className="block font-semibold italic">HBNova Bâti</span>
            <span className="block text-xs font-normal not-italic text-white/60">
              Gestion commerciale
            </span>
          </div>
        </div>
        <NavLinks variant="side" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-end gap-3 border-b border-line bg-surface px-6 py-3">
          <span className="truncate text-sm text-muted">{email}</span>
          <Link
            href="/securite"
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-brand"
          >
            Sécurité
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-brand"
            >
              Se déconnecter
            </button>
          </form>
        </header>

        <main className="flex-1 px-6 py-6 pb-24 md:pb-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold">{title}</h1>
              {subtitle && <p className="text-muted">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-anthracite md:hidden"
      >
        <NavLinks variant="bottom" />
      </nav>
    </div>
  );
}
