import React from 'react';
import Brand from './Brand';
import { CloseIcon } from './icons';
import { isComplete, type AccountForm } from './account';
import { wazoWebSocketUrl } from '../sip/config';

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
  const set = (key: keyof AccountForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [key]: e.target.value });

  return (
    <div className="screen screen--login">
      <Brand variant="stacked" />

      <div className="stack" style={{ gap: 6 }}>
        <h1 className="title">Sign in</h1>
        <p className="lede">Use your line's SIP username and password.</p>
      </div>

      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
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
            autoComplete="username"
            autoCapitalize="none"
            value={form.username}
            onChange={set('username')}
          />
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
          />
          <span className="field__help">Never saved. The other fields are remembered in this browser.</span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="login-server">
            Server
          </label>
          <input
            id="login-server"
            className="field__input field__input--mono"
            type="text"
            autoCapitalize="none"
            spellCheck={false}
            value={form.wsUrl}
            onChange={set('wsUrl')}
          />
          <span className="field__help field__help--mono">{wazoWebSocketUrl(form.wsUrl) || 'wss://…'}</span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="login-domain">
            SIP domain <span className="field__label-note">(blank uses the server's host)</span>
          </label>
          <input
            id="login-domain"
            className="field__input field__input--mono"
            type="text"
            autoCapitalize="none"
            spellCheck={false}
            value={form.domain}
            onChange={set('domain')}
          />
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
