import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Form, Row, Col, Badge, Alert, Spinner, Modal } from 'react-bootstrap';
import { FiPlus, FiCheck, FiFilter, FiX, FiClock, FiUser, FiCalendar, FiInfo } from 'react-icons/fi';
import employeeApi from '../api/employeeApi';

const LeaveManager = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);

  const [newRequest, setNewRequest] = useState({
    employeeId: '',
    type: '',
    startDate: '',
    endDate: '',
    notes: ''
  });

  // Helper function for rate-limited API calls
  const fetchWithRetry = useCallback(async (apiCall) => {
    const MAX_RETRIES = 2;
    let retryCount = 0;
    
    const execute = async () => {
      try {
        return await apiCall();
      } catch (err) {
        if (err.response?.status === 429 && retryCount < MAX_RETRIES) {
          const retryAfter = err.response.headers['retry-after'] || 1;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          retryCount++;
          return execute();
        }
        throw err;
      }
    };
    
    return execute();
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both endpoints in parallel
        const [employeesRes, leavesRes] = await Promise.all([
          fetchWithRetry(() => employeeApi.getEmployees()),
          fetchWithRetry(() => employeeApi.getAllLeaveRequests())
        ]);

        // Process employees
        const processedEmployees = Array.isArray(employeesRes) ? employeesRes :
          employeesRes?.data ? employeesRes.data :
            employeesRes?.employees ? employeesRes.employees : [];

        setEmployees(processedEmployees);

        // Create employee map
        const employeeMap = {};
        processedEmployees.forEach(emp => {
          employeeMap[emp._id] = `${emp.firstName} ${emp.lastName}`;
        });

        // Process leave requests
        const processedLeaves = Array.isArray(leavesRes) ? leavesRes :
          leavesRes?.data ? leavesRes.data : [];

        // Map employee names to leave requests
        const leavesWithNames = processedLeaves.map(leave => {
          const employeeName = employeeMap[leave.employeeId] || 'Unknown Employee';
          return {
            ...leave,
            employeeName,
            previousStatus: leave.status
          };
        });

        setLeaveRequests(leavesWithNames);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchWithRetry]);

  // Calculate days between dates
  const calculateDaysBetweenDates = (startDate, endDate) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime())) return 'Invalid start date';
      if (isNaN(end.getTime())) return 'Invalid end date';
      
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 'Error';
    }
  };

  // Filter leave requests
  const filteredRequests = leaveRequests.filter(request => {
    const matchesEmployee = !filterEmployee ||
      request.employeeName.toLowerCase().includes(filterEmployee.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesType = filterType === 'all' || request.type?.toLowerCase() === filterType;

    return matchesEmployee && matchesStatus && matchesType;
  });

  // Handle status change
  const handleStatusChange = async (leaveId, newStatus) => {
    if (Date.now() - lastRefresh < 2000) {
      setError('Please wait before updating another request');
      return;
    }
    
    try {
      setError(null);
      setLoading(true);

      // Optimistic UI update
      setLeaveRequests(prev => prev.map(req =>
        req._id === leaveId ? { ...req, status: 'updating', previousStatus: req.status } : req
      ));

      // Call API
      const response = await fetchWithRetry(
        () => employeeApi.updateLeaveStatus(leaveId, newStatus)
      );

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to update leave status');
      }

      // Update state
      setLeaveRequests(prev => prev.map(req =>
        req._id === leaveId ? { ...req, status: newStatus } : req
      ));

      setSuccess(`Leave request ${newStatus} successfully!`);
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Leave update error:', err.message);
      setError(err.message || 'Failed to update leave status');

      // Revert optimistic update
      setLeaveRequests(prev => prev.map(req =>
        req._id === leaveId ? { ...req, status: req.previousStatus } : req
      ));
    } finally {
      setLoading(false);
    }
  };

  // Handle new leave request
  const handleSubmitNewRequest = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate dates
      if (!newRequest.startDate || !newRequest.endDate) {
        throw new Error('Both start and end dates are required');
      }

      const startDate = new Date(newRequest.startDate);
      const endDate = new Date(newRequest.endDate);

      if (isNaN(startDate.getTime())) throw new Error('Invalid start date');
      if (isNaN(endDate.getTime())) throw new Error('Invalid end date');
      if (endDate < startDate) throw new Error('End date cannot be before start date');

      // Submit request
      const response = await fetchWithRetry(
        () => employeeApi.createLeaveRequest(
          newRequest.employeeId,
          {
            type: newRequest.type,
            startDate: newRequest.startDate,
            endDate: newRequest.endDate,
            notes: newRequest.notes
          }
        )
      );

      // Find employee name
      const employee = employees.find(e => e._id === newRequest.employeeId);
      const employeeName = employee ? 
        `${employee.firstName} ${employee.lastName}` : 'New Employee';

      // Add to state
      const newLeave = {
        ...response.data || response,
        employeeName,
        previousStatus: 'pending'
      };

      setLeaveRequests(prev => [newLeave, ...prev]);
      setSuccess('Leave request submitted successfully!');
      setShowNewRequest(false);
      setNewRequest({
        employeeId: '',
        type: '',
        startDate: '',
        endDate: '',
        notes: ''
      });
    } catch (err) {
      console.error('Error submitting leave request:', err);
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge bg="success" className="d-flex align-items-center"><FiCheck /> Approved</Badge>;
      case 'rejected':
        return <Badge bg="danger" className="d-flex align-items-center"><FiX /> Rejected</Badge>;
      case 'pending':
        return <Badge bg="warning" className="d-flex align-items-center"><FiClock /> Pending</Badge>;
      case 'updating':
        return <Badge bg="info" className="d-flex align-items-center"><Spinner animation="border" size="sm" /> Updating...</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading && !leaveRequests.length) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-50">
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading leave requests...</span>
      </div>
    );
  }
  
  return (
    <div className="leave-manager">
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center py-3 bg-light">
          <h5 className="mb-0">Leave Management</h5>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewRequest(true)}
            disabled={loading}
          >
            <FiPlus className="me-1" /> New Leave Request
          </Button>
        </Card.Header>

        <Card.Body>
          {/* Error and success alerts */}
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-4">
              <FiInfo className="me-2" /> {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" onClose={() => setSuccess(null)} dismissible className="mb-4">
              <FiCheck className="me-2" /> {success}
            </Alert>
          )}

          {/* Filters */}
          <div className="bg-light p-3 rounded mb-4">
            <h6 className="mb-3 text-muted"><FiFilter className="me-2" />Filter Leave Requests</h6>
            <Row>
              <Col md={4} className="mb-3">
                <Form.Group>
                  <Form.Label className="small text-muted">Search Employee</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text"><FiUser /></span>
                    <Form.Control
                      type="text"
                      placeholder="Employee name..."
                      value={filterEmployee}
                      onChange={(e) => setFilterEmployee(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </Form.Group>
              </Col>

              <Col md={4} className="mb-3">
                <Form.Group>
                  <Form.Label className="small text-muted">Status</Form.Label>
                  <Form.Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    disabled={loading}
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4} className="mb-3">
                <Form.Group>
                  <Form.Label className="small text-muted">Leave Type</Form.Label>
                  <Form.Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    disabled={loading}
                  >
                    <option value="all">All Types</option>
                    <option value="vacation">Vacation</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal</option>
                    <option value="emergency">Emergency</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Leave requests table */}
          <div className="table-responsive">
            <Table striped bordered hover className="align-middle">
              <thead className="table-light">
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map(request => (
                    <tr key={request._id || `${request.employeeId}-${request.startDate}`}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FiUser className="me-2 text-muted" />
                          <span className="fw-medium">{request.employeeName}</span>
                        </div>
                      </td>
                      <td className="text-capitalize">{request.type || 'N/A'}</td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="text-nowrap">
                            <FiCalendar className="me-1 text-muted" />
                            {formatDate(request.startDate)}
                          </span>
                          <span className="text-nowrap">
                            <FiCalendar className="me-1 text-muted" />
                            {formatDate(request.endDate)}
                          </span>
                        </div>
                      </td>
                      <td className="fw-bold">
                        {request.days || calculateDaysBetweenDates(request.startDate, request.endDate)}
                      </td>
                      <td>{getStatusBadge(request.status)}</td>
                      <td className="text-truncate" style={{ maxWidth: '250px' }} title={request.notes}>
                        {request.notes || '-'}
                      </td>
                      <td>
                        {request.status === 'pending' && (
                          <div className="d-flex gap-2">
                            <Button
                              variant="success"
                              size="sm"
                              className="d-flex align-items-center"
                              onClick={() => handleStatusChange(request._id, 'approved')}
                              disabled={loading || request.status === 'updating'}
                            >
                              <FiCheck className="me-1" /> Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="d-flex align-items-center"
                              onClick={() => handleStatusChange(request._id, 'rejected')}
                              disabled={loading || request.status === 'updating'}
                            >
                              <FiX className="me-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      <div className="d-flex flex-column align-items-center text-muted">
                        <FiInfo size={32} className="mb-2" />
                        <p className="mb-0">No leave requests found matching your criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* New leave request modal */}
      <Modal show={showNewRequest} onHide={() => setShowNewRequest(false)} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="d-flex align-items-center">
            <FiPlus className="me-2" /> New Leave Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Employee *</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text"><FiUser /></span>
                    <Form.Select
                      value={newRequest.employeeId}
                      onChange={(e) => setNewRequest({ ...newRequest, employeeId: e.target.value })}
                      disabled={loading}
                      required
                      className="form-select"
                    >
                      <option value="">Select Employee</option>
                      {employees.map(employee => (
                        <option key={employee._id} value={employee._id}>
                          {employee.firstName} {employee.lastName}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Leave Type *</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text"><FiInfo /></span>
                    <Form.Select
                      value={newRequest.type}
                      onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                      disabled={loading}
                      required
                      className="form-select"
                    >
                      <option value="">Select Type</option>
                      <option value="vacation">Vacation</option>
                      <option value="sick">Sick Leave</option>
                      <option value="personal">Personal</option>
                      <option value="emergency">Emergency</option>
                    </Form.Select>
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Start Date *</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text"><FiCalendar /></span>
                    <Form.Control
                      type="date"
                      value={newRequest.startDate}
                      onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                      disabled={loading}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">End Date *</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text"><FiCalendar /></span>
                    <Form.Control
                      type="date"
                      value={newRequest.endDate}
                      onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                      disabled={loading}
                      required
                      min={newRequest.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newRequest.notes}
                onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                disabled={loading}
                placeholder="Add any additional information about this leave request"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button
            variant="outline-secondary"
            onClick={() => setShowNewRequest(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitNewRequest}
            disabled={
              loading ||
              !newRequest.employeeId ||
              !newRequest.type ||
              !newRequest.startDate ||
              !newRequest.endDate
            }
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" /> Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LeaveManager;