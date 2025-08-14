import React, { useState, useEffect } from 'react';
import { Table, Button, Alert, Spinner, Badge, InputGroup, Form, Card, Row, Col, Container } from 'react-bootstrap';
import { FiPlus, FiEdit, FiTrash2, FiTrendingUp, FiArrowDown, FiArrowUp, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { getStockItems, getLowStockItems, deleteStockItem } from '../api/stockApi';
import StockMovement from './StockMovement';

const StockList = () => {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const navigate = useNavigate();

  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError('');

      const items = await getStockItems();
      const lowStock = await getLowStockItems();

      setStockItems(Array.isArray(items) ? items : []);
      setLowStockItems(Array.isArray(lowStock) ? lowStock : []);
    } catch (err) {
      setError(err.message);
      setStockItems([]);
      setLowStockItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteStockItem(id);
        fetchStockData();
      } catch (err) {
        setError('Failed to delete item: ' + err.message);
      }
    }
  };

  const handleShowMovementModal = (item) => {
    setSelectedItem(item);
    setShowMovementModal(true);
  };

  const filteredItems = Array.isArray(stockItems)
    ? stockItems.filter(item =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    : [];

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="d-flex align-items-center gap-2">
            <FiTrendingUp /> Inventory Management
          </h2>
          <p className="text-muted">Manage your bakery's ingredients and supplies</p>
        </Col>
        <Col xs="auto">
          <Button
            variant="success"
            as={Link}
            to="/admin/panel/stock/add"
            className="d-flex align-items-center gap-1"
          >
            <FiPlus /> Add Item
          </Button>
        </Col>
      </Row>

      {lowStockItems.length > 0 && showLowStockAlert && (
        <Alert variant="warning" className="mb-4" onClose={() => setShowLowStockAlert(false)} dismissible>
          <div className="d-flex align-items-center gap-2 mb-2">
            <FiAlertTriangle size={24} />
            <h5 className="mb-0">Low Stock Alert</h5>
          </div>
          <Row>
            {lowStockItems.map(item => (
              <Col md={4} key={item._id} className="mb-2">
                <div>
                  <strong>{item.name}</strong>
                  <div>
                    <Badge bg="warning" className="me-2">
                      {item.currentQuantity} {item.unit}
                    </Badge>
                    <span className="text-muted">Min: {item.minThreshold}</span>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Alert>
      )}

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3 mb-4">
            <Col md={6}>
              <InputGroup>
                <Form.Control
                  placeholder="Search items or suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setSearchTerm('')}
                  disabled={!searchTerm}
                >
                  Clear
                </Button>
              </InputGroup>
            </Col>
            <Col md={6} className="d-flex justify-content-end">
              <Button
                variant="outline-secondary"
                onClick={() => fetchStockData()}
              >
                Refresh
              </Button>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Loading inventory data...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">
              <div className="d-flex justify-content-between align-items-center">
                <span>{error}</span>
                <Button variant="outline-danger" size="sm" onClick={fetchStockData}>
                  Retry
                </Button>
              </div>
            </Alert>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th className="text-end">Current Stock</th>
                      <th className="text-end">Min Threshold</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map(item => (
                        <tr key={item._id}>
                          <td>
                            <div className="fw-semibold">{item.name}</div>
                            {item.supplier && (
                              <div className="text-muted small">{item.supplier}</div>
                            )}
                          </td>
                          <td>
                            <Badge bg="secondary">{item.category}</Badge>
                          </td>
                          <td className="text-end fw-semibold">
                            {item.currentQuantity} {item.unit}
                          </td>
                          <td className="text-end">
                            {item.minThreshold} {item.unit}
                          </td>
                          <td>
                            <Badge
                              bg={
                                item.currentQuantity <= 0 ? 'danger' :
                                  item.currentQuantity <= item.minThreshold ? 'warning' : 'success'
                              }
                              className="py-2"
                            >
                              {item.currentQuantity <= 0 ? 'Out of Stock' :
                                item.currentQuantity <= item.minThreshold ? 'Low Stock' : 'In Stock'}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                title="Edit item"
                                onClick={() => navigate(`/admin/panel/stock/edit/${item._id}`)}
                              >
                                <FiEdit />
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                title="Record movement"
                                onClick={() => handleShowMovementModal(item)}
                              >
                                <FiArrowUp /> <FiArrowDown />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                title="Delete item"
                                onClick={() => handleDelete(item._id)}
                              >
                                <FiTrash2 />
                              </Button>
                              <Button
                                variant="outline-info"
                                size="sm"
                                title="View history"
                                onClick={() => navigate(`/admin/panel/stock/history/${item._id}`)}
                              >
                                <FiClock />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          No items found matching your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      <StockMovement
        show={showMovementModal}
        handleClose={() => setShowMovementModal(false)}
        item={selectedItem}
        refreshData={fetchStockData}
      />
    </Container>
  );
};

export default StockList;