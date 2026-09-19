import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const getPageTitle = (pathname: string) => {
  if (pathname === '/') return '대시보드';

  if (pathname === '/stocks') return '종목 탐색';

  // 상세 페이지는 각 페이지에서 실제 이름으로 설정
  if (/^\/stocks\/[^/]+$/.test(pathname)) return null;

  if (pathname === '/strategies') return '내 전략';
  if (pathname === '/strategies/new') return '전략 만들기';

  // 상세 페이지는 각 페이지에서 실제 전략 이름으로 설정
  if (/^\/strategies\/[^/]+$/.test(pathname)) return null;

  if (pathname === '/orders') return '주문·체결';
  if (pathname === '/account') return '내 계좌';

  if (pathname === '/analysis-history') return '분석 이력';

  if (/^\/analysis-history\/ai\/[^/]+$/.test(pathname)) {
    return 'AI 분석 상세';
  }

  if (pathname === '/login') return '로그인';
  if (pathname === '/signup') return '회원가입';

  return 'SAJO';
};

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const pageTitle = getPageTitle(pathname);

    if (pageTitle === null) {
      return;
    }

    document.title = pageTitle === 'SAJO' ? 'SAJO' : `${pageTitle} | SAJO`;
  }, [pathname]);

  return null;
}

export default PageTitle;
