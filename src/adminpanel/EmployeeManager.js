import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Tabs, Tab, Row, Col} from 'react-bootstrap';
import {FiUsers, FiCalendar, FiClock, FiFileText, 
  FiPlus, FiSearch, FiFilter} from 'react-icons/fi';
import './EmployeeManager.css';

const EmployeeManager = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeKey = location.pathname.split('/').pop() || 'list';

  const handleTabSelect = (key) => {
    navigate(key); // Navigate to the selected tab's path
  };

  return (
    <div className="employee-manager-container">
      {/* Header Section */}
      <Card className="manager-header mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col>
              <h2 className="mb-0">Employee Management</h2>
              <p className="text-muted mb-0">Manage your bakery staff efficiently</p>
            </Col>
            <Col xs="auto">
              <Button 
                variant="primary" 
                size="sm" 
                className="d-flex align-items-center"
                onClick={() => navigate('profile/new')}
              >
                <FiPlus className="me-2" /> Add Employee
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Main Content Area */}
      <Card className="manager-content">
        <Card.Body>
          <Row>
            {/* Navigation Tabs - Horizontal */}
            <Col xs={12}>
              <Tabs
                activeKey={activeKey}
                onSelect={handleTabSelect}
                className="mb-4 employee-tabs"
                fill
              >
                <Tab
                  eventKey="list"
                  title={
                    <span className="d-flex align-items-center">
                      <FiUsers className="me-2" /> Directory
                    </span>
                  }
                />
                <Tab
                  eventKey="schedule"
                  title={
                    <span className="d-flex align-items-center">
                      <FiCalendar className="me-2" /> Shifts
                    </span>
                  }
                />
                <Tab
                  eventKey="attendance"
                  title={
                    <span className="d-flex align-items-center">
                      <FiClock className="me-2" /> Attendance
                    </span>
                  }
                />
                <Tab
                  eventKey="leave"
                  title={
                    <span className="d-flex align-items-center">
                      <FiFileText className="me-2" /> Leaves
                      <Badge pill bg="warning" className="ms-2">3</Badge>
                    </span>
                  }
                />
              </Tabs>
            </Col>

            {/* Content Area */}
            <Col xs={12}>
              {/* Action Bar */}
              <div className="action-bar mb-3">
                <div className="search-filter">
                  <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search employees..." 
                      className="form-control search-input"
                    />
                  </div>
                  <Button variant="outline-secondary" size="sm">
                    <FiFilter className="me-2" /> Filters
                  </Button>
                </div>
              </div>

              {/* Dynamic Content */}
              <div className="content-wrapper">
                <Outlet />
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmployeeManager;