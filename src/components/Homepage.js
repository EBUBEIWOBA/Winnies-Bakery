import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';

const Homepage = () => {
  return (
    <div className='hero-background'>
      <div className="overlay"></div>
      {/* Navbar with floating animation - moved higher */}
      <Navbar expand="lg" className="navbar-custom" variant="dark" >
        <Container className="py-1"> {/* Reduced padding */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Navbar.Brand as={Link} to="/" className='brand fs-2 fw-bold mb-0'>
              <span>WINNIE'S </span>
              <span className='name'>BAKERY</span>
            </Navbar.Brand>
          </motion.div>

          <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center">
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300 }}
                                className="nav-item-wrapper" // Added wrapper class

              >
                <Nav.Link
                  as={Link}
                  to="/menu"
                  className='text-light mx-3 fs-5 fw-medium py-1'
                >
                  Menu
                </Nav.Link>
              </motion.div>

              <motion.div
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Nav.Link
                  as={Link}
                  to="/contact"
                  className='text-light mx-3 fs-5 fw-medium py-1'
                >
                  Contact
                </Nav.Link>
              </motion.div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero content moved higher */}
      <Container className="text-center text-light position-relative hero-content" style={{ zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: {
              type: 'spring',
              damping: 10,
              stiffness: 100
            }
          }}
          className="py-5"
        >
          <motion.h1
            className="display-3 fw-bold mb-4"
            animate={{
              y: [0, -10, 0],
              transition: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            Welcome to <div className='brand'>WINNIE'S <span className='name'>BAKERY</span></div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="fs-3 mb-5 fst-italic"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Where taste meets excellence
          </motion.p>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              as={Link}
              to="/menu"
              size="lg"
              className='px-5 py-3 fw-bold mt-3'
              style={{
                borderRadius: '25px 0 25px 0',
                fontSize: '1.2rem',
                boxShadow: '0 4px 15px rgba(247, 135, 6, 0.3)',
                background: '#FF6B01',
                border: 'none',
              }}
            >
              Explore Our Menu
            </Button>
          </motion.div>
        </motion.div>
      </Container>

      <div className="custom-shape-divider-bottom-1745065100">
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" class="shape-fill"></path>
        </svg>
      </div>
    </div>
  )
}

export default Homepage;
