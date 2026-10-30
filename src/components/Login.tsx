import React from 'react';
import Brand from './Brand';
import { CloseIcon } from './icons';
import { describeLogin, isComplete, loginErrorHint, type AccountForm } from './account';
import { BRAND } from '../brand';

interface LoginProps {
  form: AccountForm;
  onChange: (form: AccountForm) => void;
  onSubmit: () => void;
  connecting: boolean;
  error?: string;
  /** True once registered, so the user can get back to the phone without reconnecting. */
  canClose: boolean;
  onClose: () => void;
  onDismissError: () => void;
}

const Login: React.FC<LoginProps> = ({
  form,
  onChange,
  onSubmit,
  connecting,
  error,
  canClose,
  onClose,
  onDismissError,
}) => {
  const ready = !connecting && isComplete(form);
  const hint = error ? loginErrorHint(error) : undefined;
  const set = (key: keyof AccountForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [key]: e.target.value });

  return (
    <div className="screen screen--login">
      <Brand variant="stacked" />

      <div className="stack" style={{ gap: 6 }}>
        <h1 className="title">Sign in</h1>
        <p className="lede">Use your softphone username and password.</p>
      </div>

      {error && (
        <div className="alert" role="alert">
          <span>
            {error}
            {hint && <span className="alert__hint">{hint}</span>}
          </span>
          <button type="button" className="alert__close" aria-label="Dismiss" onClick={onDismissError}>
            <CloseIcon />
          </button>
        </div>
      )}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onSubmit();
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="login-username">
            Username
          </label>
          <input
            id="login-username"
            className="field__input"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={BRAND.loginExample}
            value={form.login}
            onChange={set('login')}
            aria-describedby="login-username-help"
          />
          <span id="login-username-help" className="field__help">
            {describeLogin(form)}
          </span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="field__input"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={set('password')}
            aria-describedby="login-password-help"
          />
          <span id="login-password-help" className="field__help">
            Never saved. The username is remembered in this browser.
          </span>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: 10 }} disabled={!ready}>
          {connecting ? 'Connecting…' : 'Login'}
        </button>

        {canClose && (
          <button type="button" className="btn-text" onClick={onClose}>
            Close
          </button>
        )}
      </form>

      <div className="push-down footer-note">SIP over WSS · WebRTC audio</div>
    </div>
  );
};

export default Login;
