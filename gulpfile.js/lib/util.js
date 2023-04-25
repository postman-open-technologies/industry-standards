const log = require('fancy-log');

module.exports = {
  logger: (...args) => {
    if (process.env.NODE_ENV !== 'test') {
      log(...args);
    }
  },
};
