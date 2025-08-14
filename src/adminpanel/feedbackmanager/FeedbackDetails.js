import React, { useState, useEffect } from 'react';
import { Card, Alert, Spinner, Button, Badge, Form, Row, Col } from 'react-bootstrap';
import { FiArrowLeft, FiCheck, FiArchive, FiEdit } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import { getFeedbackDetails, updateFeedback } from '../api/FeedbackApi';

const FeedbackDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        response: '',
        status: 'pending'
    });

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                setLoading(true);
                const response = await getFeedbackDetails(id);
                
                if (!response.success) {
                    setError(response.error || 'Failed to load feedback');
                    setLoading(false);
                    return;
                }

                // Handle both response structures
                const feedbackData = response.data?.data || response.data;
                
                if (!feedbackData) {
                    setError('Invalid feedback data received');
                    setLoading(false);
                    return;
                }

                setFeedback(feedbackData);
                setFormData({
                    response: feedbackData.response || '',
                    status: feedbackData.status || 'pending'
                });
            } catch (err) {
                setError(err.message || 'Failed to load feedback');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchFeedback();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await updateFeedback(id, formData);

            if (!response.success) {
                setError(response.error || 'Failed to update feedback');
                return;
            }

            // Handle both response structures
            const updatedFeedback = response.data?.data?.feedback || response.data?.feedback;
            
            if (!updatedFeedback) {
                setError('Invalid response after update');
                return;
            }

            setFeedback(updatedFeedback);
            setEditing(false);
            
            // Handle email status
            const emailStatus = response.data?.data?.emailStatus || 
                               response.data?.emailStatus || 
                               (response.data?.data?.feedback?.emailError ? 'failed' : 'sent');
            
            if (emailStatus === 'failed') {
                setError('Feedback updated but email failed to send. Please check server logs.');
            } else {
                setError('');
                alert('Feedback updated successfully! ' + 
                    (emailStatus === 'sent' ? 'Email sent to customer.' : ''));
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAction = async (action) => {
        try {
            setLoading(true);
            const update = {
                status: action === 'resolve' ? 'resolved' : 'archived'
            };

            const response = await updateFeedback(id, update);
            if (!response.success) {
                setError(response.error);
                return;
            }

            // Handle both response structures
            const updatedFeedback = response.data?.data?.feedback || response.data?.feedback || response.data;
            
            if (updatedFeedback) {
                setFeedback(prev => ({ ...prev, ...updatedFeedback }));
                setFormData(prev => ({ ...prev, status: update.status }));
            }
        } catch (err) {
            setError(err.message || 'Failed to perform action');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !feedback) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" />
            </div>
        );
    }

    if (!feedback) {
        return <Alert variant="danger">Feedback not found</Alert>;
    }

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-white border-0">
                <Button variant="link" onClick={() => navigate(-1)} className="me-2">
                    <FiArrowLeft /> Back
                </Button>
                <span className="h5">Feedback Details</span>
            </Card.Header>

            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                <Row>
                    <Col md={6}>
                        <div className="mb-4">
                            <h5>{feedback.customerName}</h5>
                            <p className="text-muted">{feedback.email}</p>

                            <div className="d-flex align-items-center mb-3">
                                <span className="me-2">Rating:</span>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={i < feedback.rating ? 'text-warning' : 'text-muted'}>★</span>
                                ))}
                            </div>

                            <div className="mb-3">
                                <Badge bg={
                                    feedback.feedbackType === 'compliment' ? 'success' :
                                    feedback.feedbackType === 'complaint' ? 'danger' : 'info'
                                }>
                                    {feedback.feedbackType}
                                </Badge>
                                {' '}
                                <Badge bg={
                                    feedback.status === 'pending' ? 'warning' :
                                    feedback.status === 'resolved' ? 'success' : 'secondary'
                                }>
                                    {feedback.status}
                                </Badge>
                            </div>

                            <p className="text-muted">
                                <small>Visited on: {new Date(feedback.visitDate).toLocaleDateString()}</small>
                            </p>
                        </div>

                        <div className="mb-4">
                            <h6>Feedback Message</h6>
                            <div className="p-3 bg-light rounded">
                                {feedback.message}
                            </div>
                        </div>
                    </Col>

                    <Col md={6}>
                        {editing ? (
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Status</Form.Label>
                                    <Form.Select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        disabled={loading}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="archived">Archived</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Response</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={5}
                                        name="response"
                                        value={formData.response}
                                        onChange={handleChange}
                                        placeholder="Enter your response to the customer..."
                                        disabled={loading}
                                    />
                                </Form.Group>

                                <div className="d-flex gap-2">
                                    <Button 
                                        variant="primary" 
                                        type="submit" 
                                        disabled={loading}
                                    >
                                        {loading ? <Spinner size="sm" /> : 'Save Changes'}
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => setEditing(false)}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </Form>
                        ) : (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6>Your Response</h6>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => setEditing(true)}
                                        disabled={loading}
                                    >
                                        <FiEdit /> Edit
                                    </Button>
                                </div>

                                {feedback.response ? (
                                    <div className="p-3 bg-light rounded mb-4">
                                        {feedback.response}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-light rounded mb-4 text-muted">
                                        No response yet
                                    </div>
                                )}

                                <div className="d-flex gap-2">
                                    <Button
                                        variant="success"
                                        onClick={() => handleQuickAction('resolve')}
                                        disabled={loading || feedback.status === 'resolved'}
                                    >
                                        <FiCheck /> Mark as Resolved
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleQuickAction('archive')}
                                        disabled={loading || feedback.status === 'archived'}
                                    >
                                        <FiArchive /> Archive
                                    </Button>
                                </div>
                            </>
                        )}
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};

export default FeedbackDetails;