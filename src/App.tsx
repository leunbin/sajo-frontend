import { BrowserRouter, Route, Routes } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';
import AccountPage from './pages/account/AccountPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import OrdersPage from './pages/orders/OrdersPage';
import StocksPage from './pages/stocks/StocksPage';
import StrategiesPage from './pages/strategies/StrategiesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 인증 화면 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* 로그인 후 서비스 화면 */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/stocks" element={<StocksPage />} />
          <Route path="/strategies" element={<StrategiesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
