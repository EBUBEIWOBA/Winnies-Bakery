import React, { useState } from 'react';
import { Form, Button, Alert, Card, Row, Col, Spinner } from 'react-bootstrap';
import { FiStar, FiMessageSquare, FiCheck } from 'react-icons/fi';
import { createFeedback } from '../adminpanel/api/FeedbackApi';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    customerName: '',
    email: '',
    rating: 5,
    feedbackType: 'suggestion',
    message: '',
    visitDate: new Date().toISOString().split('T')[0]
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await createFeedback(JSON.stringify({
        customerName: formData.customerName,
        email: formData.email,
        rating: formData.rating,
        feedbackType: formData.feedbackType,
        message: formData.message,
        visitDate: formData.visitDate
      })); if (response.success) {
        setSubmitted(true);
      } else {
        setError(response.error || 'Failed to submit feedback');
        console.error('API Error:', response); // Log full error
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Submission Error:', err); // Log full error
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return <ThankYouMessage />;
  }

  return (
    <Card className="shadow-sm" style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
      <Card.Header className="bg-white border-0">
        <h4 className="text-center mb-0">Share Your Feedback</h4>
      </Card.Header>

      <Card.Body>
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Your Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={loading}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email Address *</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Visit Date *</Form.Label>
            <Form.Control
              type="date"
              name="visitDate"
              value={formData.visitDate}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              required
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Rating *</Form.Label>
            <div className="d-flex align-items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="link"
                  className="p-0 me-1"
                  onClick={() => !loading && setFormData(prev => ({ ...prev, rating: star }))}
                  disabled={loading}
                >
                  <FiStar
                    size={24}
                    className={star <= formData.rating ? 'text-warning' : 'text-muted'}
                    fill={star <= formData.rating ? 'currentColor' : 'none'}
                  />
                </Button>
              ))}
              <span className="ms-2">{formData.rating} star{formData.rating !== 1 ? 's' : ''}</span>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Feedback Type *</Form.Label>
            <div className="d-flex gap-3">
              {['compliment', 'complaint', 'suggestion'].map((type) => (
                <Form.Check
                  key={type}
                  type="radio"
                  id={type}
                  name="feedbackType"
                  label={
                    <>
                      {type === 'compliment' ? (
                        <FiStar className="text-success me-1" />
                      ) : (
                        <FiMessageSquare className={
                          type === 'complaint' ? 'text-danger me-1' : 'text-info me-1'
                        } />
                      )}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </>
                  }
                  value={type}
                  checked={formData.feedbackType === type}
                  onChange={handleChange}
                  disabled={loading}
                />
              ))}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Your Feedback *</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Please share your experience with us..."
              required
              minLength={10}
              maxLength={1000}
              disabled={loading}
            />
          </Form.Group>

          <div className="d-grid">
            <Button
              variant="primary"
              type="submit"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <FiCheck className="me-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

const ThankYouMessage = () => {
  return (
    <Card className="shadow-sm text-center" style={{ maxWidth: '600px', margin: '0 auto 2rem auto' }}>
      <Card.Body className="py-5">
        <div className="display-4 text-success mb-3">✓</div>
        <h3>Thank You for Your Feedback!</h3>
        <p className="lead">
          We appreciate you taking the time to share your experience with us.
        </p>
        <p>
          Your feedback helps us improve our services. We'll review your comments and respond if needed.
        </p>
        <Button variant="outline-primary" href="/">
          Back to Home
        </Button>
      </Card.Body>
    </Card>
  );
};

export default FeedbackForm;