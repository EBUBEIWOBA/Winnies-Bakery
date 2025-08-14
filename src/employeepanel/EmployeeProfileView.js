import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { Container, Card, Form, Button, Spinner, Alert,
  Row, Col, Image, ListGroup, Badge, Modal} from 'react-bootstrap';
import { FaEdit, FaUser, FaEnvelope, FaPhone, FaHome, FaCalendarAlt, FaCheckCircle, FaTrash, FaTimes, 
  FaCamera, FaArrowLeft } from 'react-icons/fa';
import { getProfile, updateProfile } from '../api/employeePanelApi';

const EmployeeProfileView = () => {
  const isMobile = useMediaQuery({ maxWidth: 480 });
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState({
    profile: true,
    submit: false
  });
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    photo: null
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const fileInputRef = useRef(null);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());

  const statusVariant = {
    active: 'success',
    inactive: 'secondary',
    suspended: 'danger',
    'on leave': 'warning'
  };

  const handleApiError = useCallback((error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('employeeToken');
      navigate('/employee/login');
    } else {
      setError(error.message || 'An error occurred. Please try again.');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(prev => ({ ...prev, profile: true }));
        const profileData = await getProfile();

        setProfile(profileData);
        setFormData({
          phone: profileData?.phone || '',
          address: profileData?.address || '',
          photo: null
        });
      } catch (err) {
        handleApiError(err);
      } finally {
        setLoading(prev => ({ ...prev, profile: false }));
      }
    };

    fetchProfile();
  }, [handleApiError]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];

      if (!file.type.match('image.*')) {
        setError('Only image files are allowed (JPEG, PNG, GIF)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        photo: file,
        photoPreview: URL.createObjectURL(file)
      }));
      setError('');
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({
      ...prev,
      photo: null,
      photoPreview: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setLoading(prev => ({ ...prev, submit: true }));

  try {
    const formDataToSend = {
      phone: formData.phone,
      address: formData.address
    };
    
    if (formData.photo) {
      formDataToSend.photo = formData.photo;
    }

    console.log('Submitting:', formDataToSend); // Debug log

    const response = await updateProfile(formDataToSend);

    if (response && response.success) {
      setSuccess('Profile updated successfully');
      
      // Force complete refresh of profile data
      const freshProfile = await getProfile();
      setProfile(freshProfile);
      
      // Update local storage with fresh data
      localStorage.setItem('employeeProfile', JSON.stringify(freshProfile));
      
      // Force image refresh with new timestamp
      setImageTimestamp(Date.now());
      
      // Reset form with fresh data
      setFormData({
        phone: freshProfile.phone || '',
        address: freshProfile.address || '',
        photo: null,
        photoPreview: null
      });

      setEditing(false);
      
      // Debug log
      console.log('Update successful, new profile:', freshProfile);
    }
  } catch (err) {
    console.error('Update error:', err);
    setError(err.message || 'Failed to update profile');
    
    // Attempt to recover by refreshing profile data
    try {
      const freshProfile = await getProfile();
      setProfile(freshProfile);
      setFormData({
        phone: freshProfile.phone || '',
        address: freshProfile.address || '',
        photo: null,
        photoPreview: null
      });
    } catch (refreshError) {
      console.error('Failed to refresh profile after error:', refreshError);
    }
  } finally {
    setLoading(prev => ({ ...prev, submit: false }));
  }
};

// Add this useEffect to handle profile refreshes
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Refresh profile when tab becomes visible
      getProfile().then(freshProfile => {
        setProfile(freshProfile);
        setFormData({
          phone: freshProfile.phone || '',
          address: freshProfile.address || '',
          photo: null,
          photoPreview: null
        });
      });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);

  const resetForm = () => {
    setFormData({
      phone: profile?.phone || '',
      address: profile?.address || '',
      photo: null,
      photoPreview: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setEditing(false);
  };

  const handleCancel = () => {
    if (formData.photo || formData.photoPreview ||
      formData.phone !== profile?.phone ||
      formData.address !== profile?.address) {
      setShowCancelModal(true);
    } else {
      resetForm();
    }
  };

  const renderProfileImage = () => {
    if (formData.photoPreview) {
      return (
        <Image
          src={formData.photoPreview}
          roundedCircle
          width={isMobile ? 120 : 200}
          height={isMobile ? 120 : 200}
          className="border border-3 border-primary mb-3 object-fit-cover"
          alt="Profile"
        />
      );
    }
    
    if (profile?.photoUrl) {
      return (
        <Image
          src={`${profile.photoUrl}?${imageTimestamp}`}
          roundedCircle
          width={isMobile ? 120 : 200}
          height={isMobile ? 120 : 200}
          className="border border-3 border-primary mb-3 object-fit-cover"
          alt="Profile"
          onError={(e) => {
            e.target.onerror = null;
            e.target.parentElement.innerHTML = (
              <div className="avatar-placeholder" style={{
                width: isMobile ? '120px' : '200px',
                height: isMobile ? '120px' : '200px'
              }}>
                <FaUser size={isMobile ? 40 : 80} />
              </div>
            );
          }}
        />
      );
    }

    return (
      <div className="avatar-placeholder" style={{
        width: isMobile ? '120px' : '200px',
        height: isMobile ? '120px' : '200px'
      }}>
        <FaUser size={isMobile ? 40 : 80} />
      </div>
    );
  };

  if (loading.profile && !profile) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading your profile...</span>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ paddingBottom: isMobile && editing ? '80px' : '20px' }}>
      {isMobile && editing ? (
        <div className="d-flex align-items-center mb-3">
          <Button variant="link" onClick={handleCancel} className="p-0 me-2">
            <FaArrowLeft size={20} />
          </Button>
          <h5 className="mb-0">Edit Profile</h5>
        </div>
      ) : (
        <Row className="mb-4 align-items-center">
          <Col>
            <h2 className="mb-0 d-flex align-items-center">
              <FaUser className="me-2" />
              My Profile
            </h2>
            <small className="text-muted">View and update your personal information</small>
          </Col>

          {!editing && (
            <Col xs="auto">
              <Button
                variant="outline-primary"
                onClick={() => setEditing(true)}
                className="d-flex align-items-center"
              >
                <FaEdit className="me-2" /> Edit Profile
              </Button>
            </Col>
          )}
        </Row>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mt-3">
          <div className="d-flex align-items-center">
            <FaTimes className="me-2" />
            <span>{error}</span>
          </div>
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mt-3">
          <div className="d-flex align-items-center">
            <FaCheckCircle className="me-2" />
            <span>{success}</span>
          </div>
        </Alert>
      )}

      <Card className="shadow-sm mb-4">
        <Card.Body>
          {editing ? (
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col xs={12} md={4} className={`text-center mb-4 ${isMobile ? 'order-2 mt-3' : ''}`}>
                  <div className="position-relative d-inline-block">
                    <div 
                      className="avatar-edit-container"
                      onClick={() => !isMobile && document.getElementById('photo-upload').click()}
                      style={{ cursor: isMobile ? 'default' : 'pointer' }}
                    >
                      {renderProfileImage()}
                      {!isMobile && (
                        <div className="avatar-overlay">
                          <FaCamera size={24} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="d-flex justify-content-center gap-2 mt-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => document.getElementById('photo-upload').click()}
                      >
                        <FaEdit className="me-1" /> Change
                      </Button>
                      {formData.photoPreview && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={removePhoto}
                        >
                          <FaTrash className="me-1" /> Remove
                        </Button>
                      )}
                    </div>

                    <Form.Control
                      type="file"
                      id="photo-upload"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="d-none"
                    />

                    <Form.Text className="d-block text-muted mt-2">
                      JPG, PNG, or GIF. Max 5MB
                    </Form.Text>
                  </div>
                </Col>

                <Col xs={12} md={8} className={isMobile ? 'order-1' : ''}>
                  {!isMobile && <h5 className="mb-4 border-bottom pb-2">Edit Profile Information</h5>}

                  <Row className="mb-3">
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>First Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={profile?.firstName || ''}
                          readOnly
                          plaintext
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={profile?.lastName || ''}
                          readOnly
                          plaintext
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="d-flex align-items-center">
                      <FaEnvelope className="me-2" />
                      Email
                    </Form.Label>
                    <Form.Control
                      type="email"
                      value={profile?.email || ''}
                      readOnly
                      plaintext
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="d-flex align-items-center">
                      <FaPhone className="me-2" />
                      Phone
                    </Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      isInvalid={!!validationErrors.phone}
                      placeholder="Enter your phone number"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.phone}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="d-flex align-items-center">
                      <FaHome className="me-2" />
                      Address
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      isInvalid={!!validationErrors.address}
                      placeholder="Enter your full address"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.address}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {!isMobile && (
                    <div className="d-flex gap-2 pt-3 border-top">
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={loading.submit}
                        className="flex-grow-1"
                      >
                        {loading.submit ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                            Saving Changes...
                          </>
                        ) : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={handleCancel}
                        disabled={loading.submit}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </Col>
              </Row>

              {isMobile && (
                <div className="fixed-bottom bg-white p-3 border-top" style={{ left: 0, right: 0 }}>
                  <div className="d-flex gap-2">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={loading.submit}
                      className="flex-grow-1"
                    >
                      {loading.submit ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" className="me-2" />
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={handleCancel}
                      disabled={loading.submit}
                      className="flex-grow-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Form>
          ) : (
            <Row>
              <Col xs={12} md={4} className="text-center mb-4 mb-md-0">
                <div className="position-relative d-inline-block">
                  <div className="avatar-view-container">
                    {profile?.photoUrl ? (
                      <Image
                        src={`${profile.photoUrl}?${imageTimestamp}`}
                        roundedCircle
                        width={isMobile ? 120 : 200}
                        height={isMobile ? 120 : 200}
                        className="border border-3 border-primary mb-3 object-fit-cover"
                        alt="Profile"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.parentElement.innerHTML = (
                            <div className="avatar-placeholder" style={{
                              width: isMobile ? '120px' : '200px',
                              height: isMobile ? '120px' : '200px'
                            }}>
                              <FaUser size={isMobile ? 40 : 80} />
                            </div>
                          );
                        }}
                      />
                    ) : (
                      <div className="avatar-placeholder" style={{
                        width: isMobile ? '120px' : '200px',
                        height: isMobile ? '120px' : '200px'
                      }}>
                        <FaUser size={isMobile ? 40 : 80} />
                      </div>
                    )}
                  </div>

                  <h4 className="mb-1">{profile?.firstName} {profile?.lastName}</h4>
                  <p className="text-muted mb-2">{profile?.position}</p>
                  <Badge pill bg={statusVariant[profile?.status?.toLowerCase()] || 'primary'}>
                    {profile?.status}
                  </Badge>
                </div>
              </Col>

              <Col xs={12} md={8}>
                <Card className="border-0">
                  <Card.Body className="p-0">
                    <ListGroup variant="flush">
                      {isMobile ? (
                        <>
                          <ListGroup.Item className="py-2">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted d-flex align-items-center">
                                <FaEnvelope className="me-2" /> Email
                              </span>
                              <span>{profile?.email || 'Not provided'}</span>
                            </div>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-2">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Salary</span>
                              <span>{profile?.salary ? `₦${profile.salary.toLocaleString()}` : 'N/A'}</span>
                            </div>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-2">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted d-flex align-items-center">
                                <FaPhone className="me-2" /> Phone
                              </span>
                              <span>{profile?.phone || 'Not provided'}</span>
                            </div>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-2">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted d-flex align-items-center">
                                <FaHome className="me-2" /> Address
                              </span>
                              <span>{profile?.address || 'Not provided'}</span>
                            </div>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-2">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted d-flex align-items-center">
                                <FaCalendarAlt className="me-2" /> Hire Date
                              </span>
                              <span>
                                {profile?.hireDate ? new Date(profile.hireDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'N/A'}
                              </span>
                            </div>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-2">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Department</span>
                              <span>{profile?.department || 'N/A'}</span>
                            </div>
                          </ListGroup.Item>
                        </>
                      ) : (
                        // Original desktop layout
                        <>
                          <ListGroup.Item className="py-3">
                            <Row className="align-items-center">
                              <Col xs={12} sm={3} className="fw-bold d-flex align-items-center text-muted">
                                <FaEnvelope className="me-2" /> Email
                              </Col>
                              <Col xs={12} sm={9} className="mt-1 mt-sm-0">
                                {profile?.email || 'Not provided'}
                              </Col>
                            </Row>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-3">
                            <Row className="align-items-center">
                              <Col xs={12} sm={3} className="fw-bold text-muted">
                                Salary
                              </Col>
                              <Col xs={12} sm={9} className="mt-1 mt-sm-0">
                                {profile?.salary ? `₦${profile.salary.toLocaleString()}` : 'N/A'}
                              </Col>
                            </Row>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-3">
                            <Row className="align-items-center">
                              <Col xs={12} sm={3} className="fw-bold d-flex align-items-center text-muted">
                                <FaPhone className="me-2" /> Phone
                              </Col>
                              <Col xs={12} sm={9} className="mt-1 mt-sm-0">
                                {profile?.phone || 'Not provided'}
                              </Col>
                            </Row>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-3">
                            <Row className="align-items-center">
                              <Col xs={12} sm={3} className="fw-bold d-flex align-items-center text-muted">
                                <FaHome className="me-2" /> Address
                              </Col>
                              <Col xs={12} sm={9} className="mt-1 mt-sm-0">
                                {profile?.address || 'Not provided'}
                              </Col>
                            </Row>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-3">
                            <Row className="align-items-center">
                              <Col xs={12} sm={3} className="fw-bold d-flex align-items-center text-muted">
                                <FaCalendarAlt className="me-2" /> Hire Date
                              </Col>
                              <Col xs={12} sm={9} className="mt-1 mt-sm-0">
                                {profile?.hireDate ? new Date(profile.hireDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                }) : 'N/A'}
                              </Col>
                            </Row>
                          </ListGroup.Item>
                          <ListGroup.Item className="py-3">
                            <Row className="align-items-center">
                              <Col xs={12} sm={3} className="fw-bold text-muted">
                                Department
                              </Col>
                              <Col xs={12} sm={9} className="mt-1 mt-sm-0">
                                {profile?.department || 'N/A'}
                              </Col>
                            </Row>
                          </ListGroup.Item>
                        </>
                      )}
                    </ListGroup>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Discard Changes?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You have unsaved changes. Are you sure you want to cancel editing?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            <FaTimes className="me-2" /> Keep Editing
          </Button>
          <Button variant="danger" onClick={() => {
            resetForm();
            setShowCancelModal(false);
          }}>
            <FaTrash className="me-2" /> Discard Changes
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .avatar-edit-container, .avatar-view-container {
          position: relative;
          display: inline-block;
        }
        .avatar-placeholder {
          border-radius: 50%;
          background-color: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #0d6efd;
          margin-bottom: 1rem;
        }
        .avatar-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .avatar-edit-container:hover .avatar-overlay {
          opacity: 1;
          cursor: pointer;
        }
        .object-fit-cover {
          object-fit: cover;
        }
        .avatar-placeholder svg {
          color: #6c757d;
        }
        
        @media (max-width: 480px) {
          .fixed-bottom {
            padding-left: 15px;
            padding-right: 15px;
          }
        }
      `}</style>
    </Container>
  );
};

export default EmployeeProfileView;