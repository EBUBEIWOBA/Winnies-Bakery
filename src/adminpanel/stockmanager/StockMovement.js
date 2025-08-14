import React, { useState } from 'react';
import { 
  Modal, Button, Form, Alert, Row, Col, FloatingLabel, Spinner
} from 'react-bootstrap';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { recordMovement } from '../api/stockApi';

const StockMovement = ({ show, handleClose, item, refreshData }) => {
  const [formData, setFormData] = useState({
    type: 'purchase',
    quantity: '',
    notes: '',
    staff: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Validation
      if (!formData.quantity || Number(formData.quantity) <= 0) {
        throw new Error('Please enter a valid quantity');
      }
      
      if (!formData.staff) {
        throw new Error('Please enter your name');
      }
      
      // Check stock levels for usage
      if (['usage', 'wastage', 'expiry'].includes(formData.type)) {
        if (Number(formData.quantity) > item.currentQuantity) {
          throw new Error(`Insufficient stock. Available: ${item.currentQuantity} ${item.unit}`);
        }
      }

      await recordMovement({
        itemId: item._id,
        ...formData,
        quantity: Number(formData.quantity)
      });

      setSuccess('Movement recorded successfully!');
      refreshData();
      
      setTimeout(() => {
        handleClose();
        setFormData({
          type: 'purchase',
          quantity: '',
          notes: '',
          staff: ''
        });
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="d-flex align-items-center gap-2">
            {formData.type === 'purchase' ? <FiArrowUp /> : <FiArrowDown />}
            {item.name} - Record Movement
          </div>
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <Row className="g-3">
          <Col md={6}>
            <FloatingLabel label="Movement Type" className="mb-3">
              <Form.Select
                value={formData.type}
                name="type"
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="purchase">Stock In (Purchase)</option>
                <option value="usage">Stock Out (Usage)</option>
                <option value="wastage">Stock Out (Wastage)</option>
                <option value="expiry">Stock Out (Expiry)</option>
                <option value="adjustment">Quantity Adjustment</option>
              </Form.Select>
            </FloatingLabel>
          </Col>
          
          <Col md={6}>
            <FloatingLabel 
              label={`Quantity (${item.unit})`} 
              className="mb-3"
            >
              <Form.Control
                type="number"
                name="quantity"
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={handleChange}
                placeholder={`Enter quantity in ${item.unit}`}
                disabled={submitting}
                required
              />
            </FloatingLabel>
          </Col>
          
          <Col md={12}>
            <FloatingLabel label="Notes (Optional)" className="mb-3">
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional information about this movement"
                disabled={submitting}
              />
            </FloatingLabel>
          </Col>
          
          <Col md={12}>
            <FloatingLabel label="Recorded By" className="mb-3">
              <Form.Control
                type="text"
                name="staff"
                value={formData.staff}
                onChange={handleChange}
                placeholder="Your name"
                disabled={submitting}
                required
              />
            </FloatingLabel>
          </Col>
        </Row>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <Spinner animation="border" size="sm" className="me-2" />
          ) : null}
          Record Movement
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default StockMovement;