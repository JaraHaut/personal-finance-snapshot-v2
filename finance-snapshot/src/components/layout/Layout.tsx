import type { ReactNode } from 'react';
import { Header } from './Header';
import { ImportsList } from '../import/ImportsList';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main app layout: sticky header + sidebar (imports list) + main content area.
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 220,
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            padding: '16px 12px',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <ImportsList />
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
