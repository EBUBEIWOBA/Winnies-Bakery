import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { forgotPassword } from './api/adminApi';
import {Container, Card, Form, Button, Alert, Spinner} from 'react-bootstrap';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ message: '', code: '' });
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError({ message: '', code: '' });

    try {
      await forgotPassword({ email });
      setSuccess(true);
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
          <h2 className="text-center mb-4">Forgot Password</h2>
          
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
                If an account exists with this email, a reset link has been sent.
              </Alert>
              <div className="text-center mt-3">
                <Button variant="link" onClick={() => navigate('/admin/login')}>
                  Back to Login
                </Button>
              </div>
            </>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Form.Text className="text-muted">
                  Enter the email associated with your account
                </Form.Text>
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <div className="text-center mt-3">
                <Button variant="link" onClick={() => navigate('/admin/login')}>
                  Remember your password? Login
                </Button>
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ForgotPassword;