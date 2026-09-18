import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { handleLogout } from '../../utils/logout';
import './DesktopHeader.scss';

const navigation = [
  { label: '대시보드', path: '/' },
  { label: '종목 탐색', path: '/stocks' },
  { label: '내 전략', path: '/strategies' },
  { label: '주문·체결', path: '/orders' },
];

function DesktopHeader() {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const onLogout = async () => {
    await handleLogout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

        <div className="desktop-header__user" ref={menuRef}>
          <button
            type="button"
            className="desktop-header__profile"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-label="사용자 메뉴"
          >
            <span className="desktop-header__profile-icon">
              <UserRound size={18} strokeWidth={1.8} />
            </span>

            <span>내 계정</span>

            <ChevronDown
              size={15}
              strokeWidth={1.8}
              className={`desktop-header__chevron ${
                isMenuOpen ? 'desktop-header__chevron--open' : ''
              }`}
            />
          </button>

          {isMenuOpen && (
            <div className="desktop-header__menu">
              <NavLink
                to="/account"
                className="desktop-header__menu-item"
                onClick={() => setIsMenuOpen(false)}
              >
                <UserRound size={17} strokeWidth={1.8} />
                <span>내 계좌</span>
              </NavLink>

              <div className="desktop-header__menu-divider" />

              <button
                type="button"
                className="desktop-header__menu-item desktop-header__menu-item--logout"
                onClick={onLogout}
              >
                <LogOut size={17} strokeWidth={1.8} />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default DesktopHeader;
