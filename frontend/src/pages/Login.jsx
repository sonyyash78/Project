import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaGraduationCap, FaEnvelope, FaLock, FaUser,
  FaArrowRight, FaEye, FaEyeSlash, FaCheck,
  FaShieldAlt, FaTrophy, FaChartLine, FaGift
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isForgot) {
      if (!email.trim()) {
        toast.error('Please enter your email.');
        return;
      }
      setLoading(true);
      try {
        await authService.forgotPassword(email);
        toast.success('If an account with that email exists, a reset link has been sent.');
        setIsForgot(false);
      } catch (err) {
        let errorMessage = 'Failed to request password reset.';
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map(e => e.msg).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!email.trim() || (!isForgot && !password.trim())) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (isSignUp && !name.trim()) {
      toast.error('Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await authService.signup(name, email, password, referralCode);
        toast.success('Account created! Please sign in.');
        setIsSignUp(false);
        setName('');
        setReferralCode('');
      } else {
        const userProfile = await login(email, password);
        toast.success(`Welcome back, ${userProfile.name}! 🎉`);
        if (userProfile.role === 'admin') navigate('/admin');
        else navigate('/dashboard');
      }
    } catch (err) {
      let errorMessage = 'Authentication failed. Check your credentials.';
      
      if (!err.response) {
        errorMessage = 'Cannot connect to the server. Please ensure the backend (Python) is running!';
      } else {
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map(e => e.msg).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <FaTrophy style={{ color: '#fbbf24' }} />, label: 'Past Year Papers' },
    { icon: <FaChartLine style={{ color: '#34d399' }} />, label: 'Performance Analytics' },
    { icon: <FaShieldAlt style={{ color: '#818cf8' }} />, label: 'Expert Solutions' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background effects */}
      <div className="bg-blob blob-indigo" style={{ top: '10%', left: '5%', opacity: 0.15 }} />
      <div className="bg-blob blob-purple" style={{ bottom: '10%', right: '5%', opacity: 0.12 }} />
      <div className="grid-pattern" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />

      {/* Left panel (hidden on mobile) */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        position: 'relative',
        zIndex: 1,
      }} className="login-left-panel">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: 420 }}
        >
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 48,
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              padding: '10px 12px', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
            }}>
              <FaGraduationCap style={{ color: 'white', fontSize: 22 }} />
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>
              Exam<span style={{ color: '#6366f1' }}>SIDE</span>
            </span>
          </Link>

          <div style={{ marginBottom: 40 }}>
            <h1 style={{
              fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em',
              color: 'var(--text-primary)', marginBottom: 14, lineHeight: 1.2,
            }}>
              Master Your Exam<br />
              <span style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Preparation</span>
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Join thousands of serious aspirants who trust ExamSIDE for their competitive exam preparation.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {f.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel - Form */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Form card */}
          <div style={{
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(24px)',
            border: '1px solid var(--border-default)',
            borderRadius: 24,
            padding: '36px 32px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          }}>
            {/* Form header */}
            <div style={{ marginBottom: 28, textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              }}>
                <FaGraduationCap style={{ color: 'white' }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                {isForgot ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {isForgot ? 'Enter your email to receive a password reset link.' : isSignUp ? 'Start your preparation journey today.' : 'Sign in to continue your preparation.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name field (sign up only) */}
              <AnimatePresence>
                {isSignUp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <FaUser style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted)',
                      }} />
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        className="input-field"
                        style={{ paddingLeft: 40 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Referral Code field (sign up only) */}
              <AnimatePresence>
                {isSignUp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Referral Code (Optional)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <FaGift style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted)',
                      }} />
                      <input
                        id="referralCode"
                        type="text"
                        value={referralCode}
                        onChange={e => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="input-field"
                        style={{ paddingLeft: 40 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email field */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <FaEnvelope style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: 'var(--text-muted)',
                  }} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="input-field"
                    style={{ paddingLeft: 40 }}
                  />
                </div>
              </div>

              {/* Password field */}
              {!isForgot && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FaLock style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 13, color: 'var(--text-muted)',
                    }} />
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required={!isForgot}
                      className="input-field"
                      style={{ paddingLeft: 40, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{
                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 14,
                      }}
                    >
                      {showPass ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              )}

              {!isForgot && !isSignUp && (
                <div style={{ textAlign: 'right', marginTop: -8 }}>
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setEmail(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#818cf8', fontWeight: 500 }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'white',
                  background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 4,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white', borderRadius: '50%',
                    }}
                  />
                ) : (
                  <>
                    {isForgot ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}
                    <FaArrowRight style={{ fontSize: 12 }} />
                  </>
                )}
              </motion.button>
            </form>

            {/* Toggle link */}
            <div style={{ marginTop: 20, textAlign: 'center', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => {
                  if (isForgot) {
                    setIsForgot(false);
                  } else {
                    setIsSignUp(!isSignUp);
                  }
                  setName('');
                  setEmail('');
                  setPassword('');
                  setReferralCode('');
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#818cf8', fontWeight: 600,
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
                onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
              >
                {isForgot
                  ? 'Back to Sign In'
                  : isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Create One Free"}
              </button>
            </div>
          </div>

          {/* Trust badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, marginTop: 20,
            color: 'var(--text-muted)', fontSize: 12,
          }}>
            <FaShieldAlt style={{ fontSize: 11, color: '#10b981' }} />
            Secure authentication · No spam
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .login-left-panel { display: none !important; }
        }
        @media (min-width: 768px) {
          .login-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
};

export default Login;
