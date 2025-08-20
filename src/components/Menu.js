import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Navbar, Nav, NavDropdown, Row, Col, 
  Button, Card, Badge, Toast, Spinner, Alert,
  InputGroup, FormControl 
} from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { FiClock, FiShare2, FiSearch } from 'react-icons/fi';
import { FaWhatsapp, FaTwitter, FaRegHeart, FaHeart } from 'react-icons/fa';
import { RiInstagramFill } from 'react-icons/ri';
import ReactStars from "react-rating-stars-component";
import MenuApi from '../adminpanel/api/MenuApi';
import './Menu.css';

const Menu = () => {
  const { category } = useParams();
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const [activeCategory] = useState(category || 'all');

  const categories = ['Bakery', 'Food', 'Drink', 'Dessert', 'Special'];

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const items = await MenuApi.getAllMenuItems();
      setMenuItems(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRatingChange = async (itemId, userRating) => {
    try {
      await MenuApi.rateMenuItem(itemId, userRating);
      setToastMessage("Thanks for rating!");
      setShowToast(true);
      fetchData();
    } catch (error) {
      setToastMessage("Error submitting rating. Try again.");
      setShowToast(true);
    }
  };

  const toggleFavorite = (itemId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId);
      setToastMessage("Removed from favorites");
    } else {
      newFavorites.add(itemId);
      setToastMessage("Added to favorites!");
    }
    setFavorites(newFavorites);
    setShowToast(true);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !category || item.category?.toLowerCase() === category.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const categoryKey = item.category || 'Uncategorized';
    if (!acc[categoryKey]) {
      acc[categoryKey] = [];
    }
    acc[categoryKey].push(item);
    return acc;
  }, {});

  const formatPrice = (price) => `₦${Number(price).toFixed(2)}`;

  const generatePrepTime = () => {
    const times = ['5-10 mins', '10-15 mins', '15-20 mins', '20-25 mins', '25-30 mins'];
    return times[Math.floor(Math.random() * times.length)];
  };

  const shareItem = (platform, item) => {
    const message = `Check out ${item.name} at Winnie's Bakery! ${item.description}`;
    const url = `${window.location.origin}/menu/${item.category}/${item._id}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${message} ${url}`)}`, '_blank');
        break;
      case 'instagram':
        window.open('https://www.instagram.com/', '_blank');
        break;
      default:
        break;
    }
  };

  const MenuCard = ({ item }) => {
    const [imageError, setImageError] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);
    const imageUrl = item.image
      ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/menu/${item.image}`
      : '/placeholder-food.jpg';

    return (
      <Card className="h-100 shadow-sm menu-card">
        <div className="menu-card-img-container">
          <Card.Img
            variant="top"
            src={imageError ? '/placeholder-food.jpg' : imageUrl}
            alt={item.name}
            onError={() => setImageError(true)}
            loading="lazy"
            className="card-img"
          />

          <Button 
            variant="link" 
            className="position-absolute top-0 end-0 m-2 p-2 favorite-btn"
            onClick={() => toggleFavorite(item._id)}
          >
            {favorites.has(item._id) ? (
              <FaHeart className="text-danger" size={18} />
            ) : (
              <FaRegHeart className="text-white" size={18} />
            )}
          </Button>

          <Badge
            bg={item.availability === 'Sold Out' ? 'danger' : 'success'}
            className="position-absolute top-0 start-0 m-2"
          >
            {item.availability || 'In Stock'}
          </Badge>

          <Button
            variant="light"
            className="position-absolute bottom-0 end-0 m-2 p-2 rounded-circle share-btn"
            onClick={() => setShowShareOptions(!showShareOptions)}
          >
            <FiShare2 size={14} />
          </Button>

          {showShareOptions && (
            <div className="share-options position-absolute bottom-0 end-0 mb-5 me-2 p-2 bg-white rounded shadow">
              <Button variant="link" className="text-success p-1" onClick={() => shareItem('whatsapp', item)}>
                <FaWhatsapp size={18} />
              </Button>
              <Button variant="link" className="text-danger p-1" onClick={() => shareItem('instagram', item)}>
                <RiInstagramFill size={18} />
              </Button>
              <Button variant="link" className="text-primary p-1" onClick={() => shareItem('twitter', item)}>
                <FaTwitter size={18} />
              </Button>
            </div>
          )}
        </div>

        <Card.Body className="d-flex flex-column p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <Card.Title className="mb-0 card-title">{item.name}</Card.Title>
            <div className="rating-container">
              <ReactStars
                count={5}
                value={item.rating || 0}
                size={16}
                activeColor="#ffd700"
                onChange={(newRating) => handleRatingChange(item._id, newRating)}
              />
              <small className="text-muted rating-text">
                {item.rating?.toFixed(1) || "0.0"} ({item.ratingCount || 0})
              </small>
            </div>
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="mb-2 tags-container">
              {item.tags.map(tag => (
                <Badge key={tag} bg="info" className="me-1 tag-badge">{tag}</Badge>
              ))}
            </div>
          )}

          <Card.Text className="text-muted flex-grow-1 card-description">
            {item.description || 'No description available'}
          </Card.Text>

          <div className="d-flex justify-content-between align-items-center mt-2">
            <div>
              <h5 className="text-primary mb-0 card-price">{formatPrice(item.price)}</h5>
              <small className="text-muted prep-time">
                <FiClock className="me-1" size={12} />
                {generatePrepTime()}
              </small>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div className='page-content menu-page'>
      <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide className="position-fixed top-0 end-0 m-3">
        <Toast.Header closeButton={false}>
          <strong className="me-auto">Notification</strong>
        </Toast.Header>
        <Toast.Body>{toastMessage}</Toast.Body>
      </Toast>

      <Navbar expand="lg" className="navbar-menu sticky-top">
        <Container>
          <Navbar.Brand as={Link} to="/" className='brand'>
            WINNIE'S <span className='name'>BAKERY</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <NavDropdown title="Menu Categories" className="menu-category-dropdown">
                <NavDropdown.Item as={Link} to="/menu">All Items</NavDropdown.Item>
                {categories.map(cat => (
                  <NavDropdown.Item 
                    key={cat} 
                    as={Link} 
                    to={`/menu/${cat.toLowerCase()}`}
                    active={activeCategory === cat.toLowerCase()}
                  >
                    {cat}
                  </NavDropdown.Item>
                ))}
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="mt-4 menu-container">
        {/* Header Section */}
        <div className="menu-header mb-4">
          <h1 className="menu-title">
            {category ? `${category} Menu` : "Our Full Menu"}
          </h1>
          <p className="menu-subtitle">
            {category
              ? `Discover our exquisite ${category.toLowerCase()} selection`
              : "Indulge in our artisanal bakery items, gourmet meals, and crafted beverages"}
          </p>
        </div>

        {/* Search and Category Filter */}
        <div className="menu-controls mb-4">
          <div className="category-tabs mb-3">
            <div className="d-flex flex-wrap gap-2">
              <Button
                variant={!category ? "primary" : "outline-primary"}
                as={Link}
                to="/menu"
                size="sm"
                className="rounded-pill"
              >
                All
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={category === cat.toLowerCase() ? "primary" : "outline-primary"}
                  as={Link}
                  to={`/menu/${cat.toLowerCase()}`}
                  size="sm"
                  className="rounded-pill"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="search-container">
            <InputGroup className="search-bar">
              <FormControl
                placeholder="Search our menu..."
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
                className="search-input"
              />
              <Button variant="primary" className="search-button">
                <FiSearch size={18} />
              </Button>
            </InputGroup>
          </div>
        </div>

        {/* Loading and Error States */}
        {isLoading && (
          <div className="text-center py-5 loading-spinner">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading our delicious menu...</p>
          </div>
        )}

        {error && (
          <Alert variant="danger" className="my-4 error-alert" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {/* Menu Items */}
        {!isLoading && !error && (
          <>
            {category ? (
              <Row xs={1} sm={2} md={3} lg={4} className="g-4 menu-items-grid">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <Col key={item._id}>
                      <MenuCard item={item} />
                    </Col>
                  ))
                ) : (
                  <div className="text-center py-5 no-items">
                    <h4>No items found</h4>
                    <p>Try a different search or browse our other categories</p>
                  </div>
                )}
              </Row>
            ) : (
              Object.keys(itemsByCategory).length > 0 ? (
                Object.entries(itemsByCategory).map(([category, items]) => (
                  <div key={category} className="category-section mb-5">
                    <h2 className="category-title mb-3">{category}</h2>
                    <Row xs={1} sm={2} md={3} lg={4} className="g-4">
                      {items.map((item) => (
                        <Col key={item._id}>
                          <MenuCard item={item} />
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))
              ) : (
                <div className="text-center py-5 no-items">
                  <h4>No menu items available</h4>
                  <p>We're preparing something special. Please check back soon!</p>
                </div>
              )
            )}
          </>
        )}
      </Container>
    </div>
  );
};

export default Menu;