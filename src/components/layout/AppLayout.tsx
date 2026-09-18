import { Outlet } from 'react-router-dom';

import BottomNavigation from './BottomNavigation';
import DesktopHeader from './DesktopHeader';
import MobileHeader from './MobileHeader';

import './AppLayout.scss';

function AppLayout() {
  return (
    <div className="app-layout">
      <DesktopHeader />
      <MobileHeader />

      <main className="app-layout__content">
        <Outlet />
      </main>

      <BottomNavigation />
    </div>
  );
}

export default AppLayout;
