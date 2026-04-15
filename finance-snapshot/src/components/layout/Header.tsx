import { NavLink } from 'react-router-dom';

const linkStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  color: 'var(--color-text-muted)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
  transition: 'background 0.15s, color 0.15s',
};

/**
 * Sticky header whose inner band is capped at the same max-width as the body,
 * so the logo and nav always align with the sidebar and main content.
 */
export function Header() {
  return (
    <header
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(15,23,42,.06)',
      }}
    >
      {/* Inner band — mirrors Layout's centering + padding */}
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 750, fontSize: 15, letterSpacing: '-0.03em', color: 'var(--color-primary)' }}>
          Finance Snapshot
        </span>

        <nav style={{ display: 'flex', gap: 4 }}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              ...linkStyle,
              background: isActive ? 'rgba(91,94,244,.10)' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            })}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/transactions"
            style={({ isActive }) => ({
              ...linkStyle,
              background: isActive ? 'rgba(91,94,244,.10)' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            })}
          >
            Transactions
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
