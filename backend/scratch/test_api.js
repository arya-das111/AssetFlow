const request = require('supertest');
const app = require('../src/server');

async function run() {
  const resLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@assetflow.com', password: '2006' });
  const token = resLogin.body.token;

  const res12 = await request(app)
    .get('/api/bookings?resourceId=12')
    .set('Authorization', `Bearer ${token}`);
  console.log('Bookings for resourceId 12 count:', res12.body.length);
  res12.body.forEach(b => {
    console.log(`  ID: ${b.id}, ResourceID: ${b.resourceId}, Name: ${b.resource.name}`);
  });

  const res13 = await request(app)
    .get('/api/bookings?resourceId=13')
    .set('Authorization', `Bearer ${token}`);
  console.log('Bookings for resourceId 13 count:', res13.body.length);
  res13.body.forEach(b => {
    console.log(`  ID: ${b.id}, ResourceID: ${b.resourceId}, Name: ${b.resource.name}`);
  });
}

run().catch(console.error);
