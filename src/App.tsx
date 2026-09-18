import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './pages/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import AccountPage from './pages/account/AccountPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import OrdersPage from './pages/orders/OrdersPage';
import StocksPage from './pages/stocks/StocksPage';
import StrategiesPage from './pages/strategies/StrategiesPage';
import StockDetailPage from './pages/stocks/StockDetailPage';
import StrategyCreatePage from './pages/strategies/StrategyCreatePage';
import StrategyDetailPage from './pages/strategies/StrategyDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/stocks" element={<StocksPage />} />
            <Route path="/stocks/:stockCode" element={<StockDetailPage />} />
            <Route path="/strategies/new" element={<StrategyCreatePage />} />
            <Route path="/strategies/:strategyId" element={<StrategyDetailPage />} />
            <Route path="/strategies" element={<StrategiesPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
