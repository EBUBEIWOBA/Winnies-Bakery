import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminRegister } from './api/adminApi';
import {Container, Card, Form, Button,
  Alert, Row, Col, FloatingLabel, Spinner, InputGroup} from 'react-bootstrap';
import {FiUser, FiMail, FiPhone, FiBriefcase,FiCheckCircle, FiEye, FiEyeOff } from 'react-icons/fi';

const AdminRegister = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: 'System Administrator',
    department: 'management',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState({ message: '', code: '' });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Validate password in real-time
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };
    setPasswordChecks(checks);
    return Object.values(checks).every(Boolean);
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError({ message: '', code: '' });

    // Validate password complexity
    if (!validatePassword(formData.password)) {
      setError({
        message: 'Password does not meet complexity requirements',
        code: 'REG_002'
      });
      setLoading(false);
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError({
        message: 'Passwords do not match',
        code: 'REG_005'
      });
      setLoading(false);
      return;
    }

    try {
      await adminRegister(formData);
      setSuccess(true);
      setTimeout(() => navigate('/admin/login'), 2000);
    } catch (err) {
      setError({
        message: err.message,
        code: err.cause?.code || 'UNKNOWN_ERROR'
      });
    } finally {
      setLoading(false);
    }
  };

  // Password requirement check component
  const PasswordRequirement = ({ valid, text }) => (
    <li className={`d-flex align-items-center ${valid ? 'text-success' : 'text-muted'}`}>
      {valid ? (
        <FiCheckCircle className="me-2" />
      ) : (
        <span className="me-2" style={{ width: '16px' }}>•</span>
      )}
      <span>{text}</span>
    </li>
  );

  return (
    <Container 
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%)' }}
    >
      <Card className="shadow-lg border-0 rounded-4 overflow-hidden" style={{ width: '100%', maxWidth: '850px' }}>
        <Card.Header className="bg-primary bg-gradient text-white py-4">
          <div className="text-center">
            <FiUser className="fs-1 mb-3" />
            <h2 className="fw-bold mb-0">Create Admin Account</h2>
            <p className="mb-0 opacity-75">Register a new administrator account</p>
          </div>
        </Card.Header>
        
        <Card.Body className="p-4 p-md-5 bg-white">
          {error.code === 'ADMIN_LIMIT_REACHED' && (
            <Alert variant="danger" className="mt-3">
              <Alert.Heading>Admin Limit Reached</Alert.Heading>
              <p>{error.message}</p>
              <p>Please contact system administrator if you need access.</p>
            </Alert>
          )}
          
          {error.message && (
            <Alert variant="danger" className="mb-4" onClose={() => setError({ message: '', code: '' })} dismissible>
              <Alert.Heading>Registration Error</Alert.Heading>
              <p>{error.message}</p>
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              <FiCheckCircle className="me-2" />
              Admin created successfully! Redirecting to login...
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <h5 className="text-muted mb-3 border-bottom pb-2">Personal Information</h5>
            <Row className="mb-4">
              <Col md={6}>
                <FloatingLabel controlId="firstName" label="First Name" className="mb-3">
                  <Form.Control
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel controlId="lastName" label="Last Name" className="mb-3">
                  <Form.Control
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </FloatingLabel>
              </Col>
            </Row>

            <FloatingLabel controlId="email" label="Email Address" className="mb-3">
              <Form.Control
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <Form.Text className="text-muted">
                <FiMail className="me-1" />
                We'll never share your email with anyone else.
              </Form.Text>
            </FloatingLabel>

            <FloatingLabel controlId="phone" label="Phone Number" className="mb-3">
              <Form.Control
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                required
                pattern="[+]{0,1}[0-9\s\-]+"
              />
              <Form.Text className="text-muted">
                <FiPhone className="me-1" />
                Include country code (e.g. +1 for US)
              </Form.Text>
            </FloatingLabel>

            <h5 className="text-muted mb-3 border-bottom pb-2">Work Information</h5>
            <Row className="mb-4">
              <Col md={8}>
                <FloatingLabel controlId="position" label="Position" className="mb-3">
                  <Form.Control
                    type="text"
                    name="position"
                    placeholder="Position"
                    value={formData.position}
                    onChange={handleChange}
                    required
                  />
                </FloatingLabel>
              </Col>
              <Col md={4}>
                <FloatingLabel controlId="department" label="Department">
                  <Form.Select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                  >
                    <option value="management">Management</option>
                  </Form.Select>
                </FloatingLabel>
              </Col>
            </Row>

            <h5 className="text-muted mb-3 border-bottom pb-2">Account Security</h5>
            <Row className="mb-3">
              <Col md={6}>
                <FloatingLabel controlId="password" label="Password">
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                      minLength="8"
                      required
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </Button>
                  </InputGroup>
                </FloatingLabel>
                
                <div className="mt-3 p-3 bg-light rounded-2">
                  <h6 className="mb-2">Password Requirements:</h6>
                  <ul className="list-unstyled mb-0">
                    <PasswordRequirement 
                      valid={passwordChecks.length} 
                      text="At least 8 characters" 
                    />
                    <PasswordRequirement 
                      valid={passwordChecks.uppercase} 
                      text="One uppercase letter (A-Z)" 
                    />
                    <PasswordRequirement 
                      valid={passwordChecks.lowercase} 
                      text="One lowercase letter (a-z)" 
                    />
                    <PasswordRequirement 
                      valid={passwordChecks.number} 
                      text="One number (0-9)" 
                    />
                    <PasswordRequirement 
                      valid={passwordChecks.special} 
                      text="One special character (@$!%*?&)" 
                    />
                  </ul>
                </div>
              </Col>
              
              <Col md={6}>
                <FloatingLabel controlId="confirmPassword" label="Confirm Password">
                  <InputGroup>
                    <Form.Control
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      minLength="8"
                      required
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={toggleConfirmPasswordVisibility}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </Button>
                  </InputGroup>
                </FloatingLabel>
                
                <div className="mt-4 p-3 bg-light rounded-2">
                  <h6 className="mb-2">Security Tips:</h6>
                  <ul className="small mb-0">
                    <li>Use a unique password not used elsewhere</li>
                    <li>Consider using a password manager</li>
                    <li>Change your password every 90 days</li>
                  </ul>
                </div>
              </Col>
            </Row>

            <div className="d-grid gap-2 mt-4">
              <Button
                variant="primary"
                size="lg"
                type="submit"
                disabled={loading}
                className="py-3 fw-bold shadow"
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
                    Creating Account...
                  </>
                ) : (
                  <>
                    <FiBriefcase className="me-2" />
                    Create Admin Account
                  </>
                )}
              </Button>
            </div>

            <div className="text-center mt-4">
              <p className="text-muted mb-0">
                Already have an account?{' '}
                <Button 
                  variant="link" 
                  onClick={() => navigate('/admin/login')} 
                  className="p-0 text-decoration-none"
                >
                  Login here
                </Button>
              </p>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AdminRegister;