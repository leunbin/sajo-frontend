import { Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getMe, login } from '../../api/auth';
import { tokenStorage } from '../../utils/tokenStorage';
import './LoginPage.scss';

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const response = await login({
        email: email.trim(),
        password,
      });

      tokenStorage.setTokens(response.accessToken, response.refreshToken);

      const user = await getMe();

      if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
        return;
      }

      navigate('/', { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message ?? '이메일 또는 비밀번호를 확인해주세요.');
      } else {
        setErrorMessage('로그인 중 문제가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-page__content">
        <div className="login-page__brand">
          <img src="/4jo-logo.svg" alt="4JO" className="login-page__logo" />

          <h1>내 전략을 확인하고, 더 신중하게 투자하세요.</h1>

          <p>
            백테스트부터 위험 분석, 자동매매까지
            <br />
            하나의 흐름으로 관리할 수 있습니다.
          </p>
        </div>

        <div className="login-page__form-area">
          <div className="login-page__heading">
            <h2>로그인</h2>
            <p>4JO 계정으로 서비스를 시작하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-form__field">
              <label htmlFor="email">이메일</label>

              <input
                id="email"
                type="email"
                value={email}
                placeholder="example@email.com"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="login-form__field">
              <label htmlFor="password">비밀번호</label>

              <div className="login-form__password">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="비밀번호를 입력해주세요"
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  type="button"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="login-form__error" role="alert">
                {errorMessage}
              </p>
            )}

            <button type="submit" className="login-form__submit" disabled={isSubmitting}>
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="login-page__signup">
            <span>아직 계정이 없으신가요?</span>
            <Link to="/signup">회원가입</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
