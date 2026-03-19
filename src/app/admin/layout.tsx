'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/cards-v2', label: '📋 Cards' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="dark min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="text-2xl">🎴</span>
              <h1 className="text-lg font-bold tracking-tight">
                THE SHAPE GAME
              </h1>
            </Link>
            <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-neutral-800 text-neutral-100'
                      : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="w-px h-5 bg-neutral-800 mx-2" />
            <Link
              href="/open"
              className="text-sm px-3 py-1.5 rounded-md bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 transition-colors"
            >
              3D Preview
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Toast notifications */}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            border: '1px solid #333',
            color: '#e5e5e5',
          },
        }}
      />
    </div>
  );
}
