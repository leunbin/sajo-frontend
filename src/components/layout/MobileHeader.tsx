import { LogOut, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { handleLogout } from '../../utils/logout';
import './MobileHeader.scss';

function MobileHeader() {
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
    <header className="mobile-header">
      <Link to="/" className="mobile-header__brand">
        4JO
      </Link>

      <div className="mobile-header__user" ref={menuRef}>
        <button
          type="button"
          className="mobile-header__profile"
          aria-label="사용자 메뉴"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <UserRound size={21} strokeWidth={1.8} />
        </button>

        {isMenuOpen && (
          <div className="mobile-header__menu">
            <Link
              to="/account"
              className="mobile-header__menu-item"
              onClick={() => setIsMenuOpen(false)}
            >
              <UserRound size={17} strokeWidth={1.8} />
              <span>내 계좌</span>
            </Link>

            <div className="mobile-header__menu-divider" />

            <button
              type="button"
              className="mobile-header__menu-item mobile-header__menu-item--logout"
              onClick={onLogout}
            >
              <LogOut size={17} strokeWidth={1.8} />
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default MobileHeader;
