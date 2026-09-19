import React from 'react';
import Icon from './Icon';
import Logo from './Logo';
import FileBadge from './FileBadge';
import ThemeToggle from './ThemeToggle';

const FEATURES = [
  { icon: 'shield', title: 'Private by design', text: 'Your files are only ever visible to you.' },
  { icon: 'eye', title: 'View instantly', text: 'Open PDFs, images and Office files right in the browser.' },
  { icon: 'bolt', title: 'Fast uploads', text: 'Drag, drop and you are done — with live progress.' },
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="absolute right-5 top-5 z-10 lg:right-8 lg:top-8">
        <ThemeToggle variant="light" className="bg-surface shadow-sm ring-1 ring-ink/10 lg:hidden" />
        <ThemeToggle variant="dark" className="hidden lg:inline-flex" />
      </div>

      <aside className="relative hidden flex-col justify-between overflow-hidden bg-night-900 p-14 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-vault opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-vault-glow/20 blur-3xl" />

        <div className="relative">
          <Logo size="lg" />
        </div>

        <div className="relative">
          <h2 className="max-w-lg font-serif text-5xl leading-[1.1]">
            Every document you own, in{' '}
            <span className="text-vault-glow">one beautiful vault.</span>
          </h2>
          <ul className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-vault-glow ring-1 ring-white/15">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-white/55">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* floating document cards */}
        <div className="pointer-events-none absolute right-10 top-1/2 hidden w-56 -translate-y-1/2 xl:block">
          {[
            { t: 'pdf', r: '6deg', top: '-7rem', d: '0s' },
            { t: 'docx', r: '-5deg', top: '0rem', d: '1.4s' },
            { t: 'xlsx', r: '4deg', top: '7rem', d: '2.6s' },
          ].map((c) => (
            <div
              key={c.t}
              style={{ '--r': c.r, top: c.top, animationDelay: c.d }}
              className="absolute right-0 w-52 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur-md animate-float"
            >
              <div className="flex items-center gap-3">
                <FileBadge type={c.t} size="sm" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 w-4/5 rounded-full bg-white/30" />
                  <div className="h-2 w-1/2 rounded-full bg-white/15" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} KStore</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8 lg:hidden">
            <Logo dark={false} />
          </div>
          <div className="card p-8 shadow-lift">
            <h1 className="font-serif text-3xl text-ink">{title}</h1>
            <p className="mb-7 mt-1.5 text-sm text-slate">{subtitle}</p>
            {children}
          </div>
          <p className="mt-6 text-center text-sm text-slate">{footer}</p>
        </div>
      </main>
    </div>
  );
}
