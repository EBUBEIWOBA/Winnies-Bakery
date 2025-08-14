import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaFacebook, FaInstagram, FaMapMarkerAlt, FaPhone, FaEnvelope, FaClock } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="bg-dark text-white pt-5 pb-3">
            <Container>
                <Row className="g-4">
                    {/* Quick Links Column - Moved first for mobile */}
                    <Col md={6} lg={3} className="order-2 order-md-1">
                        <h5 className="footer-heading mb-3">Quick Links</h5>
                        <ul className="footer-list">
                            <li><Link to="/home" className="footer-link">Home</Link></li>
                            <li><Link to="/menu" className="footer-link">Menu</Link></li>
                            <li><Link to="/bestsellers" className="footer-link">Our Story</Link></li>
                            <li><Link to="/contact" className="footer-link">Contact</Link></li>
                        </ul>
                    </Col>

                    {/* Contact Info Column */}
                    <Col md={6} lg={4} className="order-1 order-md-2">
                        <h5 className="footer-heading mb-3">Visit Us</h5>
                        <ul className="footer-list">
                            <li className="footer-contact-item">
                                <FaMapMarkerAlt className="footer-icon" />
                                <span>123 Bakery Street, Aguleri, Anambra State</span>
                            </li>
                            <li className="footer-contact-item">
                                <FaPhone className="footer-icon" />
                                <a href="tel:+2348123456789" className="footer-link">+234 812 345 6789</a>
                            </li>
                            <li className="footer-contact-item">
                                <FaEnvelope className="footer-icon" />
                                <a href="mailto:hello@winniesbakery.com" className="footer-link">hello@winniesbakery.com</a>
                            </li>
                            <li className="footer-contact-item">
                                <FaClock className="footer-icon" />
                                <span>Mon-Sat: 8am - 9pm | Sun: 9am - 10pm</span>
                            </li>
                        </ul>
                    </Col>

                    {/* Social Media Column */}
                    <Col md={6} lg={3} className="order-3">
                        <h5 className="footer-heading mb-3">Follow Us</h5>
                        <p className="footer-text mb-3">
                            Stay connected for daily bread specials and updates
                        </p>
                        <div className="social-icons">
                            <a href="https://facebook.com/winniesbakery" className="social-icon" aria-label="Facebook">
                                <FaFacebook size={20} />
                            </a>
                            <a href="https://instagram.com/winniesbakery" className="social-icon" aria-label="Instagram">
                                <FaInstagram size={20} />
                            </a>
                        </div>
                    </Col>

                    {/* Delivery Info Column */}
                    <Col md={6} lg={2} className="order-4">
                        <h5 className="footer-heading mb-3">Delivery</h5>
                        <ul className="footer-list">
                            <li>Anambra State</li>
                            <li>Neighboring Towns</li>                           
                        </ul>
                    </Col>
                </Row>

                <hr className="footer-divider mt-4 mb-3" />

                {/* Copyright Row */}
                <Row className="align-items-center">
                    <Col xs={12} md={6} className="order-2 order-md-1 text-center text-md-start mb-2 mb-md-0">
                        <p className="footer-copyright">
                            &copy; {new Date().getFullYear()} Winnie's Bakery. All rights reserved.
                        </p>
                    </Col>
                    <Col xs={12} md={6} className="order-1 order-md-2 text-center text-md-end">
                        <p className="footer-credit">
                            Freshly baked with ❤️ in Aguleri
                        </p>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
};

export default Footer;