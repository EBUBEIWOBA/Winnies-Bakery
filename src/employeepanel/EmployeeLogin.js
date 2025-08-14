import React, { useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Container, Form, Button, Alert, Spinner, Card, Row, Col } from 'react-bootstrap';
import { FaUserTie, FaArrowLeft, FaCheckCircle, FaEye, FaEyeSlash, FaKey } from 'react-icons/fa';
import { employeeLogin, forgotPassword, resetPassword, getProfile, verifyEmail, resendVerificationEmail } from '../api/employeePanelApi';
import './EmployeeLogin.css';

const EmployeeLogin = () => {
  const location = useLocation();
  const { token } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ maxWidth: 480 });

  // State management
  const [view, setView] = useState(() => {
    if (location.pathname.includes('reset-password')) return 'reset';
    if (location.pathname.includes('verify-email')) return 'verify';
    if (location.pathname.includes('forgot-password')) return 'forgot';
    return 'login';
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showResend, setShowResend] = useState(false);

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (view === 'login') {
      if (!formData.email) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
        errors.email = 'Invalid email format';
      }
      if (!formData.password) errors.password = 'Password is required';
    } else if (view === 'forgot') {
      if (!formData.email) errors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Invalid email format';
      }
    } else if (view === 'reset') {
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle view change
  const changeView = useCallback((newView) => {
    setView(newView);
    setError('');
    setSuccess('');
    setFormErrors({});
    setShowResend(false);
    navigate(`/employee/${newView === 'login' ? 'login' : `auth/${newView}`}`);
  }, [navigate]);

  // Handle form submissions
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setShowResend(false);

    try {
      switch (view) {
        case 'login':
          const loginResponse = await employeeLogin({
            email: formData.email,
            password: formData.password
          });

          if (loginResponse.success) {
            localStorage.setItem('employeeToken', loginResponse.token);

            // Try to get full profile
            try {
              const profile = await getProfile();
              localStorage.setItem('employeeProfile', JSON.stringify(profile));
            } catch (profileError) {
              console.error('Profile fetch failed, using minimal data', profileError);
              localStorage.setItem('employeeProfile', JSON.stringify({
                firstName: loginResponse.employee?.name?.split(' ')[0] || 'Employee',
                lastName: loginResponse.employee?.name?.split(' ')[1] || '',
                photoUrl: loginResponse.employee?.photo || null,
                email: loginResponse.employee?.email || '',
                position: loginResponse.employee?.position || 'Employee'
              }));
            }

            navigate('/employee/panel/dashboard');
          }
          break;

        case 'forgot':
          const forgotResponse = await forgotPassword(formData.email);
          if (forgotResponse.success) {
            setSuccess('Password reset link sent to your email. Please check your inbox.');
            setFormData(prev => ({ ...prev, email: '' }));
          }
          break;

        case 'reset':
          const resetResponse = await resetPassword(token, formData.password);
          if (resetResponse.success) {
            setSuccess('Password reset successfully! Redirecting to login...');
            setTimeout(() => changeView('login'), 3000);
          }
          break;

        default:
          break;
      }
    } catch (err) {
      if (err.message.includes('EMAIL_NOT_VERIFIED') || err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setError('Please verify your email first. Check your inbox or spam folder.');
        setShowResend(true);
      } else {
        setError(err.response?.data?.message || err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email verification handler
  const handleVerifyEmail = useCallback(async () => {
    if (!token) {
      setError('Verification token is missing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await verifyEmail(token);

      if (response.success) {
        localStorage.setItem('employeeToken', response.token);
        localStorage.setItem('employeeData', JSON.stringify(response.employee));

        setSuccess('Email verified successfully! Redirecting to dashboard...');
        setTimeout(() => navigate('/employee/panel/dashboard'), 2000);
      } else {
        setError(response.message || 'Email verification failed');
      }
    } catch (err) {
      let errorMsg = 'Email verification failed. Please try again.';
      if (err.response) {
        if (err.response.data?.message) {
          errorMsg = err.response.data.message;
        } else if (err.response.status === 400) {
          errorMsg = 'Invalid or expired verification link';
        } else if (err.response.status === 500) {
          errorMsg = 'Server error during verification. Please try again later.';
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  // Resend verification email
  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
    const response = await resendVerificationEmail(formData.email);
    if (response.data.success) {
            setSuccess('Verification email resent! Check your inbox');
    } else {
      setError(response.data.message || 'Failed to resend email');
    }
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to resend email');
  }finally {
    setLoading(false);
  }
};

  // Auto-verify email if token is present
  useEffect(() => {
    if (view === 'verify' && token && !loading && !success && !error) {
      handleVerifyEmail();
    }
  }, [view, token, loading, success, error, handleVerifyEmail]);

  // Render the appropriate form based on current view
  const renderForm = () => {
    const commonInputProps = {
      className: 'form-control-lg',
      disabled: loading,
    };

    switch (view) {
      case 'login':
        return (
          <>
            <div className="auth-header text-center mb-4">
              <FaUserTie className="auth-icon mb-3" size={isMobile ? 36 : 48} />
              <h2 className={isMobile ? "h4" : "h2"}>Employee Portal</h2>
              <p className="text-muted">Sign in to access your account</p>
            </div>

            <Form onSubmit={handleSubmit} noValidate>
              <Form.Group className="mb-3">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="employee@company.com"
                  isInvalid={!!formErrors.email}
                  autoFocus
                  autoComplete="username"
                  {...commonInputProps}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.email}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <div className="input-group">
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    isInvalid={!!formErrors.password}
                    autoComplete="current-password"
                    {...commonInputProps}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    disabled={loading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </div>
                <Form.Control.Feedback type="invalid">
                  {formErrors.password}
                </Form.Control.Feedback>
              </Form.Group>

              <div className="d-flex justify-content-between mb-4">
                <Form.Check
                  type="checkbox"
                  label="Remember me"
                  id="rememberMe"
                  className="small"
                />
                <Button
                  variant="link"
                  className="p-0 text-primary small"
                  onClick={() => changeView('forgot')}
                  disabled={loading}
                >
                  Forgot password?
                </Button>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-100 auth-btn py-3"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Signing in...
                  </>
                ) : 'Sign In'}
              </Button>

              {showResend && (
                <div className="text-center mt-3">
                  <Button
                    variant="link"
                    onClick={() => {
                      handleResendVerification();
                      setShowResend(false);
                    }}
                    disabled={loading}
                    className="small"
                  >
                    Resend verification email
                  </Button>
                </div>
              )}
            </Form>
          </>
        );

      case 'forgot':
        return (
          <>
            <Button
              variant="link"
              className="p-0 mb-3 text-primary back-link"
              onClick={() => changeView('login')}
              disabled={loading}
            >
              <FaArrowLeft className="me-1" />
              Back to login
            </Button>

            <div className="auth-header text-center mb-4">
              <FaKey className="auth-icon mb-3" size={isMobile ? 36 : 48} />
              <h2 className={isMobile ? "h4" : "h2"}>Reset Password</h2>
              <p className="text-muted">Enter your email to receive a reset link</p>
            </div>

            <Form onSubmit={handleSubmit} noValidate>
              <Form.Group className="mb-4">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="employee@company.com"
                  isInvalid={!!formErrors.email}
                  autoFocus
                  {...commonInputProps}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.email}
                </Form.Control.Feedback>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100 auth-btn py-3"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Sending...
                  </>
                ) : 'Send Reset Link'}
              </Button>
            </Form>
          </>
        );

      case 'reset':
        return (
          <>
            <div className="auth-header text-center mb-4">
              <FaKey className="auth-icon mb-3" size={isMobile ? 36 : 48} />
              <h2 className={isMobile ? "h4" : "h2"}>Set New Password</h2>
              <p className="text-muted">Create a new password for your account</p>
            </div>

            <Form onSubmit={handleSubmit} noValidate>
              <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <div className="input-group">
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    minLength="8"
                    isInvalid={!!formErrors.password}
                    autoFocus
                    {...commonInputProps}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    disabled={loading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </div>
                <Form.Control.Feedback type="invalid">
                  {formErrors.password}
                </Form.Control.Feedback>
                <Form.Text muted className="small">
                  Must be at least 8 characters with uppercase, lowercase, number and special character
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  minLength="8"
                  isInvalid={!!formErrors.confirmPassword}
                  {...commonInputProps}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.confirmPassword}
                </Form.Control.Feedback>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100 auth-btn py-3"
                disabled={loading || success}
                size="lg"
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Updating...
                  </>
                ) : 'Reset Password'}
              </Button>
            </Form>
          </>
        );

      case 'verify':
        return (
          <div className="auth-header text-center">
            <h2 className={isMobile ? "h4" : "h2"}>Email Verification</h2>
            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" role="status" className="mb-3">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Verifying your email...</p>
              </div>
            ) : error ? (
              <>
                <Alert variant="danger" className="text-start">
                  {error}
                </Alert>
                <div className="d-grid gap-3">
                  <Button
                    variant="primary"
                    onClick={handleResendVerification}
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Sending...
                      </>
                    ) : 'Resend Verification Email'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => changeView('login')}
                    size="lg"
                  >
                    Back to Login
                  </Button>
                </div>
              </>
            ) : success ? (
              <Alert variant="success">
                <FaCheckCircle className="me-2" />
                {success}
                <div className="mt-3">
                  <Button
                    variant="success"
                    onClick={() => changeView('login')}
                    size="lg"
                  >
                    Go to Login
                  </Button>
                </div>
              </Alert>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100 p-3">
      <Row className="justify-content-center w-100">
        <Col xs={12} sm={10} md={8} lg={6} xl={5}>
          <Card className="auth-card shadow-sm">
            <Card.Body className={isMobile ? "p-3" : "p-4 p-sm-5"}>
              {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                  {success}
                </Alert>
              )}

              {renderForm()}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeLogin;