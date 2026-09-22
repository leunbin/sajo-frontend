import { BrowserRouter, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './pages/auth/ProtectedRoute';
import AdminRoute from './pages/auth/AdminRoute';

import AppLayout from './components/layout/AppLayout';
import PageTitle from './components/common/PageTitle';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

import AccountPage from './pages/account/AccountPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import OrdersPage from './pages/orders/OrdersPage';

import StocksPage from './pages/stocks/StocksPage';
import StockDetailPage from './pages/stocks/StockDetailPage';

import StrategiesPage from './pages/strategies/StrategiesPage';
import StrategyCreatePage from './pages/strategies/StrategyCreatePage';
import StrategyDetailPage from './pages/strategies/StrategyDetailPage';
import StrategyEditPage from './pages/strategies/StrategyEditPage';
import BacktestPage from './pages/strategies/BacktestPage';
import AiRiskAnalysisPage from './pages/strategies/AiRiskAnalysisPage';

import AnalysisHistoryPage from './pages/history/AnalysisHistoryPage';
import AiRiskAnalysisDetailPage from './pages/history/AiRiskAnalysisDetailPage';

import AdminPage from './pages/admin/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <PageTitle />

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/signup" element={<SignupPage />} />

        {/* 일반 사용자 영역 */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />

            <Route path="/stocks" element={<StocksPage />} />

            <Route path="/stocks/:stockCode" element={<StockDetailPage />} />

            <Route path="/strategies" element={<StrategiesPage />} />

            <Route path="/strategies/new" element={<StrategyCreatePage />} />

            <Route path="/strategies/:strategyId" element={<StrategyDetailPage />} />

            <Route path="/strategies/:strategyId/edit" element={<StrategyEditPage />} />

            <Route path="/strategies/:strategyId/backtest" element={<BacktestPage />} />

            <Route
              path="/strategies/:strategyId/backtests/:backtestId/analysis"
              element={<AiRiskAnalysisPage />}
            />

            <Route path="/analysis-history" element={<AnalysisHistoryPage />} />

            <Route path="/analysis-history/ai/:analysisId" element={<AiRiskAnalysisDetailPage />} />

            <Route path="/orders" element={<OrdersPage />} />

            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Route>

        {/* 관리자 영역 */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
