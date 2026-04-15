import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E tests for the Bookhou API.
 *
 * These tests require a running PostgreSQL database.
 * Set DATABASE_URL env var to a test database before running.
 *
 * Run with: npm run test:e2e
 */
describe('Bookhou API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  let testBusinessId: string;
  let testLocationId: string;
  let testPackageId: string;
  let testRoomId: string;
  let testPartyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    if (testPartyId) {
      await prisma.payment.deleteMany({ where: { partyId: testPartyId } });
      await prisma.partyAddon.deleteMany({ where: { partyId: testPartyId } });
      await prisma.invitation.deleteMany({ where: { partyId: testPartyId } });
      await prisma.partyWaiver.deleteMany({ where: { partyId: testPartyId } });
      await prisma.partyNote.deleteMany({ where: { partyId: testPartyId } });
      await prisma.partyAssignment.deleteMany({ where: { partyId: testPartyId } });
      await prisma.emailLog.deleteMany({ where: { partyId: testPartyId } });
      await prisma.party.delete({ where: { id: testPartyId } }).catch(() => {});
    }
    if (testRoomId) await prisma.room.delete({ where: { id: testRoomId } }).catch(() => {});
    if (testPackageId) await prisma.package.delete({ where: { id: testPackageId } }).catch(() => {});
    if (testLocationId) {
      await prisma.tax.deleteMany({ where: { locationId: testLocationId } });
      await prisma.businessLocation.delete({ where: { id: testLocationId } }).catch(() => {});
    }
    if (testBusinessId) await prisma.business.delete({ where: { id: testBusinessId } }).catch(() => {});
    if (testUserId) await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});

    await app.close();
  });

  // ============================================================
  // Auth Endpoints
  // ============================================================
  describe('Auth', () => {
    it('POST /api/v1/auth/register — should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `e2e-test-${Date.now()}@test.com`,
          password: 'TestPass123!',
          firstName: 'E2E',
          lastName: 'Tester',
          role: 'BUSINESS_OWNER',
        })
        .expect(201);

      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
      testUserId = res.body.user.id;
      authToken = res.body.token;
    });

    it('POST /api/v1/auth/login — should login with valid credentials', async () => {
      // Register a user first to ensure it exists
      const email = `e2e-login-${Date.now()}@test.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'TestPass123!',
          firstName: 'Login',
          lastName: 'Test',
        });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'TestPass123!' })
        .expect(201);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(email);

      // Clean up
      await prisma.user.delete({ where: { email } }).catch(() => {});
    });

    it('POST /api/v1/auth/login — should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrong' })
        .expect(401);
    });
  });

  // ============================================================
  // Business + Location Setup
  // ============================================================
  describe('Business & Location Setup', () => {
    it('POST /api/v1/business — should create a business', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/business')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test Business',
          prefix: `E2E${Date.now()}`,
          email: 'e2e@test.com',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      testBusinessId = res.body.id;
    });

    it('POST /api/v1/locations — should create a location', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessId: testBusinessId,
          name: 'E2E Test Location',
          prefix: `E2ELOC${Date.now()}`,
          timezone: 'America/New_York',
          currency: 'USD',
          paymentMethod: 'stripe',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      testLocationId = res.body.id;

      // Create a tax for the location
      await prisma.tax.create({
        data: {
          locationId: testLocationId,
          name: 'Test Tax',
          rate: 0.06,
          isDefault: true,
        },
      });
    });
  });

  // ============================================================
  // Packages & Rooms
  // ============================================================
  describe('Packages & Rooms', () => {
    it('POST /api/v1/rooms — should create a room', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationId: testLocationId,
          name: 'E2E Party Room',
          capacity: 20,
        })
        .expect(201);

      testRoomId = res.body.id;
    });

    it('POST /api/v1/packages — should create a package', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationId: testLocationId,
          name: 'E2E Birthday Package',
          price: 199.99,
          duration: 120,
          maxGuests: 15,
          extraPerPersonPrice: 12.99,
          eventType: 'BIRTHDAY',
        })
        .expect(201);

      testPackageId = res.body.id;
    });
  });

  // ============================================================
  // Parties (Core Booking Flow)
  // ============================================================
  describe('Parties — Core Booking', () => {
    it('POST /api/v1/parties — should create a party booking', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const res = await request(app.getHttpServer())
        .post('/api/v1/parties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationId: testLocationId,
          packageId: testPackageId,
          roomId: testRoomId,
          eventType: 'BIRTHDAY',
          hostFirstName: 'E2E',
          hostLastName: 'Host',
          hostEmail: 'e2ehost@test.com',
          hostPhone: '+14045559999',
          childName: 'TestChild',
          partyName: "TestChild's Birthday",
          partyDate: nextWeek.toISOString().split('T')[0],
          startTime: '14:00',
          endTime: '16:00',
          guestCount: 10,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.total).toBeDefined();
      expect(Number(res.body.packagePrice)).toBe(199.99);
      testPartyId = res.body.id;
    });

    it('GET /api/v1/parties/:id — should return party details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/parties/${testPartyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(testPartyId);
      expect(res.body.partyName).toBe("TestChild's Birthday");
      expect(res.body.package).toBeDefined();
      expect(res.body.location).toBeDefined();
    });

    it('POST /api/v1/parties/calculate-price — should calculate pricing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/parties/calculate-price')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          packageId: testPackageId,
          locationId: testLocationId,
          guestCount: 20, // 5 extra guests
        })
        .expect(201);

      expect(res.body.packagePrice).toBe(199.99);
      expect(res.body.extraPersonAmount).toBe(64.95); // 5 * 12.99
      expect(res.body.taxRate).toBe(0.06);
    });

    it('POST /api/v1/parties/check-availability — should check availability', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 14);

      const res = await request(app.getHttpServer())
        .post('/api/v1/parties/check-availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationId: testLocationId,
          date: nextWeek.toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '12:00',
        })
        .expect(201);

      expect(res.body.available).toBeDefined();
    });
  });

  // ============================================================
  // Payments
  // ============================================================
  describe('Payments', () => {
    it('POST /api/v1/payments — should record a payment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          partyId: testPartyId,
          amount: 100,
          type: 'CARD',
          cardLast4: '4242',
          cardholderName: 'E2E Tester',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(Number(res.body.amount)).toBe(100);
    });

    it('GET /api/v1/payments/party/:partyId — should list party payments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/party/${testPartyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Protected Endpoints (Auth Required)
  // ============================================================
  describe('Auth Protection', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/parties')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/parties')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
