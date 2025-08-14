import React, { useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from 'react-responsive';
import { Container, Card, Button, Table, Form, Modal, Alert, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { FaCalendarAlt, FaPlus, FaTrash, FaInfoCircle, FaClock } from 'react-icons/fa';
import { getLeaves, applyLeave, cancelLeaveRequest } from '../api/employeePanelApi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { isBefore } from 'date-fns';

const EmployeeLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const isMobile = useMediaQuery({ maxWidth: 480 });

  const [formData, setFormData] = useState({
    startDate: null,
    endDate: null,
    type: 'vacation',
    notes: ''
  });

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        status: filter !== 'all' ? filter : undefined,
        year: yearFilter
      };

      const response = await getLeaves(params);
      setLeaves(response.data || []);
    } catch (err) {
      console.error('Fetch leaves error:', err);
      setError(err.message || 'Failed to load leave requests');
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [filter, yearFilter]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (!formData.startDate || !formData.endDate) {
        throw new Error('Please select both start and end dates');
      }

      if (isBefore(formData.endDate, formData.startDate)) {
        throw new Error('End date cannot be before start date');
      }

      const timeDiff = formData.endDate - formData.startDate;
      const leaveDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
      
      if (leaveDays < 1) throw new Error('Invalid leave duration');
      if (leaveDays > 30) throw new Error('Leave cannot exceed 30 days');

      const payload = {
        startDate: formData.startDate.toISOString().substring(0, 10),
        endDate: formData.endDate.toISOString().substring(0, 10),
        type: formData.type,
        notes: formData.notes
      };

      const response = await applyLeave(payload);

      if (response.success) {
        setLeaves(prev => [{
          ...response.data,
          _id: response.data._id || Date.now().toString()
        }, ...prev]);
        setSuccess(response.message || 'Leave request submitted successfully');
        setShowModal(false);
        resetForm();
      } else {
        setError(response.message || 'Failed to submit leave request');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const response = await cancelLeaveRequest(leaveId);

      if (response.success) {
        setLeaves(prev => prev.filter(leave => leave._id !== leaveId));
        setSuccess(response.message || 'Leave request cancelled successfully');
      } else {
        setError(response.message || 'Failed to cancel leave request');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to cancel leave request');
    } finally {
      setSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      startDate: null,
      endDate: null,
      type: 'vacation',
      notes: ''
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { bg: 'warning', text: 'Pending' },
      approved: { bg: 'success', text: 'Approved' },
      rejected: { bg: 'danger', text: 'Rejected' }
    };
    const variant = variants[status] || { bg: 'secondary', text: 'Unknown' };
    return <Badge bg={variant.bg}>{variant.text}</Badge>;
  };

  const getLeaveTypeName = (type) => {
    const types = {
      vacation: 'Vacation',
      sick: 'Sick',
      personal: 'Personal',
      emergency: 'Emergency'
    };
    return isMobile ? types[type]?.substring(0, 4) || type : types[type] || type;
  };

  const availableYears = Array.from({ length: 5 }, (_, i) =>
    (new Date().getFullYear() - i).toString()
  );

  const calculateLeaveDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    } catch (error) {
      console.error('Leave days calculation error:', error);
      return 0;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return isMobile 
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return 'N/A';
    }
  };

  const renderLeaveTable = () => (
    <div className="table-responsive">
      <Table striped hover className="mb-0">
        <thead>
          <tr>
            <th>Type</th>
            {!isMobile && <th>Start Date</th>}
            {!isMobile && <th>End Date</th>}
            <th>Days</th>
            <th>Status</th>
            {isMobile ? (
              <th>Actions</th>
            ) : (
              <>
                <th>Requested</th>
                <th>Actions</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {leaves.map(leave => (
            <tr key={leave._id}>
              <td>{getLeaveTypeName(leave.type)}</td>
              {!isMobile && <td>{formatDate(leave.startDate)}</td>}
              {!isMobile && <td>{formatDate(leave.endDate)}</td>}
              <td>{leave.days}</td>
              <td>{getStatusBadge(leave.status)}</td>
              {!isMobile && <td>{formatDate(leave.createdAt)}</td>}
              <td>
                {leave.status === 'pending' && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(leave._id)}
                    disabled={submitting}
                  >
                    {isMobile ? <FaTrash /> : 'Cancel'}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );

  const renderNewLeaveModal = () => (
    <Modal 
      show={showModal} 
      onHide={() => {
        setShowModal(false);
        resetForm();
      }}
      size={isMobile ? "sm" : "lg"}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>New Leave Request</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col xs={12} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Leave Type</Form.Label>
                <Form.Select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal</option>
                  <option value="emergency">Emergency</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col xs={12} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <DatePicker
                  selected={formData.startDate}
                  onChange={(date) => handleDateChange(date, 'startDate')}
                  className="form-control"
                  dateFormat={isMobile ? "MMM d, yyyy" : "yyyy-MM-dd"}
                  minDate={new Date()}
                  required
                  withPortal={isMobile}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>End Date</Form.Label>
                <DatePicker
                  selected={formData.endDate}
                  onChange={(date) => handleDateChange(date, 'endDate')}
                  className="form-control"
                  dateFormat={isMobile ? "MMM d, yyyy" : "yyyy-MM-dd"}
                  minDate={formData.startDate || new Date()}
                  required
                  withPortal={isMobile}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Notes (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Reason for leave"
            />
          </Form.Group>

          {formData.startDate && formData.endDate && (
            <Alert variant="info" className="d-flex align-items-center">
              <FaClock className="me-2" />
              <span>
                You are requesting {calculateLeaveDays(formData.startDate, formData.endDate)} day(s)
              </span>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={submitting || !formData.startDate || !formData.endDate}
          >
            {submitting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                {!isMobile && 'Submitting...'}
              </>
            ) : 'Submit Request'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );

  return (
    <Container className="py-3">
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="mb-0 d-flex align-items-center">
            <FaCalendarAlt className="me-2" />
            Leave Management
          </h4>
          <small className="text-muted">Request and track your leave applications</small>
        </Col>
        <Col xs="auto">
          <Button
            variant="primary"
            onClick={() => setShowModal(true)}
            className="d-flex align-items-center"
            size={isMobile ? "sm" : ""}
          >
            <FaPlus className="me-1" /> {!isMobile && 'New Request'}
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-3">
          {success}
        </Alert>
      )}

      <Card className="shadow-sm mb-3">
        <Card.Body className="p-2">
          <Row className="g-2 mb-3">
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label>Status Filter</Form.Label>
                <Form.Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  size={isMobile ? "sm" : ""}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label>Year Filter</Form.Label>
                <Form.Select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  size={isMobile ? "sm" : ""}
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading leave requests...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaInfoCircle size={24} className="mb-2" />
              <p>No leave requests found</p>
            </div>
          ) : (
            renderLeaveTable()
          )}
        </Card.Body>
      </Card>

      {renderNewLeaveModal()}
    </Container>
  );
};

export default EmployeeLeave;