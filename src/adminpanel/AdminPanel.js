//In AdminPanel Dashboard
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Navbar, Button, Badge, Dropdown, Offcanvas } from 'react-bootstrap';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import {
  FiHome, FiMenu, FiUsers, FiShoppingBag, FiMessageSquare, FiLogOut,
  FiSettings, FiBell, FiUser, FiHelpCircle, FiUserPlus
} from 'react-icons/fi';
import './AdminPanel.css';
import { adminLogout } from './api/adminApi';

const AdminPanel = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const location = useLocation();
  const [notifications] = useState([
    { id: 1, text: 'New order received', time: '2 min ago', read: false },
    { id: 2, text: 'Inventory low on flour', time: '1 hour ago', read: true },
    { id: 3, text: 'New customer feedback', time: '3 hours ago', read: true }
  ]);
  const navigate = useNavigate();

  const [adminData, setAdminData] = useState(() => {
    const data = localStorage.getItem('adminData');
    return data ? JSON.parse(data) : {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      photo: ''
    };
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const data = localStorage.getItem('adminData');
      if (data) {
        setAdminData(JSON.parse(data));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    try {
      await adminLogout();
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      navigate('/admin/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const navItems = [
    { path: '/admin/panel/dashboard', name: 'Dashboard', icon: <FiHome className="nav-icon" /> },
    { path: '/admin/panel/menu-manager', name: 'Menu Manager', icon: <FiMenu className="nav-icon" /> },
    { path: '/admin/panel/employees', name: 'Employees', icon: <FiUsers className="nav-icon" /> },
    { path: '/admin/panel/stock', name: 'Inventory', icon: <FiShoppingBag className="nav-icon" /> },
    { path: '/admin/panel/feedback', name: 'Feedback', icon: <FiMessageSquare className="nav-icon" /> },
    { path: '/admin/panel/settings', name: 'Settings', icon: <FiSettings className="nav-icon" /> }
  ];

  const isActive = (path) => {
    return location.pathname === path ||
      (path !== '/admin/dashboard' && location.pathname.startsWith(path));
  };

  return (
    <div className="admin-panel">
      {/* Mobile Header */}
      <Navbar className="mobile-header d-lg-none" bg="white" expand="lg">
        <Container fluid>
          <Button
            variant="link"
            className="sidebar-toggle"
            onClick={() => setShowMobileMenu(true)}
          >
            <FiMenu size={24} />
          </Button>
          <Navbar.Brand as={Link} to="/admin/dashboard" className="ms-2">
            <span className="brand-text">Winnie's Bakery</span>
            <span className="brand-subtext">Admin</span>
          </Navbar.Brand>
          <div className="ms-auto d-flex align-items-center">
            <Dropdown align="end" className="notification-dropdown">
              <Dropdown.Toggle variant="link" className="position-relative p-0">
                <FiBell size={20} />
                {unreadNotifications > 0 && (
                  <Badge pill bg="danger" className="notification-badge">
                    {unreadNotifications}
                  </Badge>
                )}
              </Dropdown.Toggle>
            </Dropdown>
          </div>
        </Container>
      </Navbar>

      {/* Mobile Sidebar */}
      <Offcanvas
        show={showMobileMenu}
        onHide={() => setShowMobileMenu(false)}
        className="mobile-sidebar d-lg-none"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Admin Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="user-profile-sidebar mb-4">
            <div className="text-center">
              <div className="sidebar-avatar-container">
                {adminData.photo ? (
                  <img
                    src={adminData.photo}
                    alt="Profile"
                    className="sidebar-avatar"
                  />
                ) : (
                  <FiUser size={48} className="sidebar-avatar-icon" />
                )}
              </div>

              <div className="sidebar-avatar-container">
                {adminData.photo ? (
                  <img
                    src={adminData.photo}
                    alt="Profile"
                    className="sidebar-avatar"
                  />
                ) : (
                  <FiUser size={48} className="sidebar-avatar-icon" />
                )}
              </div>

              {/*In  the dropdown menu section, update the avatar: */}
              <div className="user-avatar">
                {adminData.photo ? (
                  <img
                    src={adminData.photo}
                    alt="Profile"
                    className="avatar-image"
                  />
                ) : (
                  <FiUser size={20} />
                )}
              </div>
              <h6 className="mt-2 mb-0">{adminData.firstName} {adminData.lastName}</h6>
              <small className="text-muted">{adminData.email}</small>
              <Button
                variant="link"
                size="sm"
                className="d-block mx-auto mt-2"
                onClick={() => {
                  navigate('/admin/panel/profile');
                  setShowMobileMenu(false);
                }}
              >
                View Profile
              </Button>
            </div>
          </div>
          <Nav className="flex-column">
            {navItems.map(item => (
              <Nav.Link
                key={item.path}
                as={Link}
                to={item.path}
                active={isActive(item.path)}
                onClick={() => setShowMobileMenu(false)}
                className={isActive(item.path) ? 'active' : ''}
              >
                {item.icon}
                {item.name}
                {item.badge && (
                  <Badge pill bg="primary" className="ms-auto">
                    {item.badge}
                  </Badge>
                )}
              </Nav.Link>
            ))}
            <Nav.Link onClick={handleLogout} className="logout-btn">
              <FiLogOut className="me-2" />
              Logout
            </Nav.Link>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Desktop Layout */}
      <Container fluid className="desktop-layout">
        <Row>
          {/* Sidebar */}
          <Col lg={2} className="sidebar d-none d-lg-block">
            <div className="sidebar-header">
              <div className="user-profile-sidebar mb-4">
                <div className="text-center">
                  <div className="sidebar-avatar-container">
                    {adminData.photo ? (
                      <img
                        src={adminData.photo}
                        alt="Profile"
                        className="sidebar-avatar"
                      />
                    ) : (
                      <FiUser size={48} className="sidebar-avatar-icon" />
                    )}
                  </div>
                  <h6 className="mt-2 mb-0">{adminData.firstName} {adminData.lastName}</h6>
                  <small className="text-muted">{adminData.email}</small>
                  <Button
                    variant="link"
                    size="sm"
                    className="d-block mx-auto mt-2"
                    onClick={() => {
                      navigate('/admin/panel/profile');
                      setShowMobileMenu(false);
                    }}
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            </div>
            <Nav className="flex-column">
              {navItems.map(item => (
                <Nav.Link
                  key={item.path}
                  as={Link}
                  to={item.path}
                  active={isActive(item.path)}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  {item.icon}
                  <span className="nav-text">{item.name}</span>
                  {item.badge && (
                    <Badge pill bg="primary" className="ms-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Nav.Link>
              ))}
            </Nav>
            <div className="sidebar-footer">
              <Button variant="link"
                className="logout-btn"
                onClick={handleLogout}
              >
                <FiLogOut className="me-2" />
                Logout
              </Button>
            </div>
          </Col>

          {/* Main Content */}
          <Col lg={10} className="main-content">
            {/* Top Navigation */}
            <div className="top-nav">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="page-title mb-0">
                  {navItems.find(item => isActive(item.path))?.name || 'Dashboard'}
                </h5>
                <div className="d-flex align-items-center">
                 

                  <Dropdown align="end">
                    <Dropdown.Toggle variant="link" className="user-dropdown">
                      <div className="user-avatar">
                        {adminData.photo ? (
                          <img
                            src={adminData.photo}
                            alt="Profile"
                            className="avatar-image"
                          />
                        ) : (
                          <FiUser size={20} />
                        )}
                      </div>
                      <span className="ms-2 d-none d-xl-inline">
                        {adminData.firstName} {adminData.lastName}
                      </span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => navigate('/admin/panel/profile')}>
                        <FiUser className="me-2" /> Profile
                      </Dropdown.Item>
                      {adminData.role === 'admin' && (
                        <Dropdown.Item onClick={() => navigate('/admin/register')}>
                          <FiUserPlus className="me-2" /> Create New Admin
                        </Dropdown.Item>
                      )}
                      <Dropdown.Item onClick={() => navigate('/admin/panel/settings')}>
                        <FiSettings className="me-2" /> Settings
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={() => navigate('/admin/panel/help')}>
                        <FiHelpCircle className="me-2" /> Help
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={handleLogout}
                      >
                        <FiLogOut className="me-2" /> Logout
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="content-area">
              <Outlet />
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AdminPanel;