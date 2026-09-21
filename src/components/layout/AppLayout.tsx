import { Outlet } from 'react-router-dom';

import HelpChat from '../help-chat/HelpChat';
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
      <HelpChat />
    </div>
  );
}

export default AppLayout;
