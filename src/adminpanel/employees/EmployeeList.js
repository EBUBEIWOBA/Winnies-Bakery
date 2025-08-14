import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Spinner, Alert, InputGroup, FormControl, Badge, Modal } from 'react-bootstrap';
import { FiUser, FiEdit, FiTrash2, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import employeeApi from '../api/employeeApi';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await employeeApi.getEmployees();
        setEmployees(response || []);
      } catch (err) {
        setError('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEmployees = employees.filter(employee => {
    const searchStr = `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.position}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const handleDelete = async () => {
    try {
      await employeeApi.deleteEmployee(employeeToDelete._id);
      setEmployees(prev => prev.filter(e => e._id !== employeeToDelete._id));
      setShowDeleteModal(false);
    } catch (err) {
      setError('Failed to delete employee');
    }
  };

  if (loading) {
    return <div className="d-flex justify-content-center my-5"><Spinner animation="border" /></div>;
  }

  return (
    <div className="container py-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4>Employee Directory</h4>
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/panel/employees/profile/new')}>
            <FiPlus className="me-2" /> Add Employee
          </Button>
        </Card.Header>

        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <InputGroup className="mb-4">
            <InputGroup.Text><FiUser /></InputGroup.Text>
            <FormControl
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Salary (₦)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length > 0 ? filteredEmployees.map(employee => (
                  <tr key={employee._id}>
                    <td>
                      <div 
                        className="position-relative rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: '40px', 
                          height: '40px',
                          overflow: 'hidden'
                        }}
                      >
                        {employee.photo ? (
                          <img
                            src={employee.photo}
                            alt={`${employee.firstName} ${employee.lastName}`}
                            className="w-100 h-100"
                            style={{ 
                              objectFit: 'cover',
                              position: 'absolute',
                              top: 0,
                              left: 0
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <FiUser className="text-secondary" />
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold">{employee.firstName} {employee.lastName}</div>
                      <div className="text-muted small">{employee.email}</div>
                    </td>
                    <td>{employee.position}</td>
                    <td className="text-capitalize">{employee.department}</td>
                    <td>
                      {employee.salary ? `₦${Number(employee.salary).toLocaleString()}` : 'Not set'}
                    </td>
                    <td>
                      <Badge bg={
                        employee.status === 'active' ? 'success' :
                          employee.status === 'inactive' ? 'secondary' :
                            employee.status === 'on leave' ? 'warning' : 'danger'
                      }>
                        {employee.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="me-2"
                          onClick={() => navigate(`/admin/panel/employees/profile/${employee._id}`)}
                        >
                          <FiEdit />
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => {
                            setEmployeeToDelete(employee);
                            setShowDeleteModal(true);
                          }}
                        >
                          <FiTrash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      {searchTerm ? 'No matching employees' : 'No employees available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete {employeeToDelete?.firstName} {employeeToDelete?.lastName}?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmployeeList;