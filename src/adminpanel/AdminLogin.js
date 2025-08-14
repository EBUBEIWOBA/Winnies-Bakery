import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogIn, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import { adminLogin } from './api/adminApi';
import './AdminLogin.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check for remembered credentials on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormData(prev => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic client-side validation
      if (!formData.email.trim() || !formData.password.trim()) {
        throw new Error('Please fill in all fields');
      }

      const response = await adminLogin({
        email: formData.email.trim(),
        password: formData.password.trim(),
        rememberMe: formData.rememberMe
      });

      if (!response?.token || !response?.admin) {
        throw new Error('Invalid credentials or server error');
      }

      // Handle "Remember Me" functionality
      if (formData.rememberMe) {
        // Store email in localStorage for future logins
        localStorage.setItem('rememberedEmail', formData.email.trim());
        
        // Store token with longer expiration (30 days)
        localStorage.setItem('adminToken', response.token);
        localStorage.setItem('adminData', JSON.stringify(response.admin));
        localStorage.setItem('tokenExpiry', Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      } else {
        // Store token in sessionStorage (cleared when browser closes)
        sessionStorage.setItem('adminToken', response.token);
        sessionStorage.setItem('adminData', JSON.stringify(response.admin));
        
        // Clear any previously remembered email
        localStorage.removeItem('rememberedEmail');
      }

      // Redirect to dashboard
      navigate('/admin/panel/dashboard', { replace: true });

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="login-wrapper">
        <div className="login-card">
          {/* Header Section */}
          <header className="login-header">
            <div className="logo-circle">
              <FiLogIn className="login-icon" />
            </div>
            <h1>Admin Portal</h1>
            <p>Sign in to access your dashboard</p>
          </header>

          {/* Error Message */}
          {error && (
            <div className="error-alert" role="alert">
              <FiAlertCircle className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <FiMail className="input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  required
                  autoComplete="username"
                  className="form-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength="8"
                  autoComplete={formData.rememberMe ? 'current-password' : 'off'}
                  className="form-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="remember-me"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="checkbox-input"
                />
                <label htmlFor="remember-me">Remember me</label>
              </div>
              <a href="/admin/forgot-password" className="forgot-password">Forgot password?</a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-button"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                <>
                  <FiLogIn className="button-icon" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <footer className="login-footer">
            <p>&copy; {new Date().getFullYear()} Winnie's Bakery. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;