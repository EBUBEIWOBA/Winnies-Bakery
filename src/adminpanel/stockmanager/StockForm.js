import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Form, Button, Card, Alert, Spinner, Container, Row, Col, FloatingLabel 
} from 'react-bootstrap';
import { FiSave, FiArrowLeft, FiPlus, FiEdit } from 'react-icons/fi';
import { getStockItems, createStockItem, updateStockItem } from '../api/stockApi';

const StockForm = ({ mode = 'add' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Ingredient',
    currentQuantity: 0,
    unit: 'kg',
    minThreshold: 0,
    supplier: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (mode === 'edit' && id) {
      const fetchItem = async () => {
        setLoading(true);
         try {
        const items = await getStockItems();
        const item = items.find(i => i._id === id);
        if (item) {
          setFormData({
            name: item.name,
            category: item.category,
            currentQuantity: item.currentQuantity,
            unit: item.unit,
            minThreshold: item.minThreshold,
            supplier: item.supplier || ''
          });
        }
        } catch (err) {
          setError('Failed to load item: ' + err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchItem();
    }
  }, [mode, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['currentQuantity', 'minThreshold'].includes(name) ? 
        Math.max(0, Number(value)) : value
    }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  setError('');
  
  // Validation
  if (!formData.name.trim()) {
    setError('Item name is required');
    setSubmitting(false);
    return;
  }

  try {
    // Convert numbers properly
    const payload = {
      ...formData,
      currentQuantity: Number(formData.currentQuantity),
      minThreshold: Number(formData.minThreshold)
    };

    if (mode === 'add') {
      await createStockItem(payload);
      setSuccess('Item added successfully!');
    } else {
      await updateStockItem(id, payload);
      setSuccess('Item updated successfully!');
    }
    
    setTimeout(() => {
      navigate('/admin/panel/stock');
    }, 1500);
  } catch (err) {
    setError('Operation failed: ' + err.message);
  } finally {
    setSubmitting(false);
  }
};

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading item data...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Button 
        variant="outline-secondary" 
        onClick={() => navigate('/admin/panel/stock')}
        className="mb-3 d-inline-flex align-items-center"
      >
        <FiArrowLeft className="me-1" /> Back to Inventory
      </Button>
      
      <Card className="shadow-sm">
        <Card.Header className="bg-light border-0 py-3">
          <h4 className="mb-0 d-flex align-items-center gap-2">
            {mode === 'add' ? <FiPlus /> : <FiEdit />}
            {mode === 'add' ? 'Add New Stock Item' : 'Edit Stock Item'}
          </h4>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError('')} dismissible>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" onClose={() => setSuccess('')} dismissible>
              {success}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              <Col md={6}>
                <FloatingLabel controlId="name" label="Item Name *" className="mb-3">
                  <Form.Control
                    type="text"
                    name="name"
                    placeholder="Flour"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                </FloatingLabel>
              </Col>
              
              <Col md={6}>
                <FloatingLabel controlId="category" label="Category *" className="mb-3">
                  <Form.Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  >
                    <option value="Ingredient">Ingredient</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Ready Product">Ready Product</option>
                    <option value="Beverage">Beverage</option>
                  </Form.Select>
                </FloatingLabel>
              </Col>
              
              <Col md={3}>
                <FloatingLabel controlId="currentQuantity" label="Quantity *" className="mb-3">
                  <Form.Control
                    type="number"
                    name="currentQuantity"
                    min="0"
                    step="0.01"
                    value={formData.currentQuantity}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                </FloatingLabel>
              </Col>
              
              <Col md={3}>
                <FloatingLabel controlId="unit" label="Unit *" className="mb-3">
                  <Form.Select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">L</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                    <option value="box">box</option>
                    <option value="bottle">bottle</option>
                  </Form.Select>
                </FloatingLabel>
              </Col>
              
              <Col md={3}>
                <FloatingLabel controlId="minThreshold" label="Min Threshold *" className="mb-3">
                  <Form.Control
                    type="number"
                    name="minThreshold"
                    min="0"
                    step="0.01"
                    value={formData.minThreshold}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                </FloatingLabel>
              </Col>
              
              <Col md={3}>
                <FloatingLabel controlId="supplier" label="Supplier" className="mb-3">
                  <Form.Control
                    type="text"
                    name="supplier"
                    placeholder="Supplier name"
                    value={formData.supplier}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </FloatingLabel>
              </Col>
            </Row>
            
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                variant="outline-secondary"
                onClick={() => navigate('/admin/panel/stock')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                variant={mode === 'add' ? 'success' : 'primary'} 
                type="submit"
                disabled={submitting}
                className="d-flex align-items-center gap-1"
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {mode === 'add' ? 'Adding...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <FiSave className="me-1" />
                    {mode === 'add' ? 'Add Item' : 'Update Item'}
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};
export default StockForm;