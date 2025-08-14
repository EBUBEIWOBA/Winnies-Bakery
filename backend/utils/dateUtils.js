// Create a new helper file
const moment = require('moment-timezone');

module.exports = {
  getNigeriaDate: () => {
    return moment().tz('Africa/Lagos');
  },
  formatForDB: (date) => {
    return moment(date).tz('Africa/Lagos').format();
  }
};