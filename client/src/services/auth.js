import api from './api';


export const authService = {
  async login(username, password) {
    const params = new URLSearchParams();

    params.append('username', username);
    params.append('password', password);

    const response = await api.post(
      '/api/auth/login',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    } = response.data;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken || '');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('user-id', user.id);

    return user;
  },

  async register(formData) {
    const response = await api.post(
      '/api/auth/register',
      formData
    );

    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  async logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user-id');
  },

  isAuthenticated() {
    return Boolean(
      localStorage.getItem('access_token')
    );
  },

  getUser() {
    const userString = localStorage.getItem('user');

    if (!userString) {
      return null;
    }

    try {
      return JSON.parse(userString);
    } catch {
      return null;
    }
  },
};