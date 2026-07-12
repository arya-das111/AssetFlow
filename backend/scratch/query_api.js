const fetch = require('node-fetch'); // wait, node-fetch might not be installed, we can just use prisma directly or use standard http request

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/bookings?resourceId=12',
  method: 'GET',
  headers: {
    // We need a token. We can query the database directly or inspect bookings.js query parsing.
  }
};
