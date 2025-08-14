import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Nav, Card, Spinner, Alert, Dropdown, Button, Modal } from 'react-bootstrap';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaHome, FaUser, FaCalendarAlt, FaClock, FaSignOutAlt,
  FaCalendarWeek, FaBars, FaCog
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboardData, employeeLogout, getProfile } from '../api/employeePanelApi';
import './EmployeePanel.css';

const EmployeePanel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState(null);

  const handleAuthError = useCallback((err) => {
    if (err.response?.status === 401 || err.message.includes('Authentication')) {
      localStorage.removeItem('employeeToken');
      localStorage.removeItem('employeeData');
      navigate('/employee/login', {
        state: { from: location.pathname },
        replace: true
      });
    } else {
      setError(err.message || 'Failed to load dashboard data');
    }
  }, [navigate, location.pathname]);

  // Add this effect to close mobile menu when route changes
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardRes, profileRes] = await Promise.all([
        getDashboardData(),
        getProfile(),
      ]);

      setDashboardData(dashboardRes);
      setEmployeeProfile(profileRes);
    } catch (err) {
      handleAuthError(err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    try {
      await employeeLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('employeeToken');
      localStorage.removeItem('employeeData');
      navigate('/employee/login');
    }
  };

  const renderDashboard = () => {
    if (!dashboardData) return null;

    return (
      <div className="dashboard-content">
        <div className="dashboard-header mb-3">
          <h4>Welcome back, {employeeProfile?.firstName || 'Employee'}!</h4>
          <p className="text-muted">Here's what's happening today</p>
        </div>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

        <Row className="g-3 mb-3">
          <Col xs={12} md={6}>
            <Card className="stat-card h-100">
              <Card.Body className="d-flex align-items-center">
                <div className="stat-icon bg-primary-light me-3">
                  <FaCalendarAlt className="text-primary" />
                </div>
                <div>
                  <Card.Title className="h6">Today's Shift</Card.Title>
                  <Card.Text className="mb-0">
                    {dashboardData.todaysShift ? (
                      <>
                        <strong>{dashboardData.todaysShift.startTime} - {dashboardData.todaysShift.endTime}</strong><br />
                        <small>{dashboardData.todaysShift.location}</small>
                      </>
                    ) : 'No shift scheduled'}
                  </Card.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card className="stat-card h-100">
              <Card.Body className="d-flex align-items-center">
                <div className="stat-icon bg-warning-light me-3">
                  <FaCalendarAlt className="text-warning" />
                </div>
                <div>
                  <Card.Title className="h6">Pending Leaves</Card.Title>
                  <Card.Text className="display-6 text-warning fw-bold mb-0">
                    {dashboardData.pendingLeaves || 0}
                    <small className="text-muted d-block">requests</small>
                  </Card.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-3 mb-3">
          <Col xs={12}>
            <Card className="h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Card.Title className="h6">Monthly Attendance</Card.Title>
                  <Dropdown>
                    <Dropdown.Toggle variant="light" size="sm" className="py-1 px-2">
                      This Month
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item>This Month</Dropdown.Item>
                      <Dropdown.Item>Last Month</Dropdown.Item>
                      <Dropdown.Item>Last 3 Months</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
                <div style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardData.attendanceChart || []}
                      margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="day"  // Now using day abbreviation (Mon, Tue, etc)
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} hours`, 'Hours Worked']}
                        labelFormatter={(label, payload) => {
                          if (payload && payload.length) {
                            return payload[0].payload.date; // Use "Aug 10" format
                          }
                          return label;
                        }}
                      />
                      <Bar
                        dataKey="hours"
                        fill="#4e73df"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-3 mb-3">
          <Col xs={12}>
            <Card className="h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Card.Title className="h6">Upcoming Shifts</Card.Title>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate('/employee/panel/schedule')}
                    className="py-0 px-1"
                  >
                    View All
                  </Button>
                </div>
                <div className="upcoming-shifts">
                  {dashboardData.upcomingShifts?.length ? (
                    dashboardData.upcomingShifts.slice(0, 3).map((shift, index) => (
                      <div key={index} className="shift-item py-2">
                        <div className="shift-date">
                          <strong>{shift.day}</strong>
                          <span>{shift.date}</span>
                        </div>
                        <div className="shift-details">
                          <span className="shift-time">{shift.startTime} - {shift.endTime}</span>
                          <span className="shift-location">{shift.location}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 text-muted">
                      No upcoming shifts
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col xs={12}>
            <Card>
              <Card.Body className="p-2">
                <div className="quick-actions d-flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/employee/panel/attendance')}
                    className="flex-grow-1"
                  >
                    <FaClock className="me-1" /> Clock In/Out
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => navigate('/employee/panel/leave')}
                    className="flex-grow-1"
                  >
                    <FaCalendarAlt className="me-1" /> Request Leave
                  </Button>
                  <Button
                    variant="info"
                    onClick={() => navigate('/employee/panel/schedule')}
                    className="flex-grow-1"
                  >
                    <FaCalendarWeek className="me-1" /> View Schedule
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderProfileImage = (size = 'normal') => {
    if (employeeProfile?.photoUrl) {
      return (
        <img
          src={employeeProfile.photoUrl}
          className={`rounded-circle ${size === 'small' ? 'profile-img-sm' : 'profile-img'}`}
          alt="Profile"
          onError={(e) => {
            e.target.onerror = null;
            e.target.replaceWith(
              <div className={`avatar-icon ${size === 'small' ? 'small' : ''}`}>
                <FaUser />
              </div>
            );
          }}
        />
      );
    }

    return (
      <div className={`avatar-icon ${size === 'small' ? 'small' : ''}`}>
        <FaUser />
      </div>
    );
  };

  return (
    <div className="employee-panel">
      <div className="mobile-header d-lg-none">
        <Button
          variant="link"
          className="menu-toggle"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          <FaBars size={20} />
        </Button>
        <div className="brand-logo">
          <Link to="/employee/panel">EMPLOYEE PORTAL</Link>
        </div>
      </div>

      <div className={`sidebar ${showMobileMenu ? 'show' : ''}`}>
        <div className="sidebar-header">
          <div className="profile-info">
            {renderProfileImage('normal')}
            <div className="profile-details">
              <h6>{employeeProfile?.firstName} {employeeProfile?.lastName}</h6>
              <small className="text-muted">{employeeProfile?.position || 'Employee'}</small>
            </div>
          </div>
        </div>

        <Nav className="flex-column sidebar-nav">
          <Nav.Link as={Link} to="/employee/panel/dashboard" active={location.pathname.includes('dashboard')}>
            <FaHome className="me-2" /> Dashboard
          </Nav.Link>
          <Nav.Link as={Link} to="/employee/panel/profile" active={location.pathname.includes('profile')}>
            <FaUser className="me-2" /> My Profile
          </Nav.Link>
          <Nav.Link as={Link} to="/employee/panel/attendance" active={location.pathname.includes('attendance')}>
            <FaClock className="me-2" /> Attendance
          </Nav.Link>
          <Nav.Link as={Link} to="/employee/panel/leave" active={location.pathname.includes('leave')}>
            <FaCalendarAlt className="me-2" /> Leave Management
          </Nav.Link>
          <Nav.Link as={Link} to="/employee/panel/schedule" active={location.pathname.includes('schedule')}>
            <FaCalendarWeek className="me-2" /> Schedule
          </Nav.Link>
          <Nav.Link as={Link} to="/employee/panel/settings" active={location.pathname.includes('settings')}>
            <FaCog className="me-2" /> Settings
          </Nav.Link>
        </Nav>

        <div className="sidebar-footer">
          <Nav.Link onClick={() => setShowLogoutModal(true)}>
            <FaSignOutAlt className="me-2" /> Logout
          </Nav.Link>
        </div>
      </div>

      <div className="main-content">
        <div className="top-nav d-none d-lg-flex justify-content-end align-items-center">
          <Dropdown>
            <Dropdown.Toggle variant="light" className="profile-toggle">
              <div className="d-flex align-items-center">
                {renderProfileImage('small')}
                <span className="d-none d-md-inline">
                  {employeeProfile?.firstName} {employeeProfile?.lastName}
                </span>
              </div>
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Header>My Account</Dropdown.Header>
              <Dropdown.Item as={Link} to="/employee/panel/profile">
                <FaUser className="me-2" /> Profile
              </Dropdown.Item>
              <Dropdown.Item as={Link} to="/employee/panel/settings">
                <FaCog className="me-2" /> Settings
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={() => setShowLogoutModal(true)}>
                <FaSignOutAlt className="me-2" /> Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        <div className="content-area">
          {location.pathname === '/employee/panel' ||
            location.pathname === '/employee/panel/dashboard' ? (
            loading ? (
              <div className="loading-spinner">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
              </div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : (
              renderDashboard()
            )
          ) : <Outlet />}
        </div>
      </div>

      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to logout from your account?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleLogout}>
            Yes, Logout
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
export default EmployeePanel;