const getFullUrl = (filename) => {
  if (!filename) return null;
  
  if (filename.startsWith('http')) {
    return filename;
  }

 return `${process.env.BASE_URL}/uploads/employees/${filename}`;
};

module.exports = { getFullUrl };