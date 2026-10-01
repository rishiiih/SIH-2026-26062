import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { authService } from '../services/auth';


export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      await authService.register(formData);

      navigate('/login', {
        state: {
          message:
            'Registration successful. Please log in.',
        },
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-md p-space-lg bg-surface-container-low border border-outline-variant rounded-sm">
        <h1 className="text-title-lg font-title-lg text-on-surface mb-space-md">
          Register Account
        </h1>

        {error && (
          <div className="mb-space-md p-space-sm bg-error-container text-on-error-container rounded-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-space-md"
        >
          <label className="block">
            <span className="block mb-space-xs text-body-sm text-on-surface">
              Username
            </span>

            <input
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              className="w-full p-space-sm border border-outline rounded-sm bg-surface-container-lowest text-on-surface"
            />
          </label>

          <label className="block">
            <span className="block mb-space-xs text-body-sm text-on-surface">
              Full name
            </span>

            <input
              name="full_name"
              type="text"
              required
              value={formData.full_name}
              onChange={handleChange}
              className="w-full p-space-sm border border-outline rounded-sm bg-surface-container-lowest text-on-surface"
            />
          </label>

          <label className="block">
            <span className="block mb-space-xs text-body-sm text-on-surface">
              Email
            </span>

            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-space-sm border border-outline rounded-sm bg-surface-container-lowest text-on-surface"
            />
          </label>

          <label className="block">
            <span className="block mb-space-xs text-body-sm text-on-surface">
              Password
            </span>

            <input
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full p-space-sm border border-outline rounded-sm bg-surface-container-lowest text-on-surface"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-space-sm bg-primary text-on-primary rounded-sm disabled:opacity-50"
          >
            {loading
              ? 'Creating account...'
              : 'Create account'}
          </button>
        </form>

        <p className="mt-space-md text-body-sm text-on-surface-variant">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-primary underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}