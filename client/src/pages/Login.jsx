import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { authService } from '../services/auth';


function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      await authService.login(username, password);
      navigate('/dashboard');
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          requestError.response?.data?.error ||
          'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="max-w-md w-full bg-surface-container border border-outline-variant rounded-[3px] p-space-lg shadow-lg">
        <div className="text-center mb-space-lg">
          <div className="flex items-center justify-center gap-space-xs mb-space-sm">
            <span className="material-symbols-outlined text-[48px] text-primary">
              explore
            </span>
          </div>

          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            DHRUV
          </h1>

          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-space-xs">
            Polar Operations
          </p>

          <div className="mt-space-sm px-space-xs py-[2px] bg-secondary-container text-on-secondary-fixed-variant border border-outline-variant rounded-sm font-data-mono-md inline-block">
            NCPOR
          </div>
        </div>

        {error && (
          <div className="bg-error-container border border-error text-on-error-container px-space-md py-space-sm rounded-[3px] mb-space-md font-body-sm text-body-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px]">
                error
              </span>

              {error}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-space-md"
        >
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-space-xs">
              Username
            </label>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
                person
              </span>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                className="w-full pl-10 pr-space-md py-space-sm bg-surface border border-outline-variant rounded-[3px] text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-space-xs">
              Password
            </label>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
                lock
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="w-full pl-10 pr-space-md py-space-sm bg-surface border border-outline-variant rounded-[3px] text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container text-on-primary py-space-sm px-space-md rounded-[3px] font-title-sm text-title-sm hover:bg-primary disabled:bg-surface-container disabled:text-on-surface-variant transition-colors flex items-center justify-center gap-space-xs"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">
                  refresh
                </span>

                Logging in...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">
                  login
                </span>

                Login
              </>
            )}
          </button>
        </form>

        <div className="mt-space-md text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Do not have an account?{' '}
            <Link
              to="/register"
              className="text-primary hover:underline font-semibold"
            >
              Sign Up
            </Link>
          </p>
        </div>

        <div className="mt-space-lg pt-space-md border-t border-outline-variant text-center">
          <p className="font-title-sm text-title-sm text-on-surface font-semibold">
            DHRUV
          </p>

          <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
            Plan. Track. Predict. Respond.
          </p>

          <p className="font-label-sm text-label-sm text-secondary mt-space-xs">
            Even when the network is down.
          </p>
        </div>

        <div className="mt-space-md pt-space-sm border-t border-outline-variant flex items-center justify-between text-on-surface-variant font-data-mono-md text-body-sm">
          <span>Terminal: IND-CMD-01</span>
          <span>NCPOR</span>
        </div>
      </div>
    </div>
  );
}

export default Login;