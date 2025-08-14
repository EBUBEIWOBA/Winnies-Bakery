import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button, Spinner, Alert, Badge, Container } from 'react-bootstrap';
import { FiArrowLeft, FiClock } from 'react-icons/fi';
import { getStockMovementHistory } from '../api/stockApi';

const StockHistory = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);

 useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Validate ID format
        if (!itemId || !/^[0-9a-fA-F]{24}$/.test(itemId)) {
          throw new Error("Invalid item ID format");
        }
        
        const response = await getStockMovementHistory(itemId);
        
        // Use the correct response structure
        setMovements(response.movements);
        setItem(response.item);
        
      } catch (err) {
        setError(err.message || 'Failed to load movement history');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [itemId]); // Use itemId as dependency


  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading movement history...</p>
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

      {error ? (
        <Alert variant="danger">{error}</Alert>
      ) : item ? (
        <>
          <h3 className="d-flex align-items-center gap-2 mb-4">
            <FiClock /> Movement History: {item.name}
          </h3>
          
          {movements.length === 0 ? (
            <Alert variant="info">No movements recorded for this item</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Recorded By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement._id}>
                    <td>{new Date(movement.date).toLocaleString()}</td>
                    <td>
                      <Badge 
                        bg={
                          movement.type === 'purchase' ? 'success' : 
                          movement.type === 'adjustment' ? 'info' : 'danger'
                        }
                      >
                        {movement.type}
                      </Badge>
                    </td>
                    <td>
                      {movement.type === 'purchase' || movement.type === 'adjustment' ? '+' : '-'}
                      {movement.quantity} {item.unit}
                    </td>
                    <td>{movement.staff}</td>
                    <td>{movement.notes}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      ) : (
        <Alert variant="danger">Item not found</Alert>
      )}
    </Container>
  );
};

export default StockHistory;