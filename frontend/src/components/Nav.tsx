"use client";

import { BarChart3, FlaskConical, LineChart, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "ภาพรวม", icon: BarChart3 },
  { href: "/simulator/", label: "AI Simulator", icon: FlaskConical },
  { href: "/backtest/", label: "Backtest", icon: LineChart },
];

export default function Nav() {
  const path = usePathname();
  const norm = (p: string) => (p.endsWith("/") ? p : `${p}/`);
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-page/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
            <Sparkles size={16} aria-hidden />
          </span>
          <span className="hidden sm:inline">LottoAI</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto" aria-label="หลัก">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = norm(path) === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-raised font-medium text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                <Icon size={15} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
