import { NavLink } from 'react-router-dom';

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
};

const linkStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  color: 'var(--color-text-muted)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
};

export function Header() {
  return (
    <header
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow)',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-primary)' }}>
        Finance Snapshot
      </span>
      <nav style={navStyle}>
        <NavLink
          to="/"
          end
          style={({ isActive }) => ({
            ...linkStyle,
            background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
          })}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/transactions"
          style={({ isActive }) => ({
            ...linkStyle,
            background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
          })}
        >
          Transactions
        </NavLink>
      </nav>
    </header>
  );
}
