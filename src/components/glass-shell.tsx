import Image from "next/image";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function GlassShell({ title, subtitle, children }: Props) {
  return (
    <main className="glass-page">
      <div className="glass-bg" aria-hidden="true">
        <span className="glass-blob b1" />
        <span className="glass-blob b2" />
        <span className="glass-blob b3" />
        <svg
          className="glass-lines"
          viewBox="0 0 1000 700"
          preserveAspectRatio="xMidYMid slice"
        >
          <line x1="560" y1="0" x2="1000" y2="520" stroke="#e65100" strokeWidth="1.5" opacity="0.22" />
          <line x1="640" y1="0" x2="1000" y2="430" stroke="#e65100" strokeWidth="1" opacity="0.14" />
          <line x1="0" y1="698" x2="1000" y2="698" stroke="#e65100" strokeWidth="3" opacity="0.3" />
          <polygon points="0,0 260,0 0,230" fill="#e65100" opacity="0.06" />
        </svg>
      </div>

      <section className="glass-card">
        <Image
          src="/brand/hbnova_icone.svg"
          alt="Logo HBNova Bâti"
          width={64}
          height={64}
          priority
          className="mx-auto drop-shadow-lg"
        />
        <h1 className="mt-5 text-center font-display text-[22px] font-semibold leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="glass-muted mb-6 mt-1 text-center text-sm">{subtitle}</p>
        )}
        {children}
      </section>
    </main>
  );
}
