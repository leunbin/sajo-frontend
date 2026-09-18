import { UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import './MobileHeader.scss';

function MobileHeader() {
  return (
    <header className="mobile-header">
      <NavLink to="/" className="mobile-header__brand">
        4JO
      </NavLink>

      <NavLink to="/account" className="mobile-header__account" aria-label="내 계좌">
        <UserRound size={21} strokeWidth={1.8} />
      </NavLink>
    </header>
  );
}

export default MobileHeader;
