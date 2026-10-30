const API_ROOT = '/api';
const TOKEN_KEY = 'loomcraft-token';

export const tokenStore = {
  get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(value) { try { localStorage.setItem(TOKEN_KEY, value); } catch { /* storage unavailable */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } }
};

async function request(path, options = {}) {
  const token = tokenStore.get();
  const headers = { ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  } catch {
    const error = new Error('Cannot reach the server. Check your connection and try again.');
    error.status = 0;
    throw error;
  }

  let data = null;
  if (response.status !== 204) {
    const body = await response.text();
    try { data = body ? JSON.parse(body) : null; } catch { data = null; }
  }

  if (!response.ok) {
    if (response.status === 401 && token && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('loomcraft:signed-out'));
    }
    const fallback = response.status >= 500
      ? 'The server is unavailable right now. Please try again shortly.'
      : 'Something went wrong. Please try again.';
    const error = new Error(data?.message || fallback);
    error.status = response.status;
    throw error;
  }
  return data;
}

const json = (method, body) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  config: () => request('/config'),
  products: (query = '') => request(`/products${query}`),
  product: (id) => request(`/products/${id}`),
  login: (credentials) => request('/auth/login', json('POST', credentials)),
  signup: (details) => request('/auth/signup', json('POST', details)),
  me: () => request('/auth/me'),
  wishlist: () => request('/wishlist'),
  toggleWishlist: (productId) => request(`/wishlist/${productId}`, { method: 'PUT' }),
  createOrder: (order) => request('/orders', json('POST', order)),
  orders: () => request('/orders'),
  order: (id) => request(`/orders/${id}`),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  adminProducts: () => request('/admin/products'),
  adminOrders: () => request('/admin/orders'),
  saveProduct: (product, id) => request(`/admin/products${id ? `/${id}` : ''}`, json(id ? 'PUT' : 'POST', product)),
  archiveProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
  setOrderStatus: (id, status) => request(`/admin/orders/${id}`, json('PATCH', { status }))
};
