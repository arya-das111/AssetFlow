const request = require('supertest');
const app = require('../src/server');
const prisma = require('../src/utils/db');

let authToken = '';
let employeeId = 0;
let departmentId = 0;
let availableAssetId = 0;
let allocatedAssetId = 0;
let bookableResourceId = 0;
let testCategoryId = 0;

beforeAll(async () => {
  // Let's log in as Admin to get a token and resource IDs for testing
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin@assetflow.com',
      password: '2006'
    });
  
  authToken = res.body.token;

  // Retrieve test IDs from the database
  const user = await prisma.user.findFirst({ where: { email: 'employee@assetflow.com' } });
  employeeId = user.id;
  departmentId = user.departmentId;

  // Retrieve Available asset
  const avAsset = await prisma.asset.findFirst({ where: { status: 'Available', bookable: false } });
  availableAssetId = avAsset.id;

  // Retrieve Allocated asset
  const alAsset = await prisma.asset.findFirst({ where: { status: 'Allocated', bookable: false } });
  allocatedAssetId = alAsset.id;

  // Retrieve Bookable resource
  const resRoom = await prisma.asset.findFirst({ where: { bookable: true } });
  bookableResourceId = resRoom.id;

  // Retrieve valid Category ID dynamically
  const category = await prisma.category.findFirst();
  testCategoryId = category.id;
});

afterAll(async () => {
  // Disconnect client
  await prisma.$disconnect();
});

describe('Asset Handover Conflict Detection APIs', () => {
  
  test('POST /api/allocations should allocate an available asset successfully', async () => {
    // We register a new asset first to avoid dirtying existing allocations in other tests
    const assetRes = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Allocation Laptop',
        categoryId: testCategoryId,
        location: 'Lab A'
      });
    
    const assetId = assetRes.body.id;

    const allocRes = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        assetId: assetId,
        employeeId: employeeId,
        departmentId: departmentId,
        allocatedDate: '2026-07-12',
        expectedReturnDate: '2026-12-12'
      });
    
    expect(allocRes.status).toBe(201);
    expect(allocRes.body.status).toBe('active');

    // Clean up created allocation to restore DB state
    await prisma.allocation.delete({ where: { id: allocRes.body.id } });
    await prisma.asset.delete({ where: { id: assetId } });
  });

  test('POST /api/allocations should reject double allocation on an already allocated asset with 409', async () => {
    const res = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        assetId: allocatedAssetId,
        employeeId: employeeId,
        departmentId: departmentId,
        allocatedDate: '2026-07-12',
        expectedReturnDate: '2026-12-12'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('currently allocated to');
  });
});

describe('Resource Booking Overlap Validation APIs', () => {
  
  test('POST /api/bookings should book a free time slot successfully', async () => {
    const startTime = new Date('2026-07-20T14:00:00.000Z').toISOString();
    const endTime = new Date('2026-07-20T15:00:00.000Z').toISOString();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        resourceId: bookableResourceId,
        startTime,
        endTime
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');

    // Clean up
    await prisma.booking.delete({ where: { id: res.body.id } });
  });

  test('POST /api/bookings should reject overlapping bookings on the same resource with 409', async () => {
    // 1. Create a confirmed booking
    const startTime1 = new Date('2026-07-20T15:00:00.000Z').toISOString();
    const endTime1 = new Date('2026-07-20T16:00:00.000Z').toISOString();

    const b1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        resourceId: bookableResourceId,
        startTime: startTime1,
        endTime: endTime1
      });

    expect(b1.status).toBe(201);

    // 2. Try to book an overlapping time (15:30 - 16:30)
    const startTime2 = new Date('2026-07-20T15:30:00.000Z').toISOString();
    const endTime2 = new Date('2026-07-20T16:30:00.000Z').toISOString();

    const b2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        resourceId: bookableResourceId,
        startTime: startTime2,
        endTime: endTime2
      });

    expect(b2.status).toBe(409);
    expect(b2.body.error).toContain('overlaps with an existing booking');

    // Clean up b1
    await prisma.booking.delete({ where: { id: b1.body.id } });
  });
});
