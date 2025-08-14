import React, { useState, useEffect } from 'react';
import { 
  Container, Table, Button, Spinner, Alert, Badge, Row, Col
} from 'react-bootstrap';
import { 
  FiUser, FiEdit, FiTrash2, FiArrowLeft, FiPlus 
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { getAdmins } from './api/adminApi';

const AdminManager = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

 useEffect(() => {
  const fetchAdmins = async () => {
    try {
      const response = await getAdmins();
      setAdmins(response.data || []);  // Access data property
    } catch (err) {
      setError('Failed to load admin list');
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  };
  
  fetchAdmins();
}, []);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="primary" className="me-3" />
        <span>Loading admin list...</span>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="align-items-center mb-4">
        <Col md={6}>
          <Button 
            variant="outline-primary" 
            onClick={() => navigate(-1)} 
            className="d-flex align-items-center mb-3 mb-md-0"
          >
            <FiArrowLeft className="me-2" /> Back
          </Button>
        </Col>
        <Col md={6} className="text-md-end">
          <Button 
            variant="primary" 
            onClick={() => navigate('/admin/register')}
            className="d-flex align-items-center"
          >
            <FiPlus className="me-2" /> Create New Admin
          </Button>
        </Col>
      </Row>
      
      <h2 className="mb-4 d-flex align-items-center">
        <FiUser className="me-2" /> Admin Management
      </h2>
      
      {error && (
        <Alert variant="danger" className="mb-4">
          <strong>Error!</strong> {error}
        </Alert>
      )}
      
      {admins.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-3">
          <FiUser size={64} className="text-muted mb-3" />
          <h4>No Administrators Found</h4>
          <p className="text-muted mb-4">No admin accounts have been created yet</p>
          <Button 
            variant="primary" 
            onClick={() => navigate('/admin/register')}
            className="px-4"
          >
            <FiPlus className="me-2" /> Create First Admin
          </Button>
        </div>
      ) : (
        <Table striped bordered hover responsive className="admin-table bg-white">
          <thead className="bg-primary text-white">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Position</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => (
              <tr key={admin._id}>
                <td className="align-middle">{admin.firstName} {admin.lastName}</td>
                <td className="align-middle">{admin.email}</td>
                <td className="align-middle">{admin.position || 'System Administrator'}</td>
                <td className="align-middle">
                  <Badge 
                    bg={admin.status === 'active' ? 'success' : 'warning'} 
                    className="py-2 px-3 rounded-pill"
                  >
                    {admin.status || 'active'}
                  </Badge>
                </td>
                <td className="align-middle text-center">
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="me-2 d-inline-flex align-items-center"
                    onClick={() => navigate(`/admin/panel/profile`)}
                  >
                    <FiEdit className="me-1" /> Edit
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    className="d-inline-flex align-items-center"
                    onClick={() => console.log('Remove admin:', admin._id)}
                  >
                    <FiTrash2 className="me-1" /> Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default AdminManager;