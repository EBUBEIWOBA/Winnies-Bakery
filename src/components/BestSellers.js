import React from 'react';
import Slider from 'react-slick';
import { Container, Row, Col, Image } from 'react-bootstrap';
import { motion } from 'framer-motion';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
// Images
import sausageImg from '../assets/sausage.jpg';
import spaghattiImg from '../assets/spaghetti.jpg';
import meatPieImg from '../assets/meat-pie.jpg';
import breadImg from '../assets/bread.jpg';
import bread2Img from '../assets/bread2.jpg';
import cake1Img from '../assets/cake1.jpg';
import cake2Img from '../assets/cake2.jpg';
import cake3Img from '../assets/cake4.jpg';
import chocakeImg from '../assets/chocake.jpg';
import donutImg from '../assets/donut.jpg';
import bonceImg from '../assets/kavita-joshi.jpg';
import lemoncakeImg from '../assets/lemoncake.jpg';
import riceandstewImg from '../assets/rice-and-stew.jpg';
import cupcakeImg from '../assets/cupcake.jpg';
import cupcake2Img from '../assets/cupcake2.jpg';
import shawarmaImg from '../assets/shawarma.jpg';
import chefImg from '../assets/chef.jpg';

const items = [
  { img: shawarmaImg, title: 'Shawarma', desc: 'Juicy chicken or beef wrapped in soft bread with fresh veggies', price: 3500 },
  { img: breadImg, title: 'French Baguette', desc: 'Crusty outside, fluffy inside — perfect for sandwiches', price: 2500 },
  { img: bonceImg, title: 'Fruit Glazed Bun', desc: 'Sweet, colorful, and irresistible breakfast delight', price: 1800 },
  { img: sausageImg, title: 'Sausage Rolls', desc: 'Savory and flaky, a customer favorite!', price: 2700 },
  { img: meatPieImg, title: 'Nigerian Meat Pie', desc: 'Filled with spicy beef and veggies', price: 3000 },
  { img: donutImg, title: 'Sugar-Glazed Donuts', desc: 'Sweet, soft, and perfect with tea or coffee', price: 1500 },
  { img: cake3Img, title: 'Strawberry Cake', desc: 'Topped with fresh berries and whipped cream', price: 12000 },
  { img: cake1Img, title: 'Vanilla Layer Cake', desc: 'Rich vanilla sponge with buttercream frosting', price: 11000 },
  { img: lemoncakeImg, title: 'Zesty Lemon Cake', desc: 'Tangy, moist, and refreshing tropical flavor', price: 10500 },
  { img: cupcakeImg, title: 'Vanilla Cupcake', desc: 'Topped with creamy vanilla frosting', price: 1400 },
  { img: cupcake2Img, title: 'Sprinkle Cupcake', desc: 'A colorful party in every bite!', price: 1500 },
  { img: chocakeImg, title: 'Chocolate Swirl Bread', desc: 'Rich chocolate layered in soft bread', price: 3400 },
  { img: cake2Img, title: 'Chocolate Fudge Cake', desc: 'Deep, rich, and indulgent chocolate experience', price: 13500 },
  { img: spaghattiImg, title: 'Spaghetti Bolognese', desc: 'Hearty pasta with our special meaty sauce', price: 5200 },
  { img: riceandstewImg, title: 'Rice & Stew', desc: 'Classic Nigerian comfort food made with love', price: 4800 },
];

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const BestSellers = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 600,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 2,
          arrows: false
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          arrows: false,
          centerMode: true,
          centerPadding: '15px'
        }
      },
    ],
  };

  return (
    <section className="best-sellers-section py-5">
      <Container>
        {/* Best Sellers Carousel */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-center mb-3 fw-bold" style={{ color: '#FF6B01' }}>Customer Favorites</h2>
          <p className="text-center mb-4 lead">
            Freshly baked delights that keep Aguleri coming back for more
          </p>
        </motion.div>

        <div className="best-seller-slider mb-5">
          <Slider {...settings}>
            {items.map((item, index) => (
              <motion.div
                key={index}
                className="px-2"
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="best-seller-card mb-3 position-relative overflow-hidden rounded-3 shadow-sm">
                  <Image
                    src={item.img}
                    alt={item.title}
                    className="w-100"
                    style={{
                      height: '200px',
                      objectFit: 'cover',
                    }}
                  />
                  <div className="p-3">
                    <h4 className="mb-1">{item.title}</h4>
                    <p className="text-muted small mb-2">{item.desc}</p>
                    <p className="fw-bold text-primary">₦{item.price.toLocaleString('en-NG')}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </Slider>
        </div>

        {/* Our Story Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="about-section py-5 rounded-4"
          style={{
            background: 'linear-gradient(to bottom, #fff9f5, #fff)',
            border: '1px solid rgba(255,107,1,0.1)'
          }}
        >
          <Container>
            {/* Section Header */}
            <div className="text-center mb-5">
              <h2 className="section-title display-5 fw-bold mb-3" style={{ color: '#FF6B01' }}>
                Our Story
              </h2>
              <p className="lead mx-auto" style={{ maxWidth: '700px', color: '#5a5a5a' }}>
                At Winnie's Bakery, every bite tells a story. warm, fresh, and made with love. From a small Aguleri kitchen to Anambra's favorite bakery
              </p>
            </div>

            {/* Story Row */}
            <Row className="align-items-center g-4 mb-5">
              <Col lg={6}>
                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Image
                    src={bread2Img}
                    fluid
                    rounded
                    className="shadow-lg"
                    alt="Bakery interior"
                    style={{
                      borderRadius: '15px',
                      border: '5px solid white'
                    }}
                  />
                </motion.div>
              </Col>

              <Col lg={6}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="fw-bold mt-4 mb-4" style={{ color: '#333' }}>
                    The Rise of Winnie's Bakery
                  </h3>

                  <div className="story-content">
                    <p className="mb-3" style={{ fontSize: '1.1rem', lineHeight: '1.7' }}>
                      Founded in 2021 in the heart of Aguleri, Winnie’s Bakery began as a small, passionate venture with a simple mission... delivering fresh, delicious bread to local shops. Guided by our founder Winnie’s dedication to quality and tradition, we quickly became a beloved household name across Anambra State. From our fleet of bakery trucks reaching every corner of the state to our evolution into a 5-star restaurant, we now serve not only our signature breads and pastries but also a world-class dining experience defined by flavor, comfort, and excellence.
                    </p>

                  </div>

                </motion.div>
              </Col>
            </Row>

            {/* Mission & Values */}
            <Row className="g-4 mt-4">
              <Col lg={6} className="order-lg-2">
                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Image
                    src={chefImg}
                    fluid
                    rounded
                    className="shadow-lg w-100"
                    alt="Chef preparing dough"
                    style={{
                      height: '100%',
                      minHeight: '350px',
                      objectFit: 'cover',
                      border: '5px solid white',
                      borderRadius: '15px'
                    }}
                  />
                </motion.div>
              </Col>

              <Col lg={6} className="order-lg-1">
                <div
                  className="p-4 mb-4 rounded-3 shadow-sm"
                  style={{
                    background: 'white',
                    borderLeft: '4px solid #FF6B01'
                  }}
                >
                  <h3 className="fw-bold mt-4 mb-0" style={{ color: '#333' }}>
                    Our Mission
                  </h3>
                </div>
                <blockquote className="mb-0 fs-5" style={{ color: '#5a5a5a', fontStyle: 'italic' }}>
                  "To create unforgettable food experiences that bring people together,
                  using locally-sourced ingredients and time-tested recipes."
                </blockquote>

                <div className="row g-3">
                  {[
                    {
                      icon: '★',
                      title: 'Quality First',
                      text: 'We never compromise on ingredients or craftsmanship'
                    },
                    {
                      icon: '❤️',
                      title: 'Local Ingredients',
                      text: 'Supporting Anambra farmers and producers'
                    },
                    {
                      icon: '🌱',
                      title: 'Fresh Daily',
                      text: 'Nothing sits overnight - baked fresh each morning'
                    },
                    {
                      icon: '😊',
                      title: 'Community Focus',
                      text: 'We remember every customer by name'
                    }
                  ].map((item, index) => (
                    <Col md={6} key={index}>
                      <div className="h-100 p-3 rounded-3 shadow-sm bg-white">
                        <div className="d-flex">
                          <span className="me-3 fs-4" style={{ color: '#FF6B01' }}>
                            {item.icon}
                          </span>
                          <div>
                            <h5 className="fw-bold mb-1">{item.title}</h5>
                            <p className="mb-0 small">{item.text}</p>
                          </div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </div>
              </Col>
            </Row>
          </Container>
        </motion.div>
      </Container >
    </section >
  );
};

export default BestSellers;