import { Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { login, signup } from '../../api/auth';
import { tokenStorage } from '../../utils/tokenStorage';
import './SignupPage.scss';

function SignupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      return '이름을 입력해주세요.';
    }

    if (!email.trim()) {
      return '이메일을 입력해주세요.';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return '올바른 이메일 형식을 입력해주세요.';
    }

    if (!password) {
      return '비밀번호를 입력해주세요.';
    }

    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

    if (!passwordPattern.test(password)) {
      return '비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.';
    }

    if (password !== passwordConfirm) {
      return '비밀번호가 일치하지 않습니다.';
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const trimmedEmail = email.trim();

    // 1. 회원가입
    try {
      await signup({
        name: name.trim(),
        email: trimmedEmail,
        password,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message ?? '회원가입 중 문제가 발생했습니다.');
      } else {
        setErrorMessage('회원가입 중 문제가 발생했습니다.');
      }

      setIsSubmitting(false);
      return;
    }

    // 2. 회원가입 성공 후 자동 로그인
    try {
      const loginResponse = await login({
        email: trimmedEmail,
        password,
      });

      tokenStorage.setTokens(loginResponse.accessToken, loginResponse.refreshToken);

      navigate('/', { replace: true });
    } catch {
      // 계정 생성 자체는 성공했으므로 로그인 화면으로 이동
      navigate('/login', {
        replace: true,
        state: {
          message: '회원가입이 완료되었습니다. 로그인해주세요.',
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="signup-page">
      <section className="signup-page__content">
        <section className="signup-page__brand">
          <div className="signup-page__brand-content">
            <img src="/4jo-logo.svg" alt="4JO" className="signup-page__logo" />

            <h1>
              나만의 투자 전략을
              <br />
              시작해보세요.
            </h1>

            <p>
              전략을 만들고 백테스트한 후
              <br />
              위험을 확인하고 자동매매까지 관리할 수 있습니다.
            </p>
          </div>
        </section>

        <div className="signup-page__form-area">
          <div className="signup-page__heading">
            <h2>회원가입</h2>
            <p>4JO를 시작하기 위한 정보를 입력해주세요.</p>
          </div>

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="signup-form__field">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                type="text"
                value={name}
                placeholder="이름을 입력해주세요"
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="signup-form__field">
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

            <div className="signup-form__field">
              <label htmlFor="password">비밀번호</label>

              <div className="signup-form__password">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="영문, 숫자 포함 8자 이상"
                  autoComplete="new-password"
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

            <div className="signup-form__field">
              <label htmlFor="passwordConfirm">비밀번호 확인</label>

              <div className="signup-form__password">
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  placeholder="비밀번호를 다시 입력해주세요"
                  autoComplete="new-password"
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                />

                <button
                  type="button"
                  aria-label={showPasswordConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
                  onClick={() => setShowPasswordConfirm((prev) => !prev)}
                >
                  {showPasswordConfirm ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="signup-form__error" role="alert">
                {errorMessage}
              </p>
            )}

            <button type="submit" className="signup-form__submit" disabled={isSubmitting}>
              {isSubmitting ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <div className="signup-page__login">
            <span>이미 계정이 있으신가요?</span>
            <Link to="/login">로그인</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default SignupPage;
