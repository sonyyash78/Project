import axios from 'axios';

const API_BASE_URL = 'https://project-production-53e9.up.railway.app';

const API = axios.create({
  baseURL: API_BASE_URL,
});

// ── Request Interceptor — Attach token ───────────────────────
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

// ── Response Interceptor — Auto-refresh on 401 ──────────────
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function onRefreshFailed() {
  refreshSubscribers = [];
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying and not a refresh/login request
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/api/auth/login') &&
      !originalRequest.url.includes('/api/auth/refresh')
    ) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        // No refresh token — force logout
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(API(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('refresh_token', newRefreshToken);

        isRefreshing = false;
        onTokenRefreshed(access_token);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return API(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        onRefreshFailed();

        // Refresh failed — force logout
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ── API Service Calls ────────────────────────────────────────

export const authService = {
  // ── Existing (backward compatible) ─────────────────────────
  login: async (email, password, rememberMe = false) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    
    const response = await API.post(`/api/auth/login?remember_me=${rememberMe}`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  signup: async (name, email, password) => {
    const response = await API.post('/api/auth/signup', { name, email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await API.get('/api/auth/me');
    return response.data;
  },

  // ── Phase 2 — New endpoints ────────────────────────────────
  refreshToken: async (refreshToken) => {
    const response = await API.post('/api/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
  logout: async (refreshToken = null) => {
    try {
      const payload = refreshToken ? { refresh_token: refreshToken } : {};
      const response = await API.post('/api/auth/logout', payload);
      return response.data;
    } catch (e) {
      // Even if backend logout fails, clear local state
      return { message: 'Logged out' };
    }
  },
  forgotPassword: async (email) => {
    const response = await API.post('/api/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (token, newPassword) => {
    const response = await API.post('/api/auth/reset-password', { token, new_password: newPassword });
    return response.data;
  },
  changePassword: async (oldPassword, newPassword) => {
    const response = await API.post('/api/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await API.put('/api/auth/profile', profileData);
    return response.data;
  },
  verifyEmail: async (token) => {
    const response = await API.post('/api/auth/verify-email', { token });
    return response.data;
  },
  resendVerification: async (email) => {
    const response = await API.post('/api/auth/resend-verification', { email });
    return response.data;
  },
  getActivity: async (limit = 20, offset = 0) => {
    const response = await API.get('/api/auth/activity', { params: { limit, offset } });
    return response.data;
  },
  getSessions: async () => {
    const response = await API.get('/api/auth/sessions');
    return response.data;
  },
  revokeSession: async (sessionId) => {
    const response = await API.delete(`/api/auth/sessions/${sessionId}`);
    return response.data;
  },
};

export const browseService = {
  getExamMap: async () => {
    const response = await API.get('/api/browse/exam-map');
    return response.data;
  },
  getStats: async () => {
    const response = await API.get('/api/browse/stats');
    return response.data;
  },
  getReport: async () => {
    const response = await API.get('/api/browse/report');
    return response.data;
  }
};

export const examService = {
  listExams: async (page = 1, limit = 20, search = '', sort = 'alphabetical') => {
    const params = { page, limit };
    if (search) params.search = search;
    if (sort) params.sort = sort;
    
    const response = await API.get('/api/exams/', { params });
    return response.data;
  },
  getCategories: async () => {
    const response = await API.get('/api/exams/categories');
    return response.data;
  },
  listExamsByCategory: async (category) => {
    const response = await API.get(`/api/exams/category/${category}`);
    return response.data;
  },
  getExamDetails: async (examId) => {
    const response = await API.get(`/api/exams/${examId}`);
    return response.data;
  },
  listSubjectsByExam: async (examId) => {
    const response = await API.get(`/api/exams/${examId}/subjects`);
    return response.data;
  },
  getMockTest: async (examId) => {
    const response = await API.get(`/api/exams/${examId}/mock-test`);
    return response.data;
  },
  createExam: async (examData) => {
    const response = await API.post('/api/exams/', examData);
    return response.data;
  },
  updateExam: async (examId, examData) => {
    const response = await API.put(`/api/exams/${examId}`, examData);
    return response.data;
  },
  deleteExam: async (examId) => {
    const response = await API.delete(`/api/exams/${examId}`);
    return response.data;
  }
};

export const subjectService = {
  listSubjects: async (page = 1, limit = 20, examId = null) => {
    const params = { page, limit };
    if (examId) params.exam_id = examId;
    
    const response = await API.get('/api/subjects/', { params });
    return response.data;
  },
  getSubjectDetails: async (subjectId) => {
    const response = await API.get(`/api/subjects/${subjectId}`);
    return response.data;
  },
  listChaptersBySubject: async (subjectId) => {
    const response = await API.get(`/api/subjects/${subjectId}/chapters`);
    return response.data;
  },
  createSubject: async (subjectData) => {
    const response = await API.post('/api/subjects/', subjectData);
    return response.data;
  },
  updateSubject: async (subjectId, subjectData) => {
    const response = await API.put(`/api/subjects/${subjectId}`, subjectData);
    return response.data;
  },
  deleteSubject: async (subjectId) => {
    const response = await API.delete(`/api/subjects/${subjectId}`);
    return response.data;
  }
};

export const chapterService = {
  listChaptersBySubject: async (subjectId) => {
    const response = await API.get(`/api/chapters/subject/${subjectId}`);
    return response.data;
  },
  getChapterDetails: async (chapterId) => {
    const response = await API.get(`/api/chapters/${chapterId}`);
    return response.data;
  },
  createChapter: async (chapterData) => {
    const response = await API.post('/api/chapters/', chapterData);
    return response.data;
  },
  updateChapter: async (chapterId, chapterData) => {
    const response = await API.put(`/api/chapters/${chapterId}`, chapterData);
    return response.data;
  },
  deleteChapter: async (chapterId) => {
    const response = await API.delete(`/api/chapters/${chapterId}`);
    return response.data;
  }
};

export const topicService = {
  listTopicsByChapter: async (chapterId) => {
    const response = await API.get(`/api/topics/chapter/${chapterId}`);
    return response.data;
  },
  createTopic: async (topicData) => {
    const response = await API.post('/api/topics/', topicData);
    return response.data;
  }
};

export const questionService = {
  listQuestionsByExam: async (examId, skip = 0, limit = 50) => {
    const response = await API.get(`/api/questions/exam/${examId}`, {
      params: { skip, limit }
    });
    return response.data;
  },
  listQuestionsByChapter: async (chapterId, skip = 0, limit = 50) => {
    const response = await API.get(`/api/questions/chapter/${chapterId}`, {
      params: { skip, limit }
    });
    return response.data;
  },
  submitAnswer: async (questionId, selectedAnswer) => {
    const response = await API.post('/api/questions/submit-answer', {
      question_id: questionId,
      selected_answer: selectedAnswer
    });
    return response.data;
  },
  getQuestionDetails: async (questionId) => {
    const response = await API.get(`/api/questions/${questionId}`);
    return response.data;
  },
  createQuestion: async (questionData) => {
    const response = await API.post('/api/questions/', questionData);
    return response.data;
  },
  updateQuestion: async (questionId, questionData) => {
    const response = await API.put(`/api/questions/${questionId}`, questionData);
    return response.data;
  },
  deleteQuestion: async (questionId) => {
    const response = await API.delete(`/api/questions/${questionId}`);
    return response.data;
  },
  bulkUpload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await API.post('/api/questions/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  bulkUploadPreview: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await API.post('/api/questions/bulk-upload-preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  listAllQuestionsAdmin: async (params = {}) => {
    const response = await API.get('/api/questions/admin/all', { params });
    return response.data;
  }
};

export const progressService = {
  getDashboard: async () => {
    const response = await API.get('/api/progress/dashboard');
    return response.data;
  },
  saveAttempt: async (attemptData) => {
    const response = await API.post('/api/progress/test-attempts', attemptData);
    return response.data;
  },
  getAttemptDetails: async (attemptId) => {
    const response = await API.get(`/api/progress/test-attempts/${attemptId}`);
    return response.data;
  },
  toggleBookmark: async (questionId) => {
    const response = await API.post(`/api/progress/bookmark/${questionId}`);
    return response.data;
  },
  getBookmarks: async () => {
    const response = await API.get('/api/progress/bookmarks');
    return response.data;
  },
  getLeaderboard: async () => {
    const response = await API.get('/api/progress/leaderboard');
    return response.data;
  }
};

export const examEngineService = {
  listSettings: async (params = {}) => {
    const response = await API.get('/api/exam-engine/settings', { params });
    return response.data;
  },
  upsertSetting: async (payload) => {
    const response = await API.post('/api/exam-engine/settings', payload);
    return response.data;
  },
  startAttempt: async (payload) => {
    const response = await API.post('/api/exam-engine/attempts/start', payload);
    return response.data;
  },
  getAttemptSession: async (attemptId) => {
    const response = await API.get(`/api/exam-engine/attempts/${attemptId}`);
    return response.data;
  },
  saveAnswer: async (attemptId, payload) => {
    const response = await API.post(`/api/exam-engine/attempts/${attemptId}/answers`, payload);
    return response.data;
  },
  submitAttempt: async (attemptId, payload) => {
    const response = await API.post(`/api/exam-engine/attempts/${attemptId}/submit`, payload);
    return response.data;
  },
  getResult: async (attemptId) => {
    const response = await API.get(`/api/exam-engine/attempts/${attemptId}/result`);
    return response.data;
  },
  getAnalyticsDashboard: async () => {
    const response = await API.get('/api/exam-engine/analytics/dashboard');
    return response.data;
  },
  getLeaderboard: async (params = {}) => {
    const response = await API.get('/api/exam-engine/leaderboard', { params });
    return response.data;
  },
  listNotes: async (params = {}) => {
    const response = await API.get('/api/exam-engine/notes', { params });
    return response.data;
  },
  upsertNote: async (payload) => {
    const response = await API.post('/api/exam-engine/notes', payload);
    return response.data;
  },
  getUpcomingNotifications: async (withinHours = 24) => {
    const response = await API.get('/api/exam-engine/notifications/upcoming', {
      params: { within_hours: withinHours },
    });
    return response.data;
  }
};

export const subscriptionService = {
  getPlans: async () => {
    const response = await API.get('/api/subscriptions/plans');
    return response.data;
  },
  getMySubscription: async () => {
    const response = await API.get('/api/subscriptions/my-subscription');
    return response.data;
  },
  subscribe: async (planSlug, billingCycle = 'monthly') => {
    const response = await API.post('/api/subscriptions/subscribe', { plan_slug: planSlug, billing_cycle: billingCycle });
    return response.data;
  },
  cancel: async () => {
    const response = await API.post('/api/subscriptions/cancel');
    return response.data;
  },
  renew: async () => {
    const response = await API.post('/api/subscriptions/renew');
    return response.data;
  },
  checkAccess: async (featureKey) => {
    const response = await API.get(`/api/subscriptions/check-access/${featureKey}`);
    return response.data;
  },
  getHistory: async () => {
    const response = await API.get('/api/subscriptions/history');
    return response.data;
  },
};

export const paymentService = {
  createOrder: async (planSlug, billingCycle, couponCode, useWallet) => {
    const response = await API.post('/api/payments/create-order', {
      plan_slug: planSlug,
      billing_cycle: billingCycle,
      coupon_code: couponCode || null,
      use_wallet: useWallet || false,
    });
    return response.data;
  },
  verify: async (payload) => {
    const response = await API.post('/api/payments/verify', payload);
    return response.data;
  },
  getHistory: async (page = 1, limit = 20) => {
    const response = await API.get('/api/payments/history', { params: { page, limit } });
    return response.data;
  },
  retry: async (paymentId) => {
    const response = await API.post(`/api/payments/retry/${paymentId}`);
    return response.data;
  },
};

export const couponService = {
  validate: async (code, amount) => {
    const response = await API.post('/api/coupons/validate', { code, amount });
    return response.data;
  },
  create: async (data) => {
    const response = await API.post('/api/coupons/create', data);
    return response.data;
  },
  list: async (page = 1, limit = 50) => {
    const response = await API.get('/api/coupons/', { params: { page, limit } });
    return response.data;
  },
  update: async (id, data) => {
    const response = await API.put(`/api/coupons/${id}`, data);
    return response.data;
  },
  deactivate: async (id) => {
    const response = await API.delete(`/api/coupons/${id}`);
    return response.data;
  },
};

export const walletService = {
  getWallet: async () => {
    const response = await API.get('/api/wallet/');
    return response.data;
  },
  getTransactions: async (page = 1, limit = 20, type) => {
    const response = await API.get('/api/wallet/transactions', { params: { page, limit, type } });
    return response.data;
  },
};

export const referralService = {
  getCode: async () => {
    const response = await API.get('/api/referrals/my-code');
    return response.data;
  },
  getStats: async () => {
    const response = await API.get('/api/referrals/stats');
    return response.data;
  },
  apply: async (code) => {
    const response = await API.post('/api/referrals/apply', { code });
    return response.data;
  },
};

export const invoiceService = {
  list: async (page = 1, limit = 20) => {
    const response = await API.get('/api/invoices/', { params: { page, limit } });
    return response.data;
  },
  getById: async (id) => {
    const response = await API.get(`/api/invoices/${id}`);
    return response.data;
  },
};

export const adminService = {
  getRevenueDashboard: async () => {
    const response = await API.get('/api/admin/revenue/dashboard');
    return response.data;
  },
  getMRR: async () => {
    const response = await API.get('/api/admin/revenue/mrr');
    return response.data;
  },
  getARR: async () => {
    const response = await API.get('/api/admin/revenue/arr');
    return response.data;
  },
  getRevenueTrend: async (days = 30) => {
    const response = await API.get('/api/admin/revenue/trend', { params: { days } });
    return response.data;
  },
  getSubscribers: async (page = 1, limit = 50) => {
    const response = await API.get('/api/admin/subscribers', { params: { page, limit } });
    return response.data;
  },
  getExpiredSubscribers: async (page = 1, limit = 50) => {
    const response = await API.get('/api/admin/subscribers/expired', { params: { page, limit } });
    return response.data;
  },
  getConversionRate: async () => {
    const response = await API.get('/api/admin/analytics/conversion');
    return response.data;
  },
  getGrowth: async (period = 'monthly') => {
    const response = await API.get('/api/admin/analytics/growth', { params: { period } });
    return response.data;
  },
  getPlanPopularity: async () => {
    const response = await API.get('/api/admin/analytics/plan-popularity');
    return response.data;
  },
  getPayments: async (page = 1, limit = 50) => {
    const response = await API.get('/api/admin/payments', { params: { page, limit } });
    return response.data;
  },
  getTransactions: async (page = 1, limit = 50) => {
    const response = await API.get('/api/admin/transactions', { params: { page, limit } });
    return response.data;
  },
  getReferrals: async (page = 1, limit = 50) => {
    const response = await API.get('/api/admin/referrals', { params: { page, limit } });
    return response.data;
  },
  getWalletAnalytics: async () => {
    const response = await API.get('/api/admin/wallet-analytics');
    return response.data;
  },
  getCouponAnalytics: async () => {
    const response = await API.get('/api/admin/coupons/analytics');
    return response.data;
  },
  getTopUsers: async (limit = 10) => {
    const response = await API.get('/api/admin/top-users', { params: { limit } });
    return response.data;
  },
  getUsers: async (page = 1, limit = 50, search = '') => {
    const response = await API.get('/api/admin/users', { params: { page, limit, search } });
    return response.data;
  },
  updateUser: async (userId, data) => {
    const response = await API.put(`/api/admin/users/${userId}`, null, { params: data });
    return response.data;
  },
};

export const aiService = {
  generate: async (payload) => {
    const response = await API.post('/api/admin/ai/generate', payload);
    return response.data;
  },
  save: async (payload) => {
    const response = await API.post('/api/admin/ai/save', payload);
    return response.data;
  },
  getHistory: async () => {
    const response = await API.get('/api/admin/ai/history');
    return response.data;
  },
  deleteHistory: async (logId) => {
    const response = await API.delete(`/api/admin/ai/history/${logId}`);
    return response.data;
  },
  getStats: async () => {
    const response = await API.get('/api/admin/ai/stats');
    return response.data;
  }
};

export default API;
