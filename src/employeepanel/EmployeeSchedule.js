import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Spinner, Alert, Badge, Row, Button, Col, Form } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaInfoCircle } from 'react-icons/fa';
import { getSchedule } from '../api/employeePanelApi';
import { useMediaQuery } from 'react-responsive';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, isToday, isAfter, parseISO } from 'date-fns';

const EmployeeSchedule = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  
  const isMobile = useMediaQuery({ maxWidth: 480 });

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      let params = {};
      if (filter === 'custom' && dateRange.startDate && dateRange.endDate) {
        params = {
          startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
          endDate: format(dateRange.endDate, 'yyyy-MM-dd')
        };
      }

      const data = await getSchedule(params);
      setShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load schedule');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [filter, dateRange]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const getShiftStatus = (shiftDate, startTime) => {
    try {
      const shiftDateTime = parseISO(`${shiftDate}T${startTime}`);
      
      if (isToday(shiftDateTime)) {
        return <Badge bg="info">Today</Badge>;
      }
      if (isAfter(shiftDateTime, new Date())) {
        return <Badge bg="success">Upcoming</Badge>;
      }
      return <Badge bg="secondary">Completed</Badge>;
    } catch (error) {
      return <Badge bg="danger">Error</Badge>;
    }
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setDateRange({ startDate: start, endDate: end });
    setFilter(start && end ? 'custom' : 'all');
  };

  const handleFilterChange = (e) => {
    const newFilter = e.target.value;
    setFilter(newFilter);
    if (newFilter === 'all') {
      setDateRange({ startDate: null, endDate: null });
    }
  };

  const formatShiftDate = (dateString) => {
    try {
      return format(parseISO(dateString), isMobile ? 'MMM d' : 'EEE, MMM d');
    } catch {
      return dateString;
    }
  };

  const renderScheduleTable = () => (
    <div className="table-responsive">
      <Table striped hover className="mb-0">
        <thead>
          <tr>
            <th>Date</th>
            {!isMobile && <th>Time</th>}
            <th>Location</th>
            {!isMobile && <th>Notes</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <tr key={shift.id}>
              <td>
                {formatShiftDate(shift.date)}
                {isMobile && (
                  <div className="text-muted small">
                    <FaClock className="me-1" />
                    {shift.startTime} - {shift.endTime}
                  </div>
                )}
              </td>
              {!isMobile && (
                <td>
                  <FaClock className="me-2" />
                  {shift.startTime} - {shift.endTime}
                </td>
              )}
              <td>
                <div className="d-flex align-items-center">
                  <FaMapMarkerAlt className="me-1" />
                  <span className={isMobile ? "text-truncate d-inline-block" : ""} style={{ maxWidth: isMobile ? '100px' : 'none' }}>
                    {shift.location}
                  </span>
                </div>
              </td>
              {!isMobile && <td>{shift.notes || '-'}</td>}
              <td>
                {getShiftStatus(shift.date, shift.startTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );

  return (
    <Container className="py-3">
      <Row className="mb-3">
        <Col>
          <h4 className="mb-0 d-flex align-items-center">
            <FaCalendarAlt className="me-2" />
            My Schedule
          </h4>
          <small className="text-muted">View your work schedule history</small>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card className="shadow-sm mb-3">
        <Card.Body className="p-2">
          <Row className="g-2 mb-3">
            <Col xs={12} sm={4}>
              <Form.Group>
                <Form.Label>View</Form.Label>
                <Form.Select
                  value={filter}
                  onChange={handleFilterChange}
                  size={isMobile ? "sm" : ""}
                >
                  <option value="all">All Shifts</option>
                  <option value="custom">Custom Range</option>
                </Form.Select>
              </Form.Group>
            </Col>
            {filter === 'custom' && (
              <Col xs={12} sm={8}>
                <Form.Group>
                  <Form.Label>Date Range</Form.Label>
                  <DatePicker
                    selectsRange
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onChange={handleDateChange}
                    isClearable
                    className="form-control"
                    placeholderText="Select date range"
                    minDate={new Date(2000, 0, 1)}
                    maxDate={new Date(2100, 0, 1)}
                    withPortal={isMobile}
                  />
                </Form.Group>
              </Col>
            )}
          </Row>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading schedule...</p>
            </div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaInfoCircle size={24} className="mb-2" />
              <p>No shifts found for selected period</p>
              {filter === 'custom' && dateRange.startDate && dateRange.endDate && (
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={() => setFilter('all')}
                  className="mt-2"
                >
                  Show All Shifts
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-2">
                <strong>
                  {filter === 'custom' && dateRange.startDate && dateRange.endDate
                    ? `Shifts from ${format(dateRange.startDate, 'MMM d')} to ${format(dateRange.endDate, 'MMM d, yyyy')}`
                    : 'All Upcoming Shifts'}
                </strong>
              </div>
              {renderScheduleTable()}
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default EmployeeSchedule;