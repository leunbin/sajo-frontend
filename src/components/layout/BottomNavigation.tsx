import { ChartNoAxesCombined, House, Search, ListOrdered } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import './BottomNavigation.scss';

const navigation = [
  { label: '홈', path: '/', icon: House },
  { label: '종목', path: '/stocks', icon: Search },
  { label: '전략', path: '/strategies', icon: ChartNoAxesCombined },
  { label: '주문', path: '/orders', icon: ListOrdered },
];

function BottomNavigation() {
  return (
    <nav className="bottom-navigation">
      {navigation.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `bottom-navigation__item ${isActive ? 'bottom-navigation__item--active' : ''}`
          }
        >
          <Icon size={21} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNavigation;
