const asyncHandler = (fn) => {
  if (typeof fn !== 'function') {
    throw new Error('asyncHandler requires a function as argument');
  }
  
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.error(`Async Error: ${error.message}`);
      console.error(error.stack);
      
      if (!res.headersSent) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          message: error.message || 'Internal Server Error'
        });
      }
    }
  };
};

module.exports = asyncHandler;