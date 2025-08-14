const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000', // Your backend URL
      changeOrigin: true,
      ws: false, // Disable WebSocket
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ message: 'Proxy Error' });
      }
    })
  );
};
