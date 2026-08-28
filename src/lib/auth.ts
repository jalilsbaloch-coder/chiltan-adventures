export const setAuth = (token: string, user: any) => {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
};

export const getAuth = () => {
  const token = localStorage.getItem('admin_token');
  const user = localStorage.getItem('admin_user');
  return { token, user: user ? JSON.parse(user) : null };
};

export const clearAuth = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const { token } = getAuth();
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearAuth();
    window.location.href = '/admin/login';
  }
  return response;
};
