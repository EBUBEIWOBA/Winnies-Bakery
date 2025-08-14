import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { resetPassword } from './api/adminApi';
import { Container,Card, Form, Button,Alert, Spinner} from 'react-bootstrap';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ message: '', code: '' });
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError({ message: '', code: '' });

    if (password !== confirmPassword) {
      setError({
        message: 'Passwords do not match',
        code: 'RP_003'
      });
      setLoading(false);
      return;
    }

    try {
      const response = await resetPassword({ token, password });
      localStorage.setItem('adminToken', response.token);
      localStorage.setItem('adminData', JSON.stringify(response.admin));
      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/admin/panel/dashboard', { replace: true });
      }, 3000);
    } catch (err) {
      setError({
        message: err.message,
        code: err.code
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card className="w-100" style={{ maxWidth: '400px' }}>
        <Card.Body>
          <h2 className="text-center mb-4">Reset Password</h2>
          
          {error.message && (
            <Alert variant="danger" className="d-flex align-items-center">
              <FiAlertCircle className="me-2" />
              {error.message}
            </Alert>
          )}
          
          {success ? (
            <>
              <Alert variant="success" className="d-flex align-items-center">
                <FiCheckCircle className="me-2" />
                Password updated successfully! Redirecting...
              </Alert>
            </>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="8"
                />
                <Form.Text className="text-muted">
                  Must contain: uppercase, lowercase, number, special character
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength="8"
                />
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Updating...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResetPassword;