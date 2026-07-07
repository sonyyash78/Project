import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PageLoader from './components/PageLoader';

// Lazy load pages for performance
const Home = lazy(() => import('./pages/Home'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Exams = lazy(() => import('./pages/Exams'));
const Questions = lazy(() => import('./pages/Questions'));
const Search = lazy(() => import('./pages/Search'));
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TestInterface = lazy(() => import('./pages/TestInterface'));
const TestResult = lazy(() => import('./pages/TestResult'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentFailedPage = lazy(() => import('./pages/PaymentFailedPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const ReferralPage = lazy(() => import('./pages/ReferralPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

// Page transition wrapper
const PageTransition = ({ children }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Layout component
const AppLayout = () => {
  const location = useLocation();
  // Hide Navbar & Footer in test interface for immersive experience
  const isTestPage = location.pathname === '/test';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        transition: 'background-color 0.3s ease, color 0.3s ease'
      }}
    >
      {/* Global Toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f1f5f9',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#0f172a' },
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#0f172a' },
          },
        }}
      />

      {!isTestPage && <Navbar />}

      <main style={{ flex: 1 }}>
        <Suspense fallback={<PageLoader />}>
          <PageTransition>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/exams" element={<Exams />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/search" element={<Search />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/test" element={<TestInterface />} />
              <Route path="/result/:attemptId" element={<TestResult />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/payment-failed" element={<PaymentFailedPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/referrals" element={<ReferralPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageTransition>
        </Suspense>
      </main>

      {!isTestPage && <Footer />}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppLayout />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
