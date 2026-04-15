import type { ReactNode } from 'react';
import { Header } from './Header';
import { ImportsList } from '../import/ImportsList';

interface LayoutProps {
  children: ReactNode;
}

const MAX_WIDTH = 1400;

/**
 * App shell: sticky header + centered max-width body with sidebar + main.
 *
 * ┌──────────────────── header (full-width) ────────────────────┐
 * │  ┌────────── max-width container (centered) ─────────────┐  │
 * │  │  sidebar (260px, fixed)  │  main (flex-1, max ~1060px)│  │
 * │  └───────────────────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────────┘
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Centered content band */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: '100%',
            maxWidth: MAX_WIDTH,
            display: 'flex',
            flex: 1,
            /* Slight horizontal padding so content never kisses the browser edge */
            padding: '0 24px',
          }}
        >
          {/* Sidebar */}
          <aside
            style={{
              width: 260,
              flexShrink: 0,
              borderRight: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              padding: '24px 16px',
              overflowY: 'auto',
            }}
          >
            <ImportsList />
          </aside>

          {/* Main content */}
          <main
            style={{
              flex: 1,
              minWidth: 0,          /* prevents flex children from overflowing */
              padding: '32px 36px',
              overflowY: 'auto',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
