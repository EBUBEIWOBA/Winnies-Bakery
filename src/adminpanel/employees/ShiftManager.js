import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Row, Col, Table, Form, Badge, Spinner, Alert, Modal, Image } from 'react-bootstrap';
import { FiPlus, FiTrash2, FiSave, FiCalendar, FiClock, FiMapPin, FiUser, FiEdit, FiCheck } from 'react-icons/fi';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format,isBefore } from 'date-fns';
import employeeApi from '../api/employeeApi';

const ShiftManager = ({ isAdmin = true }) => {
  // State management
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [showShiftDetails, setShowShiftDetails] = useState(null);
  const [imageLoading, setImageLoading] = useState({});

  // Form state
  const [newShift, setNewShift] = useState({
    employeeId: '',
    position: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    endTime: '17:00',
    location: 'Main Bakery',
    notes: '',
    status: 'scheduled'
  });

  // Form validation state
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setImageLoading({});

      // Fetch shifts and employees in parallel
      const [shiftsRes, employeesRes] = await Promise.all([
        employeeApi.getAllShifts(),
        employeeApi.getEmployees()
      ]);

      // Process employees
      let employeesData = [];
      if (Array.isArray(employeesRes)) {
        employeesData = employeesRes;
      } else if (employeesRes?.data) {
        employeesData = employeesRes.data;
      } else if (employeesRes?.employees) {
        employeesData = employeesRes.employees;
      }

      // Process shifts and attach employee data
      const shiftsData = shiftsRes.data || [];
      const enrichedShifts = shiftsData.map(shift => {
        const employee = employeesData.find(e => e._id === shift.employeeId) || {};
        return {
          ...shift,
          employee: {
            _id: employee._id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            photo: employee.photo
          },
          employeeName: shift.employeeName || `${employee.firstName} ${employee.lastName}`
        };
      });

      setShifts(enrichedShifts);
      setEmployees(employeesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build image URL
  const buildImageUrl = (photoPath) => {
    if (!photoPath) return null;
    const baseUrl = process.env.REACT_APP_API_URL || '';

    // Handle different path formats
    if (photoPath.startsWith('http')) return photoPath;
    if (photoPath.startsWith('/')) return `${baseUrl}${photoPath}`;
    return `${baseUrl}/${photoPath}`;
  };

  // Validate shift form
  const validateShift = (shift) => {
    const errors = {};

    if (!shift.employeeId) errors.employeeId = 'Employee is required';
    if (!shift.position) errors.position = 'Position is required';
    if (!shift.date) errors.date = 'Date is required';
    if (!shift.startTime) errors.startTime = 'Start time is required';
    if (!shift.endTime) errors.endTime = 'End time is required';

    if (shift.startTime && shift.endTime) {
      const startDate = new Date(`${shift.date}T${shift.startTime}`);
      const endDate = new Date(`${shift.date}T${shift.endTime}`);

      if (isBefore(endDate, startDate)) {
        errors.endTime = 'End time must be after start time';
      }
    }

    return errors;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewShift(prev => ({
      ...prev,
      [name]: value
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle employee selection
  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    const selectedEmployee = employees.find(emp => emp._id === employeeId);

    setNewShift(prev => ({
      ...prev,
      employeeId,
      position: selectedEmployee?.position || ''
    }));
  };

  // Add new shift
  const handleAddShift = async () => {
    const errors = validateShift(newShift);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) return;

    try {
      const selectedEmployee = employees.find(emp => emp._id === newShift.employeeId);
      if (!selectedEmployee) {
        throw new Error('Selected employee not found');
      }

      const response = await employeeApi.createShift({
        employeeId: newShift.employeeId,
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
        position: newShift.position,
        date: newShift.date,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        location: newShift.location,
        notes: newShift.notes
      });

      // Create enriched shift with employee data
      const newShiftWithEmployee = {
        ...response.data,
        employee: {
          _id: selectedEmployee._id,
          firstName: selectedEmployee.firstName,
          lastName: selectedEmployee.lastName,
          photo: selectedEmployee.photo
        },
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
      };

      setShifts(prev => [...prev, newShiftWithEmployee]);
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error('Shift creation error:', err);

      // Enhanced error display
      if (err.message.includes('Missing fields')) {
        setError(`Please fill in all required fields: ${err.message.split(':')[1]}`);
      } else {
        setError(err.message || 'Failed to add shift');
      }
    }
  };

  // Update shift status
  const handleUpdateStatus = async (shiftId, status) => {
    try {
      setLoading(true);
      await employeeApi.updateShiftStatus(shiftId, status);
      setShifts(prev => prev.map(s =>
        s._id === shiftId ? { ...s, status } : s
      ));
      setShowShiftDetails(prev => prev ? { ...prev, status } : null);
    } catch (err) {
      setError(err.message || 'Failed to update shift status');
    } finally {
      setLoading(false);
    }
  };

  // Delete shift
  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        setLoading(true);
        await employeeApi.deleteShift(shiftId);
        setShifts(prev => prev.filter(s => s._id !== shiftId));
        setShowShiftDetails(null);
      } catch (err) {
        setError(err.message || 'Failed to delete shift');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setNewShift({
      employeeId: '',
      position: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '08:00',
      endTime: '17:00',
      location: 'Main Bakery',
      notes: '',
      status: 'scheduled'
    });
    setValidationErrors({});
  };

  // Calendar event click handler
  const handleEventClick = useCallback((clickInfo) => {
    const shift = shifts.find(s => s._id === clickInfo.event.id);
    if (shift) setShowShiftDetails(shift);
  }, [shifts]);

  // Prepare calendar events
  const calendarEvents = useMemo(() => {
    return shifts.map(shift => {
      const employee = shift.employee || {};
      const photoUrl = employee.photo ? buildImageUrl(employee.photo) : null;

      // Extract date parts from the new datetime fields
      const startDate = shift.start ? shift.start.split('T')[0] : '';
      const startTime = shift.start ? shift.start.split('T')[1].substring(0, 5) : '';
      const endDate = shift.end ? shift.end.split('T')[0] : '';
      const endTime = shift.end ? shift.end.split('T')[1].substring(0, 5) : '';

      return {
        id: shift._id,
        title: `${shift.employeeName} (${shift.position})`,
        start: `${startDate}T${startTime}`,
        end: `${endDate}T${endTime}`,
        extendedProps: {
          status: shift.status,
          photo: photoUrl,
          location: shift.location,
          employee: shift.employee
        },
        backgroundColor:
          shift.status === 'completed' ? '#28a745' :
            shift.status === 'cancelled' ? '#dc3545' :
              shift.status === 'in-progress' ? '#ffc107' : '#007bff',
        borderColor: '#ffffff',
        textColor: shift.status === 'in-progress' ? '#000000' : '#ffffff'
      };
    });
  }, [shifts]);

  // Handle image loading
  const handleImageLoad = (id) => {
    setImageLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleImageError = (e, id) => {
    e.target.src = '/default-avatar.png';
    setImageLoading(prev => ({ ...prev, [id]: false }));
  };

  // Loading state
  if (loading && shifts.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-50">
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading shift data...</span>
      </div>
    );
  }

  // Error state
  if (error && shifts.length === 0) {
    return (
      <Alert variant="danger" className="mt-3">
        <Alert.Heading>Error Loading Shift Data</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={fetchData}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="shift-manager">
      {/* Calendar View */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light py-3">
          <h5 className="mb-0">Shift Schedule</h5>
          <div className="d-flex gap-2">
            <Button
              variant={calendarView === 'dayGridMonth' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setCalendarView('dayGridMonth')}
            >
              <FiCalendar className="me-1" /> Month
            </Button>
            <Button
              variant={calendarView === 'timeGridWeek' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setCalendarView('timeGridWeek')}
            >
              <FiCalendar className="me-1" /> Week
            </Button>
            {isAdmin && (
              <Button
                variant="success"
                size="sm"
                className="ms-2"
                onClick={() => setShowForm(true)}
              >
                <FiPlus className="me-1" /> New Shift
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-2">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={calendarView}
            events={calendarEvents}
            editable={isAdmin}
            eventClick={handleEventClick}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
            height={650}
            eventContent={(arg) => {
              const photoUrl = arg.event.extendedProps.photo;
              return (
                <div className="fc-event-content p-1">
                  <div className="d-flex align-items-center">
                    {photoUrl ? (
                      <>
                        {imageLoading[arg.event.id] !== false && (
                          <Spinner animation="border" size="sm" className="me-2" />
                        )}
                        <img
                          src={photoUrl}
                          alt="Employee"
                          width={24}
                          height={24}
                          className="rounded-circle me-2"
                          onLoad={() => handleImageLoad(arg.event.id)}
                          onError={(e) => handleImageError(e, arg.event.id)}
                          style={{ display: imageLoading[arg.event.id] === false ? 'block' : 'none' }}
                        />
                      </>
                    ) : (
                      <div className="rounded-circle bg-secondary me-2 d-flex align-items-center justify-content-center"
                        style={{ width: 24, height: 24 }}>
                        <FiUser size={12} color="white" />
                      </div>
                    )}
                    <div className="text-truncate">
                      <div className="fw-bold text-truncate">{arg.event.title.split(' (')[0]}</div>
                      <small>
                        <FiClock className="me-1" />
                        {arg.timeText}
                      </small>
                    </div>
                  </div>
                </div>
              );
            }}
            eventClassNames="fc-event-custom"
          />
        </Card.Body>
      </Card>

      {/* Upcoming Shifts Table */}
      <Card className="shadow-sm">
        <Card.Header className="bg-light py-3">
          <h5 className="mb-0">Upcoming Shifts</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Employee</th>
                <th>Position</th>
                <th>Date</th>
                <th>Time</th>
                <th>Location</th>
                <th>Status</th>
                {isAdmin && <th className="text-end">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {shifts.slice(0, 10).map(shift => {
                const photoUrl = shift.employee?.photo ? buildImageUrl(shift.employee.photo) : null;

                // Extract date and time from new datetime fields
                const startDate = shift.start ? new Date(shift.start) : new Date();
                const endDate = shift.end ? new Date(shift.end) : new Date();

                const formattedDate = format(startDate, 'MMM dd, yyyy');
                const startTime = format(startDate, 'HH:mm');
                const endTime = format(endDate, 'HH:mm');

                return (
                  <tr key={shift._id} onClick={() => setShowShiftDetails(shift)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="d-flex align-items-center">
                        {photoUrl ? (
                          <>
                            {imageLoading[shift._id] !== false && (
                              <Spinner animation="border" size="sm" className="me-2" />
                            )}
                            <Image
                              src={photoUrl}
                              roundedCircle
                              width={36}
                              height={36}
                              className="me-2"
                              onLoad={() => handleImageLoad(shift._id)}
                              onError={(e) => handleImageError(e, shift._id)}
                              style={{ display: imageLoading[shift._id] === false ? 'block' : 'none' }}
                            />
                          </>
                        ) : (
                          <div className="rounded-circle bg-secondary me-2 d-flex align-items-center justify-content-center"
                            style={{ width: 36, height: 36 }}>
                            <FiUser size={16} color="white" />
                          </div>
                        )}
                        <span className="fw-medium">{shift.employeeName}</span>
                      </div>
                    </td>
                    <td className="text-capitalize">{shift.position}</td>
                    <td>{formattedDate}</td>
                    <td>{startTime} - {endTime}</td>
                    <td>
                      <Badge bg="light" text="dark" className="d-flex align-items-center">
                        <FiMapPin className="me-1" />
                        {shift.location}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={
                        shift.status === 'scheduled' ? 'primary' :
                          shift.status === 'completed' ? 'success' :
                            shift.status === 'in-progress' ? 'warning' : 'danger'
                      } className="text-capitalize">
                        {shift.status}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="text-end">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteShift(shift._id);
                          }}
                        >
                          <FiTrash2 />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {shifts.length === 0 && (
            <div className="text-center py-5">
              <div className="d-flex flex-column align-items-center text-muted">
                <FiCalendar size={48} className="mb-3" />
                <h5>No upcoming shifts</h5>
                <p className="mb-0">Create new shifts to get started</p>
                {isAdmin && (
                  <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowForm(true)}>
                    <FiPlus className="me-1" /> Create Shift
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add Shift Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="d-flex align-items-center">
            <FiPlus className="me-2" /> New Shift
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Employee <span className="text-danger">*</span></Form.Label>
                  {employees.length > 0 ? (
                    <Form.Select
                      value={newShift.employeeId}
                      onChange={handleEmployeeSelect}
                      isInvalid={!!validationErrors.employeeId}
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(employee => (
                        <option key={employee._id} value={employee._id}>
                          {employee.firstName} {employee.lastName}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Alert variant="warning" className="mt-2">
                      No employees available. Please add employees first.
                    </Alert>
                  )}
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.employeeId}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Position <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="position"
                    value={newShift.position}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.position}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.position}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={newShift.date}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.date}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.date}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Select
                    name="location"
                    value={newShift.location}
                    onChange={handleInputChange}
                  >
                    <option value="Main Bakery">Main Bakery</option>
                    <option value="Downtown Branch">Downtown Branch</option>
                    <option value="Cafe Location">Cafe Location</option>
                    <option value="Catering">Catering</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="time"
                    name="startTime"
                    value={newShift.startTime}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.startTime}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.startTime}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="time"
                    name="endTime"
                    value={newShift.endTime}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.endTime}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.endTime}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={newShift.notes}
                onChange={handleInputChange}
                placeholder="Add any special instructions for this shift"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddShift}
            disabled={
              !newShift.employeeId ||
              !newShift.position ||
              !newShift.date ||
              !newShift.startTime ||
              !newShift.endTime
            }
          >
            <FiSave /> Save Shift
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Shift Details Modal */}
      <Modal show={!!showShiftDetails} onHide={() => setShowShiftDetails(null)} size="md">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Shift Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showShiftDetails && (
            <div>
              <div className="d-flex align-items-center mb-4">
                {showShiftDetails.employee?.photo ? (
                  <Image
                    src={buildImageUrl(showShiftDetails.employee.photo)}
                    roundedCircle
                    width={80}
                    height={80}
                    className="me-3"
                    onError={(e) => e.target.src = '/default-avatar.png'}
                  />
                ) : (
                  <div className="rounded-circle bg-secondary me-3 d-flex align-items-center justify-content-center"
                    style={{ width: 80, height: 80 }}>
                    <FiUser size={32} color="white" />
                  </div>
                )}
                <div>
                  <h5 className="mb-1">{showShiftDetails.employeeName}</h5>
                  <div className="text-muted">{showShiftDetails.position}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex mb-2">
                  <div className="text-muted" style={{ width: 100 }}>Date:</div>
                  <div>
                    {format(new Date(showShiftDetails.start), 'EEEE, MMMM do, yyyy')}
                  </div>
                </div>

                <div className="d-flex mb-2">
                  <div className="text-muted" style={{ width: 100 }}>Time:</div>
                  <div>
                    <span className="fw-medium">
                      {format(new Date(showShiftDetails.start), 'HH:mm')}
                    </span> -{' '}
                    <span className="fw-medium">
                      {format(new Date(showShiftDetails.end), 'HH:mm')}
                    </span>
                  </div>
                </div>

                <div className="d-flex mb-2">
                  <div className="text-muted" style={{ width: 100 }}>Location:</div>
                  <div>
                    <FiMapPin className="me-1 text-muted" />
                    {showShiftDetails.location}
                  </div>
                </div>

                <div className="d-flex align-items-center mb-2">
                  <div className="text-muted" style={{ width: 100 }}>Status:</div>
                  <Badge
                    bg={
                      showShiftDetails.status === 'scheduled' ? 'primary' :
                        showShiftDetails.status === 'completed' ? 'success' :
                          showShiftDetails.status === 'in-progress' ? 'warning' : 'danger'
                    }
                    className="text-capitalize"
                  >
                    {showShiftDetails.status}
                  </Badge>
                </div>

                {showShiftDetails.notes && (
                  <div className="mt-3">
                    <div className="text-muted mb-2">Notes:</div>
                    <div className="p-3 bg-light rounded">
                      {showShiftDetails.notes}
                    </div>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="d-flex flex-wrap gap-2 mt-4">
                  {showShiftDetails.status !== 'scheduled' && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleUpdateStatus(showShiftDetails._id, 'scheduled')}
                      disabled={loading}
                    >
                      <FiEdit className="me-1" /> Scheduled
                    </Button>
                  )}
                  {showShiftDetails.status !== 'in-progress' && (
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => handleUpdateStatus(showShiftDetails._id, 'in-progress')}
                      disabled={loading}
                    >
                      <FiClock className="me-1" /> In Progress
                    </Button>
                  )}
                  {showShiftDetails.status !== 'completed' && (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleUpdateStatus(showShiftDetails._id, 'completed')}
                      disabled={loading}
                    >
                      <FiCheck className="me-1" /> Completed
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          {isAdmin && (
            <Button
              variant="outline-danger"
              onClick={() => {
                handleDeleteShift(showShiftDetails._id);
                setShowShiftDetails(null);
              }}
              disabled={loading}
            >
              <FiTrash2 className="me-1" /> Delete Shift
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowShiftDetails(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ShiftManager;