import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const createOrder = (planSlug, billingCycle, couponCode = null, useWallet = false) =>
  API.post('/api/payments/create-order', {
    plan_slug: planSlug,
    billing_cycle: billingCycle,
    coupon_code: couponCode,
    use_wallet: useWallet,
  });

export const verifyPayment = (order_id, payment_id, signature, plan_slug, billing_cycle) =>
  API.post('/api/payments/verify-payment', { order_id, payment_id, signature, plan_slug, billing_cycle });

export const getHistory = (page = 1, limit = 10) =>
  API.get('/api/payments/history', { params: { page, limit } });

export default API;
