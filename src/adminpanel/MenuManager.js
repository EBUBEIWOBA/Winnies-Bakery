import React, { useEffect, useState, useCallback } from 'react';
import {Table, Button, Modal, Form, Container, Spinner, Alert, Badge, Row, Col, 
  Card, Tab, Tabs, InputGroup, FloatingLabel} from 'react-bootstrap';
import { FiPlus, FiTrash2, FiEdit, FiUpload, 
  FiSearch, FiCoffee, FiPieChart, FiMeh, FiCheckCircle, FiXCircle} from 'react-icons/fi';
import MenuApi from './api/MenuApi';
import './MenuManager.css';

const MenuManager = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '', 
    category: '',
    price: '',
    image: null,
    isAvailable: true
  });

  const categories = [
    { id: 'bakery', name: 'Bakery', icon: <FiPieChart className="me-2" /> },
    { id: 'food', name: 'Food', icon: <FiMeh className="me-2" /> },
    { id: 'drink', name: 'Drink', icon: <FiCoffee className="me-2" /> },
    { id: 'dessert', name: 'Dessert', icon: <FiCheckCircle className="me-2" /> },
    { id: 'special', name: 'Special', icon: <FiCheckCircle className="me-2" /> }
  ];

  const categoryColors = {
    bakery: 'warning',
    food: 'success',
    drink: 'primary',
    dessert: 'info',
    special: 'danger'
  };

  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await MenuApi.getAllMenuItems();
      const items = Array.isArray(response) ? response : (response.data || []);
      setMenuItems(items);
    } catch (err) {
      console.error('Menu fetch error:', err);
      setError(err.message || 'Failed to load menu items. Please try again.');
      if (err.message.includes('Failed to load') || err.message.includes('network')) {
        setTimeout(fetchMenuItems, 5000);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeTab === 'all' || 
      item.category?.toLowerCase() === activeTab;
    const matchesSearch = searchTerm === '' ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setNewItem({ 
      name: '', 
      description: '', 
      category: '', 
      price: '', 
      image: null,
      isAvailable: true
    });
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewItem(prev => ({ ...prev, image: e.target.files[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newItem.name || !newItem.category || !newItem.price) {
      setError('Please fill in all required fields');
      return;
    }

    if (isNaN(newItem.price)) {
      setError('Price must be a valid number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const createdItem = await MenuApi.createMenuItem(newItem);
      const newMenuItem = createdItem.data || createdItem;
      setMenuItems(prev => [...prev, newMenuItem]);
      setSuccess('Menu item added successfully!');
      handleCloseModal();
    } catch (err) {
      console.error('Error creating menu item:', err);
      setError(err.message || 'Failed to create menu item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        setLoading(true);
        await MenuApi.deleteMenuItem(id);
        setMenuItems(prev => prev.filter(item => item._id !== id));
        setSuccess('Menu item deleted successfully!');
      } catch (err) {
        console.error('Error deleting menu item:', err);
        setError(err.message || 'Failed to delete menu item. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <Container fluid className="px-4 py-4 menu-manager-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Menu Management</h2>
          <p className="text-muted mb-0">Manage your bakery's menu items and categories</p>
        </div>
        <Button
          variant="primary"
          onClick={handleShowModal}
          disabled={loading}
          className="d-flex align-items-center"
        >
          <FiPlus className="me-2" /> Add New Item
        </Button>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-4">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)} dismissible className="mb-4">
          {success}
        </Alert>
      )}

      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="px-3 pt-3 border-bottom"
          >
            <Tab eventKey="all" title="All Items" className="px-3" />
            {categories.map(category => (
              <Tab 
                key={category.id}
                eventKey={category.id}
                title={
                  <span className="d-flex align-items-center">
                    {category.icon}
                    {category.name}
                  </span>
                }
                className="px-3"
              />
            ))}
          </Tabs>

          <div className="p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center">
            <div className="mb-3 mb-md-0">
              <h5 className="mb-0">
                {activeTab === 'all' ? 'All Menu Items' : 
                  `${categories.find(c => c.id === activeTab)?.name} Items`}
                <Badge bg="light" text="dark" className="ms-2">
                  {filteredItems.length}
                </Badge>
              </h5>
            </div>
            
            <InputGroup style={{ maxWidth: '300px' }}>
              <Form.Control
                placeholder="Search items..."
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
              <Button variant="outline-secondary">
                <FiSearch />
              </Button>
            </InputGroup>
          </div>

          {loading && !menuItems.length ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading menu items...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '60px' }}></th>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <tr key={item._id}>
                        <td>
                          {item.image ? (
                            <img
                              src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/menu/${item.image}`}
                              alt={item.name}
                              className="img-thumbnail rounded"
                              style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/placeholder-food.jpg';
                              }}
                            />
                          ) : (
                            <div className="bg-light rounded d-flex align-items-center justify-content-center" 
                              style={{ width: '50px', height: '50px' }}>
                              <FiMeh size={20} className="text-muted" />
                            </div>
                          )}
                        </td>
                        <td className="fw-semibold">{item.name}</td>
                        <td className="text-muted" style={{ maxWidth: '300px' }}>
                          <div className="text-truncate">
                            {item.description || 'No description'}
                          </div>
                        </td>
                        <td>
                          <Badge bg={categoryColors[item.category?.toLowerCase()] || 'secondary'}>
                            {item.category}
                          </Badge>
                        </td>
                        <td className="fw-semibold">
                          ₦{Number(item.price).toLocaleString('en-NG', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td>
                          {item.isAvailable !== false ? (
                            <Badge bg="success" className="d-flex align-items-center">
                              <FiCheckCircle size={14} className="me-1" /> Active
                            </Badge>
                          ) : (
                            <Badge bg="danger" className="d-flex align-items-center">
                              <FiXCircle size={14} className="me-1" /> Inactive
                            </Badge>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="d-flex align-items-center"
                            >
                              <FiEdit size={14} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(item._id)}
                              disabled={loading}
                              className="d-flex align-items-center"
                            >
                              <FiTrash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        {searchTerm ? 
                          'No items match your search' : 
                          'No menu items found. Add your first item!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add Item Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title>Add New Menu Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <FloatingLabel controlId="name" label="Item Name" className="mb-3">
                  <Form.Control
                    type="text"
                    name="name"
                    value={newItem.name}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    placeholder="Item Name"
                  />
                </FloatingLabel>

                <FloatingLabel controlId="description" label="Description" className="mb-3">
                  <Form.Control
                    as="textarea"
                    style={{ height: '100px' }}
                    name="description"
                    value={newItem.description}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="Description"
                  />
                </FloatingLabel>

                <FloatingLabel controlId="category" label="Category" className="mb-3">
                  <Form.Select
                    name="category"
                    value={newItem.category}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </Form.Select>
                </FloatingLabel>
              </Col>

              <Col md={6}>
                <FloatingLabel controlId="price" label="Price (₦)" className="mb-3">
                  <Form.Control
                    type="number"
                    name="price"
                    min="0.01"
                    step="0.01"
                    value={newItem.price}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    placeholder="Price"
                  />
                </FloatingLabel>

                <Form.Group className="mb-3">
                  <Form.Label className="d-flex align-items-center">
                    <FiUpload className="me-2" /> Item Image
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading}
                  />
                  <Form.Text className="text-muted">
                    Recommended size: 800x600px (Max 5MB)
                  </Form.Text>
                </Form.Group>

                <Form.Check
                  type="switch"
                  id="availability"
                  label="Available"
                  checked={newItem.isAvailable}
                  onChange={(e) => setNewItem(prev => ({
                    ...prev,
                    isAvailable: e.target.checked
                  }))}
                  className="mb-3"
                />
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                variant="outline-secondary"
                onClick={handleCloseModal}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                className="d-flex align-items-center"
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiPlus className="me-2" />
                    Add Item
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default MenuManager;