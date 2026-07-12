const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Add CHECK constraint on bookings table for start_time < end_time
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE bookings 
      ADD CONSTRAINT chk_time_order 
      CHECK (start_time < end_time);
    `);
    console.log('CHECK constraint chk_time_order created successfully.');
  } catch (error) {
    console.log('CHECK constraint chk_time_order already exists or failed:', error.message);
  }

  // 2. Clear existing records in order of dependency
  console.log('Clearing old data...');
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.maintenance.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.transfer.deleteMany({});
  await prisma.allocation.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.category.deleteMany({});
  
  // Set department head reference to null to avoid circular reference on delete
  await prisma.department.updateMany({ data: { headUserId: null } });
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  // 3. Create Categories
  console.log('Seeding Categories...');
  const catLaptops = await prisma.category.create({
    data: { name: 'Laptops', description: 'Company workstation laptops (Dell, MacBook, etc.)' }
  });
  const catMonitors = await prisma.category.create({
    data: { name: 'Monitors', description: 'External display screens' }
  });
  const catFurniture = await prisma.category.create({
    data: { name: 'Furniture', description: 'Desks, ergonomic chairs' }
  });
  const catVehicles = await prisma.category.create({
    data: { name: 'Vehicles', description: 'Logistics vans and company cars' }
  });
  const catMeetingRooms = await prisma.category.create({
    data: { name: 'Meeting Rooms', description: 'Internal collaborative workspaces' }
  });
  const catProjectors = await prisma.category.create({
    data: { name: 'Projectors', description: 'Portable or room-installed display projectors' }
  });

  // 4. Create Departments
  console.log('Seeding Departments...');
  const deptIT = await prisma.department.create({
    data: { name: 'Information Technology', code: 'IT' }
  });
  const deptEngineering = await prisma.department.create({
    data: { name: 'Engineering', code: 'ENG' }
  });
  const deptHR = await prisma.department.create({
    data: { name: 'Human Resources', code: 'HR' }
  });
  const deptOps = await prisma.department.create({
    data: { name: 'Operations', code: 'OPS' }
  });

  // 5. Create Users (Password: 2006)
  console.log('Seeding Users...');
  const passwordHash = bcrypt.hashSync('2006', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Aditya Rao (Admin)',
      email: 'admin@assetflow.com',
      passwordHash,
      role: 'Admin',
      departmentId: deptIT.id
    }
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Sarah Iqbal (Asset Manager)',
      email: 'manager@assetflow.com',
      passwordHash,
      role: 'AssetManager',
      departmentId: deptIT.id
    }
  });

  const head = await prisma.user.create({
    data: {
      name: 'Priya Shah (Dept Head)',
      email: 'head@assetflow.com',
      passwordHash,
      role: 'DepartmentHead',
      departmentId: deptEngineering.id
    }
  });

  const employee = await prisma.user.create({
    data: {
      name: 'Arjun Nair (Employee)',
      email: 'employee@assetflow.com',
      passwordHash,
      role: 'Employee',
      departmentId: deptEngineering.id
    }
  });

  const employee2 = await prisma.user.create({
    data: {
      name: 'Rohan Varma (Technician)',
      email: 'tech@assetflow.com',
      passwordHash,
      role: 'Employee',
      departmentId: deptIT.id
    }
  });

  // Update department heads
  await prisma.department.update({
    where: { id: deptIT.id },
    data: { headUserId: admin.id }
  });

  await prisma.department.update({
    where: { id: deptEngineering.id },
    data: { headUserId: head.id }
  });

  // 6. Create Assets (Physical & Bookable Resources)
  console.log('Seeding Assets...');
  
  // Physical Assets
  const assetLaptop1 = await prisma.asset.create({
    data: {
      assetCode: 'AF-0001',
      name: 'Dell XPS 15 (i7, 32GB RAM)',
      categoryId: catLaptops.id,
      location: 'HQ Floor 2',
      status: 'Allocated',
      bookable: false
    }
  });

  const assetLaptop2 = await prisma.asset.create({
    data: {
      assetCode: 'AF-0002',
      name: 'MacBook Pro 16" (M3 Max, 64GB RAM)',
      categoryId: catLaptops.id,
      location: 'HQ Floor 3',
      status: 'Available',
      bookable: false
    }
  });

  const assetChair = await prisma.asset.create({
    data: {
      assetCode: 'AF-0003',
      name: 'Herman Miller Aeron Ergonomic Chair',
      categoryId: catFurniture.id,
      location: 'HQ Floor 2 (Engineering Dept)',
      status: 'Allocated',
      bookable: false
    }
  });

  const assetCar = await prisma.asset.create({
    data: {
      assetCode: 'AF-0004',
      name: 'Tesla Model 3 (Company Vehicle)',
      categoryId: catVehicles.id,
      location: 'Basement Parking Slot B4',
      status: 'UnderMaintenance',
      bookable: false
    }
  });

  // Bookable Resources (Assets with bookable: true)
  const roomB1 = await prisma.asset.create({
    data: {
      assetCode: 'AF-0101',
      name: 'Conference Room B1 (12-Seater)',
      categoryId: catMeetingRooms.id,
      location: 'HQ Floor 1',
      status: 'Available',
      bookable: true
    }
  });

  const roomB2 = await prisma.asset.create({
    data: {
      assetCode: 'AF-0102',
      name: 'Boardroom B2 (Board of Directors)',
      categoryId: catMeetingRooms.id,
      location: 'HQ Floor 4',
      status: 'Available',
      bookable: true
    }
  });

  const projector = await prisma.asset.create({
    data: {
      assetCode: 'AF-0103',
      name: 'Epson Pro 4K Projector (Portable)',
      categoryId: catProjectors.id,
      location: 'IT Storage Cabinet B',
      status: 'Available',
      bookable: true
    }
  });

  // 7. Seeding Allocations
  console.log('Seeding Allocations...');
  // Laptop 1 allocated to Employee Arjun Nair
  await prisma.allocation.create({
    data: {
      assetId: assetLaptop1.id,
      employeeId: employee.id,
      departmentId: deptEngineering.id,
      allocatedDate: new Date('2026-07-01'),
      expectedReturnDate: new Date('2026-12-31'),
      status: 'active'
    }
  });

  // Aeron Chair allocated to Dept Head Priya Shah
  await prisma.allocation.create({
    data: {
      assetId: assetChair.id,
      employeeId: head.id,
      departmentId: deptEngineering.id,
      allocatedDate: new Date('2026-06-15'),
      expectedReturnDate: new Date('2027-06-15'),
      status: 'active'
    }
  });

  // Past allocation that has been returned
  const returnedAlloc = await prisma.allocation.create({
    data: {
      assetId: assetLaptop2.id,
      employeeId: employee.id,
      departmentId: deptEngineering.id,
      allocatedDate: new Date('2026-01-10'),
      expectedReturnDate: new Date('2026-06-10'),
      actualReturnDate: new Date('2026-06-08'),
      returnCondition: 'Excellent condition, fresh install of OS completed.',
      status: 'returned'
    }
  });

  // 8. Seeding Bookings (Meeting Rooms)
  console.log('Seeding Bookings...');
  
  // Set up dates
  const today = new Date();
  today.setHours(0,0,0,0);

  const booking1Start = new Date(today);
  booking1Start.setHours(9, 0, 0, 0); // 9:00 AM
  const booking1End = new Date(today);
  booking1End.setHours(10, 0, 0, 0); // 10:00 AM

  const booking2Start = new Date(today);
  booking2Start.setHours(11, 0, 0, 0); // 11:00 AM
  const booking2End = new Date(today);
  booking2End.setHours(13, 0, 0, 0); // 1:00 PM

  await prisma.booking.create({
    data: {
      resourceId: roomB1.id,
      bookedById: head.id,
      startTime: booking1Start,
      endTime: booking1End,
      status: 'confirmed'
    }
  });

  await prisma.booking.create({
    data: {
      resourceId: roomB1.id,
      bookedById: employee.id,
      startTime: booking2Start,
      endTime: booking2End,
      status: 'confirmed'
    }
  });

  // 9. Seeding Maintenance Requests
  console.log('Seeding Maintenance...');
  
  // Active Maintenance
  await prisma.maintenance.create({
    data: {
      assetId: assetCar.id,
      raisedById: employee.id,
      issueDescription: 'Car engine light is on. Oil change and diagnostic service required.',
      status: 'InProgress',
      technicianAssigned: 'Local Tesla Service Center',
      approvedById: manager.id
    }
  });

  // Resolved Maintenance
  const maintenanceResolved = await prisma.maintenance.create({
    data: {
      assetId: assetLaptop2.id,
      raisedById: employee.id,
      issueDescription: 'Laptop screen flickers occasionally.',
      status: 'Resolved',
      technicianAssigned: 'Rohan Varma (Technician)',
      approvedById: manager.id,
      resolvedAt: new Date()
    }
  });

  // 10. Seeding Notifications
  console.log('Seeding Notifications...');
  await prisma.notification.create({
    data: {
      userId: employee.id,
      type: 'info',
      message: `Asset Dell XPS 15 (AF-0001) has been successfully allocated to you.`,
      isRead: false
    }
  });

  await prisma.notification.create({
    data: {
      userId: head.id,
      type: 'booking',
      message: `Your booking for Conference Room B1 (9:00 AM - 10:00 AM) is confirmed.`,
      isRead: true
    }
  });

  await prisma.notification.create({
    data: {
      userId: manager.id,
      type: 'maintenance',
      message: `New maintenance ticket raised by Arjun Nair for Tesla Model 3 (AF-0004).`,
      isRead: false
    }
  });

  console.log('Database seeding completed successfully!');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Error during seeding:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = main;
