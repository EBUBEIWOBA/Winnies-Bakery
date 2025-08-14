import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Card, Alert, Spinner, Row, Col, Image, Badge } from 'react-bootstrap';
import { FiArrowLeft, FiSave, FiUser, FiUpload, FiX } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import employeeApi from '../api/employeeApi';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    salary: '',
    hireDate: '',
    status: 'active'
  });

  // Clean up photo preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        if (id !== 'new') {
          setLoading(true);
          const employeeData = await employeeApi.getEmployeeById(id);

          setFormData({
            firstName: employeeData.firstName || '',
            lastName: employeeData.lastName || '',
            email: employeeData.email || '',
            phone: employeeData.phone || '',
            position: employeeData.position || '',
            department: employeeData.department || '',
            salary: employeeData.salary || '',
            hireDate: employeeData.hireDate ? employeeData.hireDate.split('T')[0] : '',
            status: employeeData.status || 'active'
          });

          // Set photo preview only if it exists and is not null
          if (employeeData.photo) {
            setPhotoPreview(employeeData.photo);
          }
        }
      } catch (err) {
        console.error('Failed to load employee:', err);
        setError('Failed to load employee data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Only JPG, PNG, or WEBP images are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Clean up previous blob URL if it exists
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoFile(file);
    setError('');
  };

  const removePhoto = () => {
    if (photoPreview) {
      // Clean up blob URL if it exists
      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(null);
    }
    setPhotoFile(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setTemporaryPassword(null);

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'position', 'department'];
    const missingFields = requiredFields.filter(field => !formData[field].trim());

    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      setSaving(false);
      return;
    }

   try {
    const formDataToSend = new FormData();
    
    // Append all fields except photo
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'photo') {
        formDataToSend.append(key, value);
      }
    });

    // Handle photo removal
    if (photoPreview === null && id !== 'new') {
      formDataToSend.append('photo', '');
    }

    // Append new photo if provided
    if (photoFile) {
      formDataToSend.append('photo', photoFile);
    }

      if (id === 'new') {
        const response = await employeeApi.createEmployee(formDataToSend);

        // Handle temporary password
        if (response.temporaryPassword) {
          try {
            await navigator.clipboard.writeText(response.temporaryPassword);
            setSuccess(`Employee created! Temporary password: ${response.temporaryPassword} (copied to clipboard)`);
          } catch (err) {
            setSuccess(`Employee created! Temporary password: ${response.temporaryPassword}`);
          }
          setTemporaryPassword(response.temporaryPassword);
        } else {
          setSuccess('Employee created successfully!');
        }

        // Reset form after successful creation
        setTimeout(() => {
          navigate('/admin/panel/employees');
        }, 2000);
      } else {
      const response = await employeeApi.updateEmployee(id, formDataToSend, photoFile);
      
      // Update photo preview if changed
      if (response.data?.photo !== undefined) {
        if (photoPreview && photoPreview.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreview);
        }
        setPhotoFile(null);
        setPhotoPreview(response.data.photo || null);
      }

      setSuccess('Employee updated successfully!');
    }
  } catch (err) {
    console.error('Error saving employee:', err);
    setError(err.message || 'An error occurred while saving. Please try again.');
  } finally {
      setSaving(false);
    }
  };

  if (loading && id !== 'new') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <Button
        variant="outline-secondary"
        onClick={() => navigate('/admin/panel/employees')}
        className="mb-3"
        disabled={saving}
      >
        <FiArrowLeft className="me-2" /> Back to Employees
      </Button>

      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} dismissible>
          {success}
          {temporaryPassword && (
            <div className="mt-2">
              <strong>Temporary password:</strong> {temporaryPassword}
            </div>
          )}
        </Alert>
      )}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4>{id === 'new' ? 'New Employee' : `${formData.firstName} ${formData.lastName}`}</h4>
          <Badge bg={
            formData.status === 'active' ? 'success' :
              formData.status === 'inactive' ? 'secondary' :
                formData.status === 'on leave' ? 'warning' : 'danger'
          }>
            {formData.status}
          </Badge>
        </Card.Header>

        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="mb-4">
              <Col md={3} className="text-center">
                <div className="mb-3 position-relative">
                  {photoPreview ? (
                    <>
                      <Image
                        src={photoPreview}
                        roundedCircle
                        style={{
                          width: '150px',
                          height: '150px',
                          objectFit: 'cover',
                          border: '1px solid #dee2e6'
                        }}
                        onError={() => {
                          // If the image fails to load (e.g., invalid URL), show the placeholder
                          setPhotoPreview(null);
                        }}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        className="position-absolute top-0 end-0 rounded-circle"
                        onClick={removePhoto}
                        disabled={saving}
                        style={{ width: '30px', height: '30px' }}
                      >
                        <FiX size={14} />
                      </Button>
                    </>
                  ) : (
                    <div
                      className="bg-light rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: '150px',
                        height: '150px',
                        border: '1px dashed #adb5bd'
                      }}
                    >
                      <FiUser size={48} className="text-secondary" />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="d-none"
                  disabled={saving}
                />

                <Button
                  variant="outline-primary"
                  onClick={triggerFileInput}
                  disabled={saving}
                  className="w-100"
                >
                  <FiUpload className="me-2" />
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>

                <Form.Text className="d-block text-muted mt-1">
                  Max 5MB (JPG, PNG, WEBP)
                </Form.Text>
              </Col>

              <Col md={9}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="firstName">
                      <Form.Label>First Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        disabled={saving}
                        autoComplete="given-name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="lastName">
                      <Form.Label>Last Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        disabled={saving}
                        autoComplete="family-name"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={saving}
                        autoComplete="email"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="phone">
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={saving}
                        autoComplete="tel"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="position">
                      <Form.Label>Position *</Form.Label>
                      <Form.Control
                        type="text"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                        required
                        disabled={saving}
                        autoComplete="organization-title"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="department">
                      <Form.Label>Department *</Form.Label>
                      <Form.Select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
                        disabled={saving}
                        autoComplete="organization-unit"
                      >
                        <option value="">Select Department</option>
                        <option value="bakery">Bakery</option>
                        <option value="sales">Sales</option>
                        <option value="management">Management</option>
                        <option value="delivery">Delivery</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="salary">
                      <Form.Label>Salary (₦)</Form.Label>
                      <Form.Control
                        type="number"
                        name="salary"
                        value={formData.salary}
                        onChange={handleChange}
                        disabled={saving}
                        min="0"
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="hireDate">
                      <Form.Label>Hire Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="hireDate"
                        value={formData.hireDate}
                        onChange={handleChange}
                        disabled={saving}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4" controlId="status">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                  </Form.Select>
                </Form.Group>

                <div className="d-flex justify-content-end">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={saving}
                    className="px-4"
                  >
                    {saving ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        {id === 'new' ? 'Creating...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <FiSave className="me-2" />
                        {id === 'new' ? 'Create Employee' : 'Save Changes'}
                      </>
                    )}
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmployeeProfile;