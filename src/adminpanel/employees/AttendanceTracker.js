import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Form, Row, Col, Badge, Modal, Alert, Spinner } from 'react-bootstrap';
import { FiClock, FiCheck, FiX, FiAlertCircle, FiFilter, FiRefreshCw, FiUser, FiTrash2 } from 'react-icons/fi';
import employeeApi from '../api/employeeApi';

const AttendanceTracker = () => {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [manualEntry, setManualEntry] = useState({
    employeeId: '', date: new Date().toISOString().split('T')[0],
    clockIn: '', clockOut: '', notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const statusBadgeColor = (status) => {
    switch (status) {
      case 'present': return 'success';
      case 'late': return 'warning';
      case 'absent': return 'danger';
      case 'in-progress': return 'primary';
      default: return 'secondary';
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        status: filterStatus !== 'all' ? filterStatus : undefined
      };

      if (filterDate) {
        const dateObj = new Date(filterDate);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        params.startDate = `${year}-${month}-${day}`;
        params.endDate = params.startDate;
      }

      const [employeesRes, attendanceRes] = await Promise.all([
        employeeApi.getEmployees(),
        employeeApi.getAllAttendance(params)
      ]);

      setEmployees(employeesRes);
      setAttendance(attendanceRes);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAttendance = attendance.filter(record => {
    if (!record?.date) return false;

    const recordDate = record.date;
    const filterDateStr = filterDate
      ? new Date(filterDate).toISOString().split('T')[0]
      : null;

    const matchesDate = !filterDateStr || recordDate === filterDateStr;
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;

    return matchesDate && matchesStatus;
  });

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e._id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const handleManualEntryChange = (e) => {
    const { name, value } = e.target;
    setManualEntry(prev => ({ ...prev, [name]: value }));
  };

  const handleAddManualEntry = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!manualEntry.employeeId || !manualEntry.date) {
        throw new Error('Employee and date are required');
      }

      if (isNaN(new Date(manualEntry.date).getTime())) {
        throw new Error('Invalid date format');
      }

      // Submit attendance
      const response = await employeeApi.recordAttendance(manualEntry.employeeId, {
        date: manualEntry.date,
        clockIn: manualEntry.clockIn || null,
        clockOut: manualEntry.clockOut || null,
        notes: manualEntry.notes || ''
      });

      if (!response.success) {
        throw new Error(response.message || 'Attendance recording failed');
      }
      await fetchData();

      setSuccess('Attendance record added successfully');
      setShowManualEntry(false);
      setManualEntry({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        clockIn: '',
        clockOut: '',
        notes: ''
      });
    } catch (err) {
      console.error('Attendance submission error:', {
        message: err.message,
        manualEntry,
        timestamp: new Date().toISOString()
      });

      setError(err.message || 'Failed to add attendance record');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <FiCheck className="text-success" />;
      case 'late': return <FiAlertCircle className="text-warning" />;
      case 'absent': return <FiX className="text-danger" />;
      case 'in-progress': return <FiClock className="text-primary" />;
      default: return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid date';
    
    try {
      let formatted = dateString;
      
      if (dateString instanceof Date) {
        formatted = dateString.toISOString().split('T')[0];
      }
      
      if (typeof formatted === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
        const [year, month, day] = formatted.split('-');
        return `${month}/${day}/${year}`;
      }
      
      return formatted;
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Handle delete confirmation
  const confirmDelete = (record) => {
    setSelectedRecord(record);
    setShowDeleteModal(true);
  };

  // Fixed delete function
  const handleDeleteAttendance = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      if (!selectedRecord) return;
      
      const { employeeId, attendanceId } = selectedRecord;

      await employeeApi.deleteAttendanceRecord(employeeId, attendanceId);
      
      // Update UI by removing the deleted record
      setAttendance(prev => prev.filter(
        record => record.attendanceId !== attendanceId
      ));

      setSuccess('Attendance record deleted successfully');
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete attendance record');
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="attendance-tracker">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5>Attendance Tracking</h5>
          <div>
            <Button
              variant="outline-primary"
              size="sm"
              className="me-2"
              onClick={fetchData}
            >
              <FiRefreshCw /> Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowManualEntry(true)}
            >
              <FiClock /> Manual Entry
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
              {success}
            </Alert>
          )}

          <Row className="mb-3 g-3">
            <Col md={6} lg={4}>
              <Form.Group>
                <Form.Label>Filter by Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6} lg={4}>
              <Form.Group>
                <Form.Label>Filter by Status</Form.Label>
                <Form.Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="in-progress">In Progress</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12} lg={4} className="d-flex align-items-end">
              <Button
                variant="outline-secondary"
                className="w-100"
                onClick={() => {
                  setFilterDate('');
                  setFilterStatus('all');
                }}
              >
                <FiFilter /> Clear Filters
              </Button>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table striped bordered hover className="align-middle">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length > 0 ? (
                  filteredAttendance.map((record) => (
                    <tr key={record.attendanceId || record._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FiUser className="me-2 text-muted" />
                          {getEmployeeName(record.employeeId)}
                        </div>
                      </td>
                      <td>{formatDate(record.date)}</td>
                      <td className="fw-bold">{record.clockIn || '--:--'}</td>
                      <td className="fw-bold">{record.clockOut || '--:--'}</td>
                      <td>
                        <Badge pill bg={statusBadgeColor(record.status)}>
                          <span className="d-flex align-items-center">
                            {getStatusIcon(record.status)}
                            <span className="ms-1 text-capitalize">{record.status}</span>
                          </span>
                        </Badge>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }} 
                          title={record.notes || ''}>
                        {record.notes || '-'}
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => confirmDelete(record)}
                        >
                          <FiTrash2 />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      <FiAlertCircle size={24} className="text-muted mb-2" />
                      <p className="mb-0">No attendance records found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Delete Confirmation Modal */}
          <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Confirm Deletion</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p>Are you sure you want to delete this attendance record?</p>
              <p className="fw-bold mb-0">
                {selectedRecord && getEmployeeName(selectedRecord.employeeId)}
              </p>
              <small className="text-muted">
                {selectedRecord && formatDate(selectedRecord.date)}
              </small>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteAttendance}>
                Delete Record
              </Button>
            </Modal.Footer>
          </Modal>

          <Modal show={showManualEntry} onHide={() => setShowManualEntry(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Manual Attendance Entry</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group controlId="employeeSelect">
                      <Form.Label>Employee *</Form.Label>
                      <Form.Select
                        name="employeeId"
                        value={manualEntry.employeeId}
                        onChange={handleManualEntryChange}
                        required
                      >
                        <option value="">Select Employee</option>
                        {employees.map(employee => (
                          <option key={employee._id} value={employee._id}>
                            {employee.firstName} {employee.lastName}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="attendanceDate">
                      <Form.Label>Date *</Form.Label>
                      <Form.Control
                        type="date"
                        name="date"
                        value={manualEntry.date}
                        onChange={handleManualEntryChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group controlId="clockInTime">
                      <Form.Label>Clock In Time</Form.Label>
                      <Form.Control
                        type="time"
                        name="clockIn"
                        value={manualEntry.clockIn}
                        onChange={handleManualEntryChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="clockOutTime">
                      <Form.Label>Clock Out Time</Form.Label>
                      <Form.Control
                        type="time"
                        name="clockOut"
                        value={manualEntry.clockOut}
                        onChange={handleManualEntryChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3" controlId="attendanceNotes">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="notes"
                    value={manualEntry.notes}
                    onChange={handleManualEntryChange}
                    placeholder="Optional notes about this attendance record"
                  />
                </Form.Group>
                <Alert variant="info">
                  Status will be automatically determined:
                  <ul className="mb-0 mt-2">
                    <li>Present: Clocked in and out on time</li>
                    <li>Late: Clocked in after 9:15 AM</li>
                    <li>Absent: No clock-in/out recorded</li>
                    <li>In Progress: Clocked in but not out</li>
                  </ul>
                </Alert>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowManualEntry(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddManualEntry}>
                Save Attendance Record
              </Button>
            </Modal.Footer>
          </Modal>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AttendanceTracker;