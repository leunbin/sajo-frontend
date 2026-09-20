import { ChevronDown, History, LogOut, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { getMe } from '../../api/auth';
import { handleLogout } from '../../utils/logout';

import './DesktopHeader.scss';

const navigation = [
  { label: '대시보드', path: '/' },
  { label: '종목 탐색', path: '/stocks' },
  { label: '내 전략', path: '/strategies' },
  { label: '주문·체결', path: '/orders' },
];

interface IndicatorPosition {
  width: number;
  left: number;
}

function DesktopHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [indicator, setIndicator] = useState<IndicatorPosition | null>(null);

  const activePath =
    navigation.find(({ path }) => {
      if (path === '/') {
        return location.pathname === '/';
      }

      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    })?.path ?? null;

  const onLogout = async () => {
    await handleLogout();

    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getMe();

        setUserName(user.name);
      } catch {
        setUserName('');
      }
    };

    void loadUser();
  }, []);

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

  useEffect(() => {
    const navigationElement = navigationRef.current;

    if (!navigationElement || !activePath) {
      setIndicator(null);
      return;
    }

    const activeLink = linkRefs.current.get(activePath);

    if (!activeLink) {
      setIndicator(null);
      return;
    }

    const updateIndicator = () => {
      setIndicator({
        width: activeLink.offsetWidth,
        left: activeLink.offsetLeft,
      });
    };

    updateIndicator();

    const resizeObserver = new ResizeObserver(updateIndicator);

    resizeObserver.observe(navigationElement);
    resizeObserver.observe(activeLink);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activePath]);

  return (
    <header className="desktop-header">
      <div className="desktop-header__inner">
        <NavLink to="/" className="desktop-header__brand" aria-label="4JO 홈">
          <img src="/4jo-logo-green.svg" alt="4JO" />
        </NavLink>

        <nav ref={navigationRef} className="desktop-header__navigation">
          <span
            aria-hidden="true"
            className={`desktop-header__indicator ${
              indicator ? 'desktop-header__indicator--visible' : ''
            }`}
            style={
              indicator
                ? {
                    width: `${indicator.width}px`,
                    transform: `translateX(${indicator.left}px)`,
                  }
                : undefined
            }
          />

          {navigation.map(({ label, path }) => {
            const isActive = activePath === path;

            return (
              <NavLink
                key={path}
                ref={(element) => {
                  if (element) {
                    linkRefs.current.set(path, element);
                  } else {
                    linkRefs.current.delete(path);
                  }
                }}
                to={path}
                end={path === '/'}
                className={`desktop-header__link ${isActive ? 'desktop-header__link--active' : ''}`}
              >
                {label}
              </NavLink>
            );
          })}
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

            <span>{userName || '내 계정'}</span>

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

              <NavLink
                to="/analysis-history"
                className="desktop-header__menu-item"
                onClick={() => setIsMenuOpen(false)}
              >
                <History size={17} strokeWidth={1.8} />
                <span>분석 이력</span>
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
