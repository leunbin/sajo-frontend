import { UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import './DesktopHeader.scss';

const navigation = [
  { label: '대시보드', path: '/' },
  { label: '종목 탐색', path: '/stocks' },
  { label: '내 전략', path: '/strategies' },
  { label: '주문·체결', path: '/orders' },
];

function DesktopHeader() {
  return (
    <header className="desktop-header">
      <div className="desktop-header__inner">
        <NavLink to="/" className="desktop-header__brand">
          4JO
        </NavLink>

        <nav className="desktop-header__navigation">
          {navigation.map(({ label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `desktop-header__link ${isActive ? 'desktop-header__link--active' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/account"
          className={({ isActive }) =>
            `desktop-header__account ${isActive ? 'desktop-header__account--active' : ''}`
          }
        >
          <UserRound size={18} strokeWidth={1.8} />
          <span>내 계좌</span>
        </NavLink>
      </div>
    </header>
  );
}

export default DesktopHeader;
