// Dashboard.js
import React, { useState, useEffect } from 'react';
import {Row, Col, Card, Spinner, Badge, Table,
  ProgressBar, Alert, Button} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom'; 
import {  FiUsers, FiMessageSquare, FiCoffee, FiPackage,
  FiAlertTriangle, FiTrendingUp, FiShoppingCart } from 'react-icons/fi';
import dashboardApi from './api/dashboardApi';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLowStock, setExpandedLowStock] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dashboardApi.getDashboardStats();
        setStats(response.stats);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again later.');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const renderStatCard = (title, value, icon, color, description = '') => (
    <Col xl={3} lg={6} md={6} className="mb-4">
      <Card className="stat-card h-100">
        <Card.Body className="p-3 d-flex align-items-center">
          <div className={`icon-container bg-${color}-subtle me-3`}>
            <div className={`icon-bg text-${color}`}>
              {icon}
            </div>
          </div>
          <div>
            <h2 className="mb-0 fw-bold">{value}</h2>
            <Card.Title className="mb-1 text-muted">{title}</Card.Title>
            {description && <small className="text-muted">{description}</small>}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );

  const getStockStatusColor = (quantity, threshold) => {
    const percentage = (quantity / threshold) * 100;
    if (percentage < 25) return 'danger';
    if (percentage < 50) return 'warning';
    if (percentage < 75) return 'info';
    return 'success';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading dashboard data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mt-4">
        <FiAlertTriangle className="me-2" />
        {error}
        <Button variant="outline-danger" size="sm" className="ms-3" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Alert>
    );
  }

  const lowStockItems = stats.stockItems.filter(item => item.status === 'low');

  return (
    <div className="dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <h3 className="fw-bold mb-2">Dashboard Overview</h3>
        <div className="text-muted">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      <Row className="mb-4">
        {renderStatCard('Employees', stats.totalEmployees, <FiUsers size={24} />, 'primary')}
        {renderStatCard('Feedbacks', stats.totalFeedbacks, <FiMessageSquare size={24} />, 'info')}
        {renderStatCard('Menu Items', stats.totalMenuItems, <FiCoffee size={24} />, 'success')}
        {renderStatCard(
          'Stock Items',
          stats.totalStockItems,
          <FiPackage size={24} />,
          'warning',
          'Distinct inventory items'
        )}
      </Row>

      {/* Low Stock Alert Section */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Header className="bg-white border-0 d-flex align-items-center py-3 flex-wrap">
          <div className="d-flex align-items-center me-auto mb-2 mb-md-0">
            <FiAlertTriangle className="me-2 text-danger fs-4" />
            <h5 className="mb-0 fw-bold">Low Stock Alerts</h5>
            <Badge bg="danger" className="ms-2">
              {stats.lowStockItems}
            </Badge>
          </div>
          {stats.lowStockItems > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setExpandedLowStock(!expandedLowStock)}
              className="ms-md-auto"
            >
              {expandedLowStock ? 'Hide Details' : 'View All'}
            </Button>
          )}
        </Card.Header>
        <Card.Body className="p-0">
          {stats.lowStockItems === 0 ? (
            <div className="text-center py-5 text-muted bg-light rounded">
              <FiPackage size={48} className="mb-3" />
              <h5>No Low Stock Items</h5>
              <p className="mb-0">All inventory levels are satisfactory</p>
            </div>
          ) : (
            <>
              <div className="d-flex flex-wrap px-3 py-2 bg-light">
                {lowStockItems.slice(0, expandedLowStock ? lowStockItems.length : 3).map((item, index) => (
                  <div key={index} className="stock-alert-item p-2 mb-2 me-2 flex-grow-1" style={{ minWidth: '250px' }}>
                    <div className="d-flex align-items-center">
                      <div className="stock-alert-indicator bg-danger me-2"></div>
                      <div>
                        <div className="fw-bold">{item.name}</div>
                        <small className="text-muted">
                          {item.quantity} {item.unit} • Threshold: {item.threshold}
                        </small>
                      </div>
                    </div>
                    <ProgressBar
                      variant={getStockStatusColor(item.quantity, item.threshold)}
                      now={(item.quantity / item.threshold) * 100}
                      className="mt-2"
                      style={{ height: '6px' }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Stock Overview Section */}
      <Row>
        <Col xl={8} lg={7} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 d-flex align-items-center py-3 flex-wrap">
              <FiTrendingUp className="me-2 text-success fs-4" />
              <h5 className="mb-0 me-auto fw-bold">Inventory Overview</h5>
              <Button variant="outline-secondary" size="sm" className="mt-2 mt-md-0" onClick={() => navigate('/admin/panel/stock')}
                  >
                <FiShoppingCart className="me-1" /> Manage Stock
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.stockItems.map((item, index) => (
                      <tr key={index}>
                        <td className="fw-bold">{item.name}</td>
                        <td>
                          {item.quantity} <small className="text-muted">{item.unit}</small>
                        </td>
                        <td>
                          {item.status === 'low' ? (
                            <Badge bg="danger" className="px-2 py-1">Low</Badge>
                          ) : (
                            <Badge bg="success" className="px-2 py-1">OK</Badge>
                          )}
                        </td>
                        <td>
                          <ProgressBar
                            variant={getStockStatusColor(item.quantity, item.threshold)}
                            now={(item.quantity / item.threshold) * 100}
                            style={{ height: '8px', minWidth: '80px' }}
                            label={`${Math.round((item.quantity / item.threshold) * 100)}%`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Summary Cards */}
        <Col xl={4} lg={5}>
          <Row>
            <Col md={12} className="mb-4">
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white border-0 py-3">
                  <div className="d-flex align-items-center">
                    <FiUsers className="me-2 text-primary fs-4" />
                    <h5 className="mb-0 fw-bold">Employee Summary</h5>
                  </div>
                </Card.Header>
                <Card.Body className="d-flex flex-column align-items-center justify-content-center py-4">
                  <div className="display-4 fw-bold text-primary">{stats.totalEmployees}</div>
                  <div className="text-muted">Active Employees</div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/admin/panel/employees')}
                  >
                    View Team
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col md={12}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white border-0 py-3">
                  <div className="d-flex align-items-center">
                    <FiMessageSquare className="me-2 text-info fs-4" />
                    <h5 className="mb-0 fw-bold">Customer Feedback</h5>
                  </div>
                </Card.Header>
                <Card.Body className="d-flex flex-column align-items-center justify-content-center py-4">
                  <div className="display-4 fw-bold text-info">{stats.totalFeedbacks}</div>
                  <div className="text-muted">Recent Feedback</div>
                  <div className="mt-3 d-flex">
                    <Badge bg="success" className="me-2">87% Positive</Badge>
                    <Badge bg="warning">13% Needs Attention</Badge>
                  </div>
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/admin/panel/feedback')}
                  >
                    View Feedback
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};
export default Dashboard;