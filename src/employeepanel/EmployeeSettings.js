import React, { useState } from 'react';
import { Container, Form, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { FiLock, FiAlertCircle, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api/employeePanelApi';
import { useMediaQuery } from 'react-responsive';

const PasswordStrengthIndicator = ({ password }) => {
  if (!password) return null;
  
  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z\d]/.test(pwd)) score++;
    return Math.min(score, 5);
  };
  
  const score = getStrength(password);
  const width = `${(score / 5) * 100}%`;
  const color = score < 2 ? 'danger' : score < 3 ? 'warning' : score < 4 ? 'info' : 'success';
  const strengthText = ['Very Weak', 'Weak', 'Moderate', 'Strong', 'Very Strong'][score];
  
  return (
    <div className="mt-2">
      <div className="progress" style={{ height: '5px' }}>
        <div 
          className={`progress-bar bg-${color}`} 
          role="progressbar" 
          style={{ width }}
          aria-valuenow={score * 20} 
        />
      </div>
      <small className={`text-${color} d-block mt-1`}>
        Password strength: {strengthText}
      </small>
    </div>
  );
};

const EmployeeSettings = () => {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ maxWidth: 480 });

  const validatePasswordForm = () => {
    const errors = {};
    let isValid = true;

    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
      isValid = false;
    }

    if (!passwordForm.newPassword.trim()) {
      errors.newPassword = 'New password is required';
      isValid = false;
    } else {
      if (passwordForm.newPassword.length < 8) {
        errors.newPassword = 'Must be at least 8 characters';
        isValid = false;
      }
      if (!/[A-Z]/.test(passwordForm.newPassword)) {
        errors.newPassword = 'Needs uppercase letter';
        isValid = false;
      }
      if (!/[a-z]/.test(passwordForm.newPassword)) {
        errors.newPassword = 'Needs lowercase letter';
        isValid = false;
      }
      if (!/\d/.test(passwordForm.newPassword)) {
        errors.newPassword = 'Needs number';
        isValid = false;
      }
      if (!/[^a-zA-Z\d]/.test(passwordForm.newPassword)) {
        errors.newPassword = 'Needs special character';
        isValid = false;
      }
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setPasswordErrors(errors);
    return isValid;
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      setSuccess('Password updated successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/employee/forgot-password');
  };

  return (
    <Container className="employee-settings py-3" style={{ maxWidth: '800px' }}>
      {isMobile && (
        <Button 
          variant="link" 
          onClick={() => navigate(-1)}
          className="p-0 mb-3 d-flex align-items-center"
        >
          <FiArrowLeft className="me-1" /> Back
        </Button>
      )}

      <h4 className="mb-3 d-flex align-items-center text-primary">
        <FiLock className="me-2" /> Account Settings
      </h4>

      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible className="mb-3">
          <div className="d-flex align-items-center">
            <FiAlertCircle className="me-2" />
            <span>{error}</span>
          </div>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} dismissible className="mb-3">
          <div className="d-flex align-items-center">
            <FiCheckCircle className="me-2" />
            <span>{success}</span>
          </div>
        </Alert>
      )}

      <Card className="mb-3 border-0 shadow-sm">
        <Card.Header className="bg-white border-0 py-2">
          <h5 className="d-flex align-items-center mb-0">
            <FiLock className="me-2" /> Change Password
          </h5>
        </Card.Header>
        <Card.Body className="p-3">
          <Form onSubmit={handlePasswordSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                isInvalid={!!passwordErrors.currentPassword}
                size={isMobile ? "sm" : undefined}
              />
              <Form.Control.Feedback type="invalid">
                {passwordErrors.currentPassword}
              </Form.Control.Feedback>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                isInvalid={!!passwordErrors.newPassword}
                size={isMobile ? "sm" : undefined}
              />
              <PasswordStrengthIndicator password={passwordForm.newPassword} />
              <Form.Control.Feedback type="invalid">
                {passwordErrors.newPassword}
              </Form.Control.Feedback>
              {isMobile && (
                <Form.Text className="text-muted">
                  Must include: 8+ chars, A-Z, a-z, 0-9, special char
                </Form.Text>
              )}
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                isInvalid={!!passwordErrors.confirmPassword}
                size={isMobile ? "sm" : undefined}
              />
              <Form.Control.Feedback type="invalid">
                {passwordErrors.confirmPassword}
              </Form.Control.Feedback>
            </Form.Group>
            
            <div className="d-flex justify-content-between align-items-center">
              <Button 
                variant="link" 
                className="text-danger p-0 small"
                onClick={handleForgotPassword}
              >
                Forgot Password?
              </Button>
              
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading}
                className="px-4"
                size={isMobile ? "sm" : undefined}
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    {!isMobile && 'Updating...'}
                  </>
                ) : 'Change Password'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {isMobile && (
        <div className="mt-4">
          <Button 
            variant="outline-secondary" 
            onClick={() => navigate(-1)}
            className="w-100"
          >
            Back to Dashboard
          </Button>
        </div>
      )}
    </Container>
  );
};

export default EmployeeSettings;