import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FiMail, FiPhone, FiMapPin, FiClock } from 'react-icons/fi';
import './Contact.css';

const Contact = () => {
  return (
    <Container className="contact-page py-4 py-md-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-4 mb-md-5"
      >
        <h2 className="display-5 fw-bold mb-2">Contact Us</h2>
        <p className="lead mb-0">Get in touch with the sweetest bakery in Aguleri</p>
      </motion.div>

      <Row className="g-3 g-md-4 justify-content-center">
        <Col lg={8} xl={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="contact-info p-3 p-md-4 rounded shadow-sm"
          >
            <h3 className="mb-3 mb-md-4 fw-bold">Our Information</h3>
            
            <div className="contact-item mb-3 mb-md-4">
              <div className="icon-box">
                <FiMail className="contact-icon" />
              </div>
              <div>
                <h5 className="fw-bold mb-1">Email</h5>
                <a href="mailto:winniesfoods20@gmail.com" className="text-decoration-none">
                  winniesfoods20@gmail.com
                </a>
              </div>
            </div>
            
            <div className="contact-item mb-3 mb-md-4">
              <div className="icon-box">
                <FiPhone className="contact-icon" />
              </div>
              <div>
                <h5 className="fw-bold mb-1">Phone</h5>
                <div className="d-flex flex-column">
                  <a href="tel:+23407049102333" className="text-decoration-none mb-1">
                    (234) 07049102333
                  </a>
                  <a href="tel:+23407048381001" className="text-decoration-none">
                    (234) 07048381001
                  </a>
                </div>
              </div>
            </div>
            
            <div className="contact-item mb-3 mb-md-4">
              <div className="icon-box">
                <FiMapPin className="contact-icon" />
              </div>
              <div>
                <h5 className="fw-bold mb-1">Location</h5>
                <p className="mb-0">No. 3 Adani Road, Aguleri Junction, Aguleri, Anambra state.</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="d-flex align-items-center mb-2">
                <FiClock className="me-2" style={{ color: '#FF6B01' }} />
                <h5 className="fw-bold mb-0">Opening Hours</h5>
              </div>
              <div className="ps-4">
                <p className="mb-1">Monday - Friday: 8:00 AM - 9:00 PM</p>
                <p className="mb-1">Saturday: 9:00 AM - 10:00 PM</p>
                <p className="mb-0">Sunday: 9:00 AM - 10:00 PM</p>
              </div>
            </div>
          </motion.div>
        </Col>
      </Row>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center mt-4 mt-md-5"
      >
        <p className="mb-2">For feedback or questions about our products, please use our Feedback form.</p>
        <a href="/feedback" className="btn btn-sm" style={{
          background: '#FF6B01',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px'
        }}>
          Go to Feedback Form
        </a>
      </motion.div>
    </Container>
  );
};

export default Contact;