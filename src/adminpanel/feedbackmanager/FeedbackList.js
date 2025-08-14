import React, { useState, useEffect, useCallback } from 'react';
import { Table, Badge, Button, Spinner, Alert, InputGroup, Form, Row, Col,
    Card, Pagination, Dropdown } from 'react-bootstrap';
import { FiSearch, FiFilter, FiRefreshCw, FiMessageSquare, FiStar } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { getFeedbackList } from '../api/FeedbackApi';

const statusVariant = {
    pending: 'warning',
    resolved: 'success',
    archived: 'secondary'
};

const typeIcon = {
    compliment: <FiStar className="text-success" />,
    complaint: <FiMessageSquare className="text-danger" />,
    suggestion: <FiMessageSquare className="text-info" />
};

const FeedbackList = () => {
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        feedbackType: '',
        sort: '-createdAt'
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0
    });

    const fetchFeedback = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                ...filters,
                search: searchTerm,
                page: pagination.page,
                limit: pagination.limit
            };

            const response = await getFeedbackList(params);
            if (response.success) {
                setFeedback(response.data.feedback || []);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.total || 0
                }));
            } else {
                setError(response.error || 'Failed to fetch feedback');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }, [filters, searchTerm, pagination.page, pagination.limit]);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, page }));
    };

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-white border-0">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Customer Feedback</h5>
                    <Button
                        variant="primary"
                        onClick={fetchFeedback}
                        disabled={loading}
                        aria-label="Refresh feedback"
                    >
                        <FiRefreshCw className={loading ? 'spin' : ''} />
                    </Button>
                </div>
            </Card.Header>

            <Card.Body>
                {error && (
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}

                <Row className="mb-3">
                    <Col md={6}>
                        <InputGroup>
                            <InputGroup.Text>
                                <FiSearch />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search feedback..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={loading}
                                aria-label="Search feedback"
                            />
                        </InputGroup>
                    </Col>
                    <Col md={6} className="d-flex gap-2">
                        <Dropdown>
                            <Dropdown.Toggle
                                variant="outline-secondary"
                                disabled={loading}
                                aria-label="Filter by status"
                            >
                                <FiFilter /> {filters.status || 'All Status'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleFilterChange('status', '')}>All</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleFilterChange('status', 'pending')}>Pending</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleFilterChange('status', 'resolved')}>Resolved</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleFilterChange('status', 'archived')}>Archived</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>

                        <Dropdown>
                            <Dropdown.Toggle
                                variant="outline-secondary"
                                disabled={loading}
                                aria-label="Filter by type"
                            >
                                <FiFilter /> {filters.feedbackType || 'All Types'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleFilterChange('feedbackType', '')}>All</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleFilterChange('feedbackType', 'compliment')}>Compliments</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleFilterChange('feedbackType', 'complaint')}>Complaints</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleFilterChange('feedbackType', 'suggestion')}>Suggestions</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Col>
                </Row>

                {loading ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <Table striped hover>
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Type</th>
                                        <th>Rating</th>
                                        <th>Message</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feedback.length > 0 ? (
                                        feedback.map((item) => (
                                            <tr key={item._id}>
                                                <td>
                                                    <strong>{item.customerName}</strong>
                                                    <div className="text-muted small">{item.email}</div>
                                                </td>
                                                <td>
                                                    {typeIcon[item.feedbackType]} {item.feedbackType}
                                                </td>
                                                <td>
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <span
                                                            key={i}
                                                            className={i < item.rating ? 'text-warning' : 'text-muted'}
                                                            aria-label={`${i < item.rating ? 'Filled' : 'Empty'} star`}
                                                        >
                                                            ★
                                                        </span>
                                                    ))}
                                                </td>
                                                <td>
                                                    <div
                                                        className="text-truncate"
                                                        style={{ maxWidth: '200px' }}
                                                        title={item.message}
                                                    >
                                                        {item.message}
                                                    </div>
                                                </td>
                                                <td>
                                                    <Badge bg={statusVariant[item.status]}>
                                                        {item.status}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Link
                                                        to={`/admin/panel/feedback/${item._id}`}
                                                        className="btn btn-sm btn-outline-primary"
                                                    >
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4">
                                                No feedback found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>

                        {pagination.total > pagination.limit && (
                            <div className="d-flex justify-content-center mt-3">
                                <Pagination>
                                    {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }).map((_, i) => (
                                        <Pagination.Item
                                            key={i + 1}
                                            active={i + 1 === pagination.page}
                                            onClick={() => handlePageChange(i + 1)}
                                            disabled={loading}
                                            aria-label={`Go to page ${i + 1}`}
                                        >
                                            {i + 1}
                                        </Pagination.Item>
                                    ))}
                                </Pagination>
                            </div>
                        )}
                    </>
                )}
            </Card.Body>
        </Card>
    );
};

export default FeedbackList;