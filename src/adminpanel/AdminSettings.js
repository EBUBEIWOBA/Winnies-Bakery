import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Card, Tabs, Tab, Row, Col, Spinner, FormCheck, Modal} from 'react-bootstrap';
import { FiSettings, FiLock, FiBell, FiUserPlus, FiCheckCircle, FiAlertCircle, FiUsers} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { updateAdminPassword, updateAdminSettings } from './api/adminApi';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('security');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [settingsForm, setSettingsForm] = useState({
    notifications: true,
    emailAlerts: true,
    darkMode: false
  });
  const [loading, setLoading] = useState({
    security: false,
    notifications: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const adminData = JSON.parse(localStorage.getItem('adminData'));
        if (adminData?.settings) {
          setSettingsForm({
            notifications: adminData.settings.notifications !== false,
            emailAlerts: adminData.settings.emailAlerts !== false,
            darkMode: adminData.settings.darkMode === true
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };

    loadSettings();
  }, []);

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
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
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

  const handleSettingsChange = (e) => {
    const { name, checked } = e.target;
    setSettingsForm(prev => ({ ...prev, [name]: checked }));
  };

  // AdminSettings.js
const handlePasswordSubmit = async (e) => {
  e.preventDefault();
  
  if (!validatePasswordForm()) return;

  setLoading(prev => ({ ...prev, security: true }));
  setError('');
  setSuccess('');
  
  try {
    // Send all password fields including confirmation
    await updateAdminPassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword
    });
    
    setSuccess('Password updated successfully!');
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
    setError(err.message || 'Failed to update password');
  } finally {
    setLoading(prev => ({ ...prev, security: false }));
  }
};

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, notifications: true }));
    setError('');
    setSuccess('');
    
    try {
      const response = await updateAdminSettings({
        notifications: settingsForm.notifications,
        emailAlerts: settingsForm.emailAlerts,
        darkMode: settingsForm.darkMode
      });
      
      // Update local storage with new settings
      const adminData = JSON.parse(localStorage.getItem('adminData'));
      adminData.settings = response.settings;
      localStorage.setItem('adminData', JSON.stringify(adminData));
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save settings. Please try again.');
      console.error('Settings update error:', err);
    } finally {
      setLoading(prev => ({ ...prev, notifications: false }));
    }
  };

  const PasswordStrengthIndicator = ({ password }) => {
    if (!password) return null;
    
    const strength = {
      0: 'Very Weak',
      1: 'Weak',
      2: 'Moderate',
      3: 'Strong',
      4: 'Very Strong'
    };
    
    const getStrength = (pwd) => {
      let score = 0;
      // Length
      if (pwd.length >= 8) score++;
      if (pwd.length >= 12) score++;
      // Contains uppercase
      if (/[A-Z]/.test(pwd)) score++;
      // Contains lowercase
      if (/[a-z]/.test(pwd)) score++;
      // Contains numbers
      if (/\d/.test(pwd)) score++;
      // Contains special chars
      if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
      
      return Math.min(score, 4);
    };
    
    const score = getStrength(password);
    const width = `${(score / 4) * 100}%`;
    const color = score < 2 ? 'danger' : score < 3 ? 'warning' : 'success';
    
    return (
      <div className="mt-2">
        <div className="progress" style={{ height: '5px' }}>
          <div 
            className={`progress-bar bg-${color}`} 
            role="progressbar" 
            style={{ width }}
            aria-valuenow={score * 25} 
            aria-valuemin="0" 
            aria-valuemax="100"
          />
        </div>
        <small className={`text-${color} d-block mt-1`}>
          Password strength: {strength[score]}
        </small>
      </div>
    );
  };

  const handleCreateAdmin = () => {
    setShowCreateAdminModal(true);
  };

  const navigateToAdminCreation = () => {
    navigate('/admin/register');
    setShowCreateAdminModal(false);
  };

  return (
    <Container className="settings-container py-4" style={{ maxWidth: '1200px' }}>
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="d-flex align-items-center text-primary">
            <FiSettings className="me-2" /> Admin Settings
          </h2>
          <p className="text-muted">Manage your account preferences and system settings</p>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary" 
            className="d-flex align-items-center shadow"
            onClick={handleCreateAdmin}
          >
            <FiUserPlus className="me-2" /> Create New Admin
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible className="mb-4">
          <FiAlertCircle className="me-2" /> <strong>Error!</strong> {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} dismissible className="mb-4">
          <FiCheckCircle className="me-2" /> <strong>Success!</strong> {success}
        </Alert>
      )}

      <Tabs 
        activeKey={activeTab} 
        onSelect={(k) => {
          setActiveTab(k);
          setError('');
          setSuccess('');
        }} 
        className="settings-tabs mb-4"
        // variant="pills"
      >
        <Tab 
          eventKey="security" 
          title={
            <span className="d-flex align-items-center">
              <FiLock className="me-2" /> Security
            </span>
          }
        >
          <Card className="mt-3 settings-card border-0 shadow">
            <Card.Body className="p-4">
              <h5 className="mb-4 d-flex align-items-center text-primary">
                <FiLock className="me-2" /> Change Password
              </h5>
              
              <Form onSubmit={handlePasswordSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-medium">Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    isInvalid={!!passwordErrors.currentPassword}
                    placeholder="Enter your current password"
                    className="py-2"
                  />
                  <Form.Control.Feedback type="invalid">
                    {passwordErrors.currentPassword}
                  </Form.Control.Feedback>
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label className="fw-medium">New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    isInvalid={!!passwordErrors.newPassword}
                    placeholder="Create a new password"
                    className="py-2"
                  />
                  <Form.Control.Feedback type="invalid">
                    {passwordErrors.newPassword}
                  </Form.Control.Feedback>
                  <PasswordStrengthIndicator password={passwordForm.newPassword} />
                  <Form.Text className="text-muted">
                    Must include uppercase, lowercase, number, and special character
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label className="fw-medium">Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    isInvalid={!!passwordErrors.confirmPassword}
                    placeholder="Confirm your new password"
                    className="py-2"
                  />
                  <Form.Control.Feedback type="invalid">
                    {passwordErrors.confirmPassword}
                  </Form.Control.Feedback>
                </Form.Group>
                
                <div className="d-flex justify-content-end mt-4 pt-2 border-top">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading.security}
                    className="px-4 shadow"
                  >
                    {loading.security ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Updating Password...
                      </>
                    ) : 'Update Password'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab 
          eventKey="notifications" 
          title={
            <span className="d-flex align-items-center">
              <FiBell className="me-2" /> Notifications
            </span>
          }
              className="notification-tab"
        >
          <Card className="mt-3 settings-card border-0 shadow">
            <Card.Body className="p-4">
              <h5 className="mb-4 d-flex align-items-center text-primary">
                <FiBell className="me-2" /> Notification Preferences
              </h5>
              
              <Form onSubmit={handleSettingsSubmit}>
                <Form.Group className="mb-4">
                  <div className="mb-4 p-3 bg-light rounded-3">
                    <FormCheck
                      type="switch"
                      id="notifications-switch"
                      label={<span className="fw-medium">Enable system notifications</span>}
                      name="notifications"
                      checked={settingsForm.notifications}
                      onChange={handleSettingsChange}
                      className="mb-2"
                    />
                    <Form.Text className="text-muted d-block ps-4">
                      Receive alerts for important system events
                    </Form.Text>
                  </div>
                  
                  <div className="mb-4 p-3 bg-light rounded-3">
                    <FormCheck
                      type="switch"
                      id="emailAlerts-switch"
                      label={<span className="fw-medium">Enable email notifications</span>}
                      name="emailAlerts"
                      checked={settingsForm.emailAlerts}
                      onChange={handleSettingsChange}
                      className="mb-2"
                    />
                    <Form.Text className="text-muted d-block ps-4">
                      Get important updates via email
                    </Form.Text>
                  </div>

                  <div className="mb-4 p-3 bg-light rounded-3">
                    <FormCheck
                      type="switch"
                      id="darkMode-switch"
                      label={<span className="fw-medium">Enable dark mode</span>}
                      name="darkMode"
                      checked={settingsForm.darkMode}
                      onChange={handleSettingsChange}
                      className="mb-2"
                    />
                    <Form.Text className="text-muted d-block ps-4">
                      Switch between light and dark theme
                    </Form.Text>
                  </div>
                </Form.Group>
                
                <div className="d-flex justify-content-end mt-2 border-top pt-4">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading.notifications}
                    className="px-4 shadow"
                  >
                    {loading.notifications ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Saving Preferences...
                      </>
                    ) : 'Save Settings'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab 
          eventKey="admins" 
          title={
            <span className="d-flex align-items-center">
              <FiUsers className="me-2" /> Admin Management
            </span>
          }
              className="admin-management-tab"
        >
          <Card className="mt-3 settings-card border-0 shadow">
            <Card.Body className="p-4">
              <h5 className="mb-4 d-flex align-items-center text-primary">
                <FiUsers className="me-2" /> Manage Administrators
              </h5>
              
              <div className="bg-light p-4 rounded-3 mb-4">
                <h6 className="d-flex align-items-center mb-3">
                  <FiUserPlus className="me-2" /> Create New Admin
                </h6>
                <p className="text-muted">
                  Add new administrators to help manage the system. Each admin will have full access to all system features.
                </p>
                <Button 
                  variant="primary" 
                  className="mt-2 d-flex align-items-center"
                  onClick={handleCreateAdmin}
                >
                  <FiUserPlus className="me-2" /> Create New Admin Account
                </Button>
              </div>
              
              <div className="bg-light p-4 rounded-3">
                <h6 className="mb-3">Current Administrators</h6>
                <p className="text-muted">
                  View and manage existing administrator accounts.
                </p>
                <Button 
                  variant="outline-primary" 
                  className="mt-2"
                  onClick={() =>     navigate('/admin/panel/manager')}
                >
                  View Admin List
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      
      {/* Create Admin Modal */}
      <Modal show={showCreateAdminModal} onHide={() => setShowCreateAdminModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <FiUserPlus className="me-2" /> Create New Admin
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            You are about to create a new administrator account. This user will have full access to all system features.
          </p>
          <p className="fw-medium">
            Are you sure you want to proceed?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateAdminModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={navigateToAdminCreation}>
            Create Admin Account
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminSettings;