import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Card, Row, Col, Spinner, Image, Breadcrumb } from 'react-bootstrap';
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit2, FiSave, FiUpload, FiArrowLeft, FiX, FiBriefcase } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { updateAdminProfile } from './api/adminApi';

const AdminProfile = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
  });

  const [loading, setLoading] = useState({
    profile: true,
    submit: false,
    avatar: false
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const adminData = JSON.parse(localStorage.getItem('adminData'));
        if (!adminData) {
          throw new Error('No admin data found');
        }

        setProfile(adminData);
        setFormData({
          firstName: adminData.firstName || '',
          lastName: adminData.lastName || '',
          email: adminData.email || '',
          phone: adminData.phone || '',
          address: adminData.address || '',
        });

        // Set proper avatar preview
        if (adminData.photo) {
          setAvatarPreview(adminData.photo); // Use full URL directly
        }
      } catch (err) {
        setError('Failed to load profile data');
        console.error('Profile load error:', err);
      } finally {
        setLoading(prev => ({ ...prev, profile: false }));
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, submit: true }));
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('address', formData.address);

      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }

      if (avatarRemoved) {
        formDataToSend.append('removeAvatar', 'true');
      }

      const response = await updateAdminProfile(formDataToSend);

      // Update local storage and state
      const updatedAdminData = {
        ...profile,
        ...response.admin,
        photo: response.admin.photo
      };

      localStorage.setItem('adminData', JSON.stringify(updatedAdminData));
      setProfile(updatedAdminData);

      // Update avatar preview with the URL from backend
      setAvatarPreview(response.admin.photo || null);
      
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      setAvatarFile(null);
      setAvatarRemoved(false);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setError('Please select an image file (JPEG, PNG, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setError('');
    setAvatarRemoved(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      setAvatarFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarRemoved(true);
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Reset to saved values
      setAvatarPreview(profile?.photo || null);
      setAvatarFile(null);
      setAvatarRemoved(false);
    }

    setEditMode(!editMode);
    setError('');
    setSuccess('');
  };

  if (loading.profile) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="py-4 profile-container" style={{ maxWidth: '1200px' }}>
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item onClick={() => navigate('/admin/panel/dashboard')} className="d-flex align-items-center">
          <FiArrowLeft className="me-1" /> Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item active className="fw-medium">Profile</Breadcrumb.Item>
      </Breadcrumb>

      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="profile-title d-flex align-items-center text-primary">
            <FiUser className="me-2" /> Admin Profile
          </h2>
        </Col>
        <Col xs="auto">
          <Button variant={editMode ? 'outline-danger' : 'outline-primary'} onClick={toggleEditMode}>
            {editMode ? <><FiX className="me-1" /> Cancel</> : <><FiEdit2 className="me-1" /> Edit</>}
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card className="shadow-sm">
        <Card.Body className="p-4 p-md-5">
          <Row>
            <Col md={4} className="text-center mb-4 mb-md-0">
              <div className="mb-3 position-relative">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    roundedCircle
                    className="profile-avatar"
                    style={{ width: '180px', height: '180px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      setAvatarPreview(null);
                    }}
                  />
                ) : (
                  <div className="d-flex justify-content-center align-items-center rounded-circle bg-white border shadow" style={{ width: '180px', height: '180px' }}>
                    <FiUser size={64} className="text-secondary opacity-50" />
                  </div>
                )}

                {editMode && avatarPreview && (
                  <Button variant="danger" size="sm" className="position-absolute top-0 end-0 rounded-circle p-1" onClick={handleRemoveAvatar}>
                    <FiX size={16} />
                  </Button>
                )}
              </div>

              {editMode && (
                <div className="d-flex flex-column gap-2">
                  <input type="file" id="avatarUpload" accept="image/*" onChange={handleAvatarChange} className="d-none" />
                  <Button as="label" htmlFor="avatarUpload" variant="outline-primary">
                    <FiUpload className="me-2" />
                    {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <small className="text-muted">JPG, PNG, or GIF. Max 5MB.</small>
                </div>
              )}

              <div className="profile-info mt-4">
                <h3 className="mb-1">{profile?.firstName} {profile?.lastName}</h3>
                <p className="text-muted mb-0"><FiMail className="me-1" />{profile?.email}</p>
                <p className="text-muted mb-0"><FiBriefcase className="me-1" />System Administrator</p>
              </div>
            </Col>

            <Col md={8}>
              <div className="profile-form bg-white p-4 rounded-3">
                <h4 className="mb-4 pb-2 text-primary">Personal Information</h4>
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="firstName">
                        <Form.Label><FiUser className="me-2" />First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          disabled={!editMode}
                          autoComplete="given-name"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="lastName">
                        <Form.Label><FiUser className="me-2" />Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          disabled={!editMode}
                          autoComplete="family-name"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3" controlId="email">
                    <Form.Label><FiMail className="me-2" />Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="bg-light"
                      autoComplete="email"
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="phone">
                        <Form.Label><FiPhone className="me-2" />Phone Number</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          disabled={!editMode}
                          autoComplete="tel"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-4" controlId="address">
                        <Form.Label><FiMapPin className="me-2" />Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          disabled={!editMode}
                          autoComplete="street-address"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {editMode && (
                    <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
                      <Button variant="outline-secondary" onClick={toggleEditMode}>
                        Cancel
                      </Button>
                      <Button variant="primary" type="submit" disabled={loading.submit}>
                        {loading.submit ? <Spinner size="sm" animation="border" className="me-2" /> : <FiSave className="me-2" />}
                        Save Profile
                      </Button>
                    </div>
                  )}
                </Form>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AdminProfile;