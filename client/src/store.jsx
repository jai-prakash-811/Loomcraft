import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, tokenStore } from './api.js';

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const CART_KEY = 'loomcraft-cart';
const DEFAULT_CONFIG = { freeShippingThreshold: 1999, shippingFee: 79, maxPerLine: 20 };

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(saved)
      ? saved.filter((item) => item && item.productId && item.product && Number.isInteger(item.quantity) && item.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState(readCart);
  const [wishlist, setWishlist] = useState([]);
  const [toast, setToast] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* storage unavailable */ }
  }, [cart]);

  useEffect(() => {
    api.config().then((result) => setConfig({ ...DEFAULT_CONFIG, ...result })).catch(() => {});
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) {
      setAuthReady(true);
      return;
    }
    api.me()
      .then(async (result) => {
        setUser(result.user);
        setWishlist(await api.wishlist());
      })
      .catch((error) => {
        if (error.status === 401) {
          tokenStore.clear();
          setUser(null);
        } else {
          setToast(error.message);
        }
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    const onSignedOut = () => {
      tokenStore.clear();
      setUser(null);
      setWishlist([]);
      setToast('Your session has ended. Please sign in again.');
    };
    window.addEventListener('loomcraft:signed-out', onSignedOut);
    return () => window.removeEventListener('loomcraft:signed-out', onSignedOut);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const maxFor = (product) => Math.min(config.maxPerLine, product.stock ?? config.maxPerLine);

  const signOut = () => {
    tokenStore.clear();
    setUser(null);
    setWishlist([]);
    setToast('You have been signed out.');
  };

  const addToCart = (product, quantity = 1) => {
    const cap = maxFor(product);
    const existing = cartRef.current.find((item) => item.productId === product._id);
    const current = existing ? existing.quantity : 0;
    if (cap <= 0) {
      setToast('Sorry, this piece is out of stock.');
      return;
    }
    const next = Math.min(current + quantity, cap);
    if (next === current) {
      setToast(`You already have the most we can offer (${cap}).`);
      return;
    }
    setCart((items) => existing
      ? items.map((item) => item.productId === product._id ? { ...item, quantity: next, product } : item)
      : [...items, { productId: product._id, quantity: next, product }]);
    setToast('Added to your bag.');
  };

  const updateCart = (productId, quantity) => {
    if (quantity < 1) {
      setCart((items) => items.filter((item) => item.productId !== productId));
      return;
    }
    setCart((items) => items.map((item) =>
      item.productId === productId ? { ...item, quantity: Math.min(quantity, maxFor(item.product)) } : item));
  };

  // Re-reads price and stock from the server so the bag never shows stale numbers.
  const refreshCart = useCallback(async () => {
    const ids = cartRef.current.map((item) => item.productId);
    if (!ids.length) return;
    try {
      const { products } = await api.products(`?ids=${ids.join(',')}`);
      const latest = new Map(products.map((product) => [product._id, product]));
      const unavailable = cartRef.current.filter((item) => !latest.has(item.productId) || latest.get(item.productId).stock <= 0).length;
      if (unavailable) setToast(`${unavailable} sold-out ${unavailable === 1 ? 'piece was' : 'pieces were'} removed from your bag.`);
      setCart((items) => items
        .filter((item) => latest.has(item.productId) && latest.get(item.productId).stock > 0)
        .map((item) => {
          const product = latest.get(item.productId);
          return { ...item, product, quantity: Math.min(item.quantity, product.stock, DEFAULT_CONFIG.maxPerLine) };
        }));
    } catch {
      /* keep the local copy if the server is unreachable */
    }
  }, []);

  const toggleWishlist = async (productId) => {
    if (!user) {
      setToast('Sign in to save your favourites.');
      return;
    }
    try {
      const result = await api.toggleWishlist(productId);
      setWishlist(result.wishlist);
      setToast(result.added ? 'Saved to your favourites.' : 'Removed from favourites.');
    } catch (error) {
      setToast(error.message);
    }
  };

  const value = {
    user, setUser, authReady, cart, setCart, wishlist, setWishlist, toast, setToast, config,
    signOut, addToCart, updateCart, refreshCart, toggleWishlist, maxFor
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </StoreContext.Provider>
  );
}
