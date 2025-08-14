import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useGeolocated } from 'react-geolocated';
import { Card, Table, Button, Form, Row, Col, Badge, Modal, Alert, Spinner } from 'react-bootstrap';
import { FiClock, FiCheck, FiX, FiAlertCircle, FiEdit, FiMapPin, FiRefreshCw, FiInfo } from 'react-icons/fi';
import { getAttendance, clockIn, clockOut, requestCorrection } from '../api/employeePanelApi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment-timezone';

// Set default timezone
moment.tz.setDefault('Africa/Lagos');

const Attendance = () => {
    const isMobile = useMediaQuery({ maxWidth: 480 });
    const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
        positionOptions: {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000 // 15 second timeout
        },
        userDecisionTimeout: 10000, // 10 seconds to allow permission
        watchPosition: true,
        suppressLocationOnMount: false,
        onError: (error) => {
            console.error('Geolocation error:', error);
            setError(`Location error: ${error ? error.message : 'Unknown geolocation error'}`);
        }
    });

    // State management
    const [attendance, setAttendance] = useState({ records: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({ type: '', loading: false });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [filters, setFilters] = useState({
        startDate: moment().startOf('month').toDate(),
        endDate: moment().endOf('month').toDate(),
        status: ''
    });
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [correctionData, setCorrectionData] = useState({
        date: moment().format('YYYY-MM-DD'),
        correctionType: 'clock-in',
        correctTime: moment().format('HH:mm'),
        reason: ''
    });
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [notes, setNotes] = useState('');
    const lastActionTimeRef = useRef(null);

    // Calculate current status
    const currentStatus = useMemo(() => {
        const today = moment().format('YYYY-MM-DD');
        const todayRecord = attendance.records.find(r => r.date === today);

        if (!todayRecord) return 'not-clocked-in';
        if (todayRecord.clockIn && !todayRecord.clockOut) return 'clocked-in';
        if (todayRecord.clockIn && todayRecord.clockOut) return 'clocked-out';
        return 'not-clocked-in';
    }, [attendance.records]);

    // Calculate distance between coordinates
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Fetch attendance data
    const fetchAttendance = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                startDate: filters.startDate ? moment(filters.startDate).format('YYYY-MM-DD') : null,
                endDate: filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : null,
                status: filters.status
            };

            const data = await getAttendance(params);
            
            setAttendance({
                records: data.records || [],
                stats: data.stats || {}
            });
        } catch (err) {
            console.error('Fetch attendance error:', err);
            setError(err.message || 'Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Handle clock-in
    const handleClockIn = async () => {
        try {
            setActionLoading({ type: 'in', loading: true });
            setError(null);
            setSuccess(null);

            // Prevent rapid clicks
            const now = Date.now();
            if (lastActionTimeRef.current && now - lastActionTimeRef.current < 5000) {
                setError('Please wait a few seconds before clocking in again');
                return;
            }
            lastActionTimeRef.current = now;

            // Check geolocation support and permissions
            if (!isGeolocationAvailable) {
                throw new Error("Geolocation is not supported by your browser");
            }

            if (!isGeolocationEnabled) {
                throw new Error("Please enable location services in your browser settings");
            }

            if (!coords) {
                throw new Error("Getting your location... Please wait a moment");
            }

            // Verify we have valid coordinates
            if (typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
                throw new Error("Invalid location coordinates received");
            }

            // Create location object with proper structure
            const locationData = {
                latitude: coords.latitude,
                longitude: coords.longitude
            };

            // Calculate distance from workplace
            const distance = calculateDistance(
                locationData.latitude,
                locationData.longitude,
                parseFloat(process.env.REACT_APP_WORKPLACE_LAT),
                parseFloat(process.env.REACT_APP_WORKPLACE_LNG)
            );

            if (distance > 0.5) { // 500 meters
                throw new Error(`You must be within 500m of the workplace (currently ${distance.toFixed(2)}km away)`);
            }

            // Call API with properly structured location data
            const response = await clockIn(locationData);

            setSuccess(response.message || 'Clocked in successfully!');
            await fetchAttendance();
        } catch (err) {
            console.error('Clock-in error:', err);
            const errorMessage = err.message || 'Failed to clock in';
            setError(errorMessage);

            // If already clocked in, refresh data to show current status
            if (errorMessage.includes('Already clocked in')) {
                await fetchAttendance();
            }

            // Special handling for location timeout
            if (err.message && err.message.includes('timeout')) {
                setError('Location detection timed out. Please ensure location services are enabled and try again.');
            }
        } finally {
            setActionLoading({ type: '', loading: false });
        }
    };

    // Handle clock-out
    const handleClockOut = async () => {
        try {
            setActionLoading({ type: 'out', loading: true });
            setError(null);
            setSuccess(null);

            // Prevent rapid clicks
            if (lastActionTimeRef.current && Date.now() - lastActionTimeRef.current < 5000) {
                throw new Error('Please wait a few seconds before clocking out again');
            }
            lastActionTimeRef.current = Date.now();

            const response = await clockOut(notes);
            setSuccess(response.message || 'Successfully clocked out');
            setNotes('');
            setShowNotesModal(false);
            await fetchAttendance();
        } catch (err) {
            console.error('Clock-out error:', err);
            setError(err.message || 'Failed to clock out');
        } finally {
            setActionLoading({ type: '', loading: false });
        }
    };

    // Handle correction request
    const handleCorrectionSubmit = async () => {
        try {
            setActionLoading({ type: 'correction', loading: true });
            setError(null);

            // Validate data
            if (!correctionData.date) throw new Error('Date is required');
            if (!correctionData.reason || correctionData.reason.length < 10) {
                throw new Error('Reason must be at least 10 characters');
            }
            if (correctionData.correctionType !== 'absence' && !correctionData.correctTime) {
                throw new Error('Correct time is required');
            }

            // Validate date is not in future
            if (moment(correctionData.date).isAfter(moment(), 'day')) {
                throw new Error('Cannot request correction for future dates');
            }

            const response = await requestCorrection(correctionData);
            setSuccess(response.message || 'Correction request submitted');
            setShowCorrectionModal(false);
            setCorrectionData({
                date: moment().format('YYYY-MM-DD'),
                correctionType: 'clock-in',
                correctTime: moment().format('HH:mm'),
                reason: ''
            });
            await fetchAttendance();
        } catch (err) {
            console.error('Correction error:', err);
            setError(err.message || 'Failed to submit correction');
        } finally {
            setActionLoading({ type: '', loading: false });
        }
    };

    // Format helpers
    const formatDate = (dateString) => {
        if (!dateString) return 'Invalid date';
        try {
            return moment(dateString).format('ddd, MMM D, YYYY');
        } catch (e) {
            return 'Invalid date';
        }
    };
    
    const formatTime = (timeString) => {
        if (!timeString) return '--:--';
        try {
            // Handle both HH:mm:ss and HH:mm formats
            return moment(timeString, ['HH:mm:ss', 'HH:mm']).format('h:mm A');
        } catch (e) {
            return '--:--';
        }
    };

    // Status badge component
    const StatusBadge = ({ status }) => {
        const variants = {
            'present': { bg: 'success', icon: <FiCheck />, text: 'Present' },
            'late': { bg: 'warning', icon: <FiAlertCircle />, text: 'Late' },
            'absent': { bg: 'danger', icon: <FiX />, text: 'Absent' },
            'half-day': { bg: 'info', text: 'Half Day' },
            'on-leave': { bg: 'primary', text: 'On Leave' },
            'pending': { bg: 'secondary', text: 'Pending' },
            'in-progress': { bg: 'info', text: 'In Progress' }
        };

        const variant = variants[status] || { bg: 'secondary', text: 'N/A' };

        return (
            <Badge bg={variant.bg} className="d-flex align-items-center gap-1">
                {variant.icon && variant.icon}
                {variant.text}
            </Badge>
        );
    };

    // Render attendance table
    const renderAttendanceTable = () => {
        if (loading) {
            return (
                <div className="d-flex justify-content-center py-5">
                    <Spinner animation="border" />
                    <span className="ms-2">Loading attendance data...</span>
                </div>
            );
        }

        return (
            <div className="table-responsive">
                <Table striped hover className="mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Date</th>
                            {!isMobile && <th>Clock In</th>}
                            {!isMobile && <th>Clock Out</th>}
                            <th>Hours</th>
                            <th>Status</th>
                            {!isMobile && <th>Location</th>}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendance.records && attendance.records.length > 0 ? (
                            attendance.records.map((record, index) => {
                                if (!record || !record.date) {
                                    return null;
                                }

                                return (
                                    <tr key={record.id || index}>
                                        <td>
                                            {isMobile ? (
                                                <>
                                                    <div>{formatDate(record.date)}</div>
                                                    <small className="text-muted">
                                                        {formatTime(record.clockIn)} - {formatTime(record.clockOut)}
                                                    </small>
                                                </>
                                            ) : (
                                                formatDate(record.date)
                                            )}
                                        </td>
                                        {!isMobile && <td>{formatTime(record.clockIn)}</td>}
                                        {!isMobile && <td>{formatTime(record.clockOut)}</td>}
                                        <td>{record.hoursWorked || '0.00'}h</td>
                                        <td><StatusBadge status={record.status} /></td>
                                        {!isMobile && (
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <FiMapPin className="me-1" />
                                                    <span className="text-truncate" style={{ maxWidth: '150px' }}>
                                                        {record.location || 'Unknown'}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        <td>
                                            <Button
                                                variant="outline-warning"
                                                size="sm"
                                                onClick={() => {
                                                    setCorrectionData({
                                                        date: record.date,
                                                        correctionType: record.clockIn ? 'clock-out' : 'clock-in',
                                                        correctTime: record.clockIn || record.clockOut || moment().format('HH:mm'),
                                                        reason: ''
                                                    });
                                                    setShowCorrectionModal(true);
                                                }}
                                            >
                                                <FiEdit size={14} />
                                                {!isMobile && 'Fix'}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={isMobile ? 5 : 7} className="text-center py-4">
                                    <div className="py-3">
                                        <FiAlertCircle size={24} className="text-muted mb-2" />
                                        <p className="mb-1">No attendance records found</p>
                                        <small className="text-muted">
                                            {filters.startDate || filters.endDate || filters.status
                                                ? 'Try adjusting your filters'
                                                : 'Your attendance records will appear here'}
                                        </small>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        );
    };

    // Initial data fetch
    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    return (
        <div className="attendance-page">
            <Card className="shadow-sm">
                <Card.Header className="d-flex justify-content-between align-items-center bg-white py-3">
                    <h5 className="mb-0">Attendance Management</h5>
                    <div className="d-flex">
                        <Button variant="outline-secondary" size="sm" onClick={fetchAttendance} className="me-2">
                            <FiRefreshCw />
                        </Button>
                        {currentStatus === 'not-clocked-in' && (
                            <div className="d-flex align-items-center">
                                <Button
                                    variant="success"
                                    onClick={handleClockIn}
                                    disabled={actionLoading.loading}
                                    className="me-2"
                                >
                                    {actionLoading.type === 'in' ? (
                                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                                    ) : (
                                        <FiClock className="me-1" />
                                    )}
                                    {!isMobile && 'Clock In'}
                                </Button>

                                {!isGeolocationAvailable && (
                                    <Badge bg="danger" className="ms-2">
                                        <FiX className="me-1" /> Location not supported
                                    </Badge>
                                )}
                                {isGeolocationAvailable && !isGeolocationEnabled && (
                                    <Badge bg="warning" className="ms-2">
                                        <FiAlertCircle className="me-1" /> Enable location
                                    </Badge>
                                )}
                                {isGeolocationAvailable && isGeolocationEnabled && !coords && (
                                    <Badge bg="info" className="ms-2">
                                        <FiRefreshCw className="me-1" /> Detecting location...
                                    </Badge>
                                )}
                                {coords && (
                                    <Badge bg="success" className="ms-2">
                                        <FiCheck className="me-1" /> Location ready
                                    </Badge>
                                )}
                            </div>
                        )}
                        {currentStatus === 'clocked-in' && (
                            <Button variant="danger" onClick={() => setShowNotesModal(true)} disabled={actionLoading.loading}>
                                {actionLoading.type === 'out' ? (
                                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                                ) : (
                                    <FiClock className="me-1" />
                                )}
                                {!isMobile && 'Clock Out'}
                            </Button>
                        )}
                        {currentStatus === 'clocked-out' && (
                            <Badge bg="success" className="p-2 d-flex align-items-center">
                                <FiCheck className="me-1" />
                                {!isMobile && 'Clocked out today'}
                            </Badge>
                        )}
                    </div>
                </Card.Header>

                <Card.Body>
                    {/* Alerts */}
                    {error && (
                        <Alert variant="danger" onClose={() => setError(null)} dismissible>
                            <div className="d-flex align-items-center">
                                <FiAlertCircle className="me-2" size={20} />
                                <span>{error}</span>
                            </div>
                        </Alert>
                    )}
                    {success && (
                        <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
                            <div className="d-flex align-items-center">
                                <FiCheck className="me-2" size={20} />
                                <span>{success}</span>
                            </div>
                        </Alert>
                    )}

                    {/* Quick Stats */}
                    <Card className="mb-4 border-0 shadow-sm">
                        <Card.Header className="bg-white border-0 py-2">
                            <div className="d-flex align-items-center">
                                <FiInfo className="me-2" />
                                <span>Quick Stats</span>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-2">
                            <Row className="g-2">
                                {[
                                    { label: 'Days Worked', value: attendance.stats?.presentDays || 0 },
                                    { label: 'Late Arrivals', value: attendance.stats?.lateDays || 0, className: 'text-warning' },
                                    { label: 'Total Hours', value: attendance.stats?.totalHours?.toFixed(2) || '0.00', suffix: 'h' },
                                    { label: 'Attendance Rate', value: attendance.stats?.attendanceRate || '0', suffix: '%' }
                                ].map((stat, i) => (
                                    <Col xs={6} md={3} key={i}>
                                        <Card className="h-100">
                                            <Card.Body className="p-2 text-center">
                                                <small className="text-muted">{stat.label}</small>
                                                <h4 className={`mb-0 ${stat.className || ''}`}>
                                                    {stat.value}{stat.suffix || ''}
                                                </h4>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Filters */}
                    <Card className="mb-4 border-0 shadow-sm">
                        <Card.Header className="bg-white border-0 py-2">Filters</Card.Header>
                        <Card.Body className="p-2">
                            <Row className="g-2">
                                <Col xs={12} md={4}>
                                    <Form.Group>
                                        <Form.Label>Start Date</Form.Label>
                                        <DatePicker
                                            selected={filters.startDate}
                                            onChange={(date) => setFilters({ ...filters, startDate: date })}
                                            className="form-control"
                                            dateFormat="yyyy-MM-dd"
                                            maxDate={new Date()}
                                            withPortal={isMobile}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={12} md={4}>
                                    <Form.Group>
                                        <Form.Label>End Date</Form.Label>
                                        <DatePicker
                                            selected={filters.endDate}
                                            onChange={(date) => setFilters({ ...filters, endDate: date })}
                                            className="form-control"
                                            dateFormat="yyyy-MM-dd"
                                            minDate={filters.startDate}
                                            maxDate={new Date()}
                                            withPortal={isMobile}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={12} md={4}>
                                    <Form.Group>
                                        <Form.Label>Status</Form.Label>
                                        <Form.Select
                                            value={filters.status}
                                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="present">Present</option>
                                            <option value="late">Late</option>
                                            <option value="absent">Absent</option>
                                            <option value="half-day">Half Day</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col xs={12}>
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => setFilters({
                                            startDate: moment().startOf('month').toDate(),
                                            endDate: moment().endOf('month').toDate(),
                                            status: ''
                                        })}
                                        className="w-100 mt-2"
                                    >
                                        Reset Filters
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Attendance Table */}
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white border-0 py-2 d-flex justify-content-between align-items-center">
                            <span>Attendance Records</span>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setShowCorrectionModal(true)}
                            >
                                <FiEdit className="me-1" />
                                {!isMobile && 'Request Correction'}
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-2">
                            {renderAttendanceTable()}
                        </Card.Body>
                    </Card>
                </Card.Body>
            </Card>

            {/* Clock Out Notes Modal */}
            <Modal show={showNotesModal} onHide={() => setShowNotesModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Clock Out Notes</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Notes (optional):</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter any notes about your shift..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowNotesModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleClockOut} disabled={actionLoading.type === 'out'}>
                        {actionLoading.type === 'out' ? (
                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                        ) : null}
                        Confirm Clock Out
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Correction Request Modal */}
            <Modal show={showCorrectionModal} onHide={() => setShowCorrectionModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Request Attendance Correction</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" onClose={() => setError(null)} dismissible>
                            <div className="d-flex align-items-center">
                                <FiAlertCircle className="me-2" size={18} />
                                <span>{error}</span>
                            </div>
                        </Alert>
                    )}
                    <Form>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Date *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={correctionData.date}
                                        onChange={(e) => setCorrectionData({ ...correctionData, date: e.target.value })}
                                        max={moment().format('YYYY-MM-DD')}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Correction Type *</Form.Label>
                                    <Form.Select
                                        value={correctionData.correctionType}
                                        onChange={(e) => setCorrectionData({ ...correctionData, correctionType: e.target.value })}
                                        required
                                    >
                                        <option value="clock-in">Clock In Time</option>
                                        <option value="clock-out">Clock Out Time</option>
                                        <option value="absence">Absence Justification</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        {correctionData.correctionType !== 'absence' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Correct Time *</Form.Label>
                                <Form.Control
                                    type="time"
                                    value={correctionData.correctTime}
                                    onChange={(e) => setCorrectionData({ ...correctionData, correctTime: e.target.value })}
                                    required
                                />
                            </Form.Group>
                        )}
                        <Form.Group className="mb-3">
                            <Form.Label>Reason *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={correctionData.reason}
                                onChange={(e) => setCorrectionData({ ...correctionData, reason: e.target.value })}
                                placeholder="Please explain why this correction is needed (minimum 10 characters)"
                                required
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCorrectionModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCorrectionSubmit}
                        disabled={actionLoading.type === 'correction' || !correctionData.reason || correctionData.reason.length < 10}
                    >
                        {actionLoading.type === 'correction' ? (
                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                        ) : null}
                        Submit Request
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Attendance;