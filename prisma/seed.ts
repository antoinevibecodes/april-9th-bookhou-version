import { PrismaClient, UserRole, EventType, CouponType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================================
  // 1. Create Super Admin user
  // ============================================================
  const adminPassword = await bcrypt.hash('admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tinytowne.com' },
    update: {},
    create: {
      email: 'admin@tinytowne.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+14045551000',
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log('Created admin user:', admin.email);

  // ============================================================
  // 2. Create Business Owner
  // ============================================================
  const ownerPassword = await bcrypt.hash('owner123!', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@tinytowne.com' },
    update: {},
    create: {
      email: 'owner@tinytowne.com',
      passwordHash: ownerPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+14045552000',
      role: UserRole.BUSINESS_OWNER,
    },
  });
  console.log('Created owner user:', owner.email);

  // ============================================================
  // 3. Create Manager
  // ============================================================
  const managerPassword = await bcrypt.hash('manager123!', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@tinytowne.com' },
    update: {},
    create: {
      email: 'manager@tinytowne.com',
      passwordHash: managerPassword,
      firstName: 'Mike',
      lastName: 'Thompson',
      phone: '+14045553000',
      role: UserRole.MANAGER,
    },
  });
  console.log('Created manager user:', manager.email);

  // ============================================================
  // 4. Create Employee
  // ============================================================
  const employeePassword = await bcrypt.hash('employee123!', 10);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@tinytowne.com' },
    update: {},
    create: {
      email: 'employee@tinytowne.com',
      passwordHash: employeePassword,
      firstName: 'Emily',
      lastName: 'Davis',
      phone: '+14045554000',
      role: UserRole.EMPLOYEE,
    },
  });
  console.log('Created employee user:', employee.email);

  // ============================================================
  // 5. Create Business
  // ============================================================
  const business = await prisma.business.upsert({
    where: { prefix: 'TT' },
    update: {},
    create: {
      name: 'Tiny Towne',
      prefix: 'TT',
      email: 'info@tinytowne.com',
      phone: '+14045550000',
    },
  });
  console.log('Created business:', business.name);

  // ============================================================
  // 6. Create Business Location
  // ============================================================
  const location = await prisma.businessLocation.upsert({
    where: { prefix: 'TT-ATL' },
    update: {},
    create: {
      businessId: business.id,
      name: 'Tiny Towne Atlanta',
      prefix: 'TT-ATL',
      address: '6000 North Point Pkwy',
      city: 'Alpharetta',
      state: 'GA',
      zipCode: '30022',
      country: 'US',
      phone: '+14045550001',
      email: 'atlanta@tinytowne.com',
      timezone: 'America/New_York',
      currency: 'USD',
      paymentMethod: 'stripe',
      bookingPageTitle: 'Book Your Party at Tiny Towne!',
      bookingPageDesc: 'The ultimate kids party destination in Atlanta. Book your birthday party, field trip, or corporate event today!',
      refundPolicy: 'Cancellations made 7+ days before the event receive a full refund. Cancellations within 7 days are subject to a 50% cancellation fee. No refunds for no-shows.',
    },
  });
  console.log('Created location:', location.name);

  // ============================================================
  // 7. Create Business Members (link users to location)
  // ============================================================
  for (const user of [owner, manager, employee]) {
    await prisma.businessMember.upsert({
      where: { userId_locationId: { userId: user.id, locationId: location.id } },
      update: {},
      create: {
        businessId: business.id,
        locationId: location.id,
        userId: user.id,
        role: user.role,
      },
    });
  }
  console.log('Linked team members to location');

  // ============================================================
  // 8. Create Work Hours (Mon-Sun)
  // ============================================================
  const workHours = [
    { dayOfWeek: 0, openTime: '12:00', closeTime: '18:00', isClosed: false }, // Sunday
    { dayOfWeek: 1, openTime: '10:00', closeTime: '20:00', isClosed: false }, // Monday
    { dayOfWeek: 2, openTime: '10:00', closeTime: '20:00', isClosed: false }, // Tuesday
    { dayOfWeek: 3, openTime: '10:00', closeTime: '20:00', isClosed: false }, // Wednesday
    { dayOfWeek: 4, openTime: '10:00', closeTime: '21:00', isClosed: false }, // Thursday
    { dayOfWeek: 5, openTime: '10:00', closeTime: '22:00', isClosed: false }, // Friday
    { dayOfWeek: 6, openTime: '10:00', closeTime: '22:00', isClosed: false }, // Saturday
  ];
  for (const wh of workHours) {
    await prisma.workHours.upsert({
      where: { locationId_dayOfWeek: { locationId: location.id, dayOfWeek: wh.dayOfWeek } },
      update: {},
      create: { locationId: location.id, ...wh },
    });
  }
  console.log('Created work hours');

  // ============================================================
  // 9. Create Rooms
  // ============================================================
  const roomsData = [
    { name: 'Party Room A', description: 'Main party room with decorations and seating for up to 30 guests', capacity: 30, sortOrder: 1 },
    { name: 'Party Room B', description: 'Cozy party room perfect for smaller gatherings, seats 15', capacity: 15, sortOrder: 2 },
    { name: 'VIP Suite', description: 'Premium party suite with private play area and dedicated host', capacity: 20, sortOrder: 3 },
    { name: 'Outdoor Pavilion', description: 'Covered outdoor area with picnic tables, great for large groups', capacity: 50, sortOrder: 4 },
  ];

  const rooms: any[] = [];
  for (const r of roomsData) {
    const room = await prisma.room.create({
      data: { locationId: location.id, ...r },
    });
    rooms.push(room);
  }
  console.log(`Created ${rooms.length} rooms`);

  // ============================================================
  // 10. Create Tax Rate (Task #19: percentage-based, not flat)
  // ============================================================
  const tax = await prisma.tax.create({
    data: {
      locationId: location.id,
      name: 'Georgia Sales Tax',
      rate: 0.06, // 6%
      isDefault: true,
    },
  });
  console.log('Created tax rate:', `${Number(tax.rate) * 100}%`);

  // ============================================================
  // 11. Create Packages
  // ============================================================
  const packagesData = [
    {
      name: 'Basic Birthday Party',
      description: 'Perfect starter party package for kids!',
      contents: '1.5 hours of play time, 1 pizza, juice boxes for all guests, paper plates & napkins, birthday crown for the birthday child',
      price: 199.99,
      duration: 90,
      bufferTime: 30,
      minGuests: 5,
      maxGuests: 15,
      color: '#FF6B6B',
      eventType: EventType.BIRTHDAY,
      sortOrder: 1,
    },
    {
      name: 'Premium Birthday Bash',
      description: 'The ultimate birthday experience with all the extras!',
      contents: '2 hours of play time, 2 pizzas, drinks, ice cream cake, goodie bags for all guests, balloon arch, dedicated party host',
      price: 349.99,
      duration: 120,
      bufferTime: 30,
      minGuests: 10,
      maxGuests: 25,
      color: '#6C5CE7',
      eventType: EventType.BIRTHDAY,
      sortOrder: 2,
    },
    {
      name: 'VIP Party Experience',
      description: 'Private VIP suite with premium everything',
      contents: '2.5 hours in VIP suite, catered food & drinks, custom cake, photo booth, goodie bags, dedicated host, balloon decorations',
      price: 549.99,
      duration: 150,
      bufferTime: 30,
      minGuests: 10,
      maxGuests: 20,
      color: '#FDCB6E',
      eventType: EventType.BIRTHDAY,
      sortOrder: 3,
    },
    {
      name: 'Field Trip Package',
      description: 'School and daycare field trip package with educational activities',
      contents: '3 hours of structured play and activities, lunch for all students, educational station access, group photo',
      price: 12.99,
      cost: 5.0,
      extraPerPersonPrice: 12.99,
      duration: 180,
      bufferTime: 30,
      minGuests: 15,
      maxGuests: 50,
      color: '#00B894',
      eventType: EventType.FIELD_TRIP,
      sortOrder: 4,
    },
    {
      name: 'Corporate Event',
      description: 'Team building and corporate party package',
      contents: '3 hours venue rental, catering for all guests, A/V setup, dedicated event coordinator',
      price: 799.99,
      duration: 180,
      bufferTime: 60,
      minGuests: 20,
      maxGuests: 50,
      color: '#0984E3',
      eventType: EventType.CORPORATE,
      sortOrder: 5,
    },
  ];

  const packages: any[] = [];
  for (const p of packagesData) {
    const pkg = await prisma.package.create({
      data: { locationId: location.id, ...p },
    });
    packages.push(pkg);
  }
  console.log(`Created ${packages.length} packages`);

  // Link rooms to packages
  await prisma.packageRoom.createMany({
    data: [
      { packageId: packages[0].id, roomId: rooms[0].id }, // Basic -> Room A
      { packageId: packages[0].id, roomId: rooms[1].id }, // Basic -> Room B
      { packageId: packages[1].id, roomId: rooms[0].id }, // Premium -> Room A
      { packageId: packages[2].id, roomId: rooms[2].id }, // VIP -> VIP Suite
      { packageId: packages[3].id, roomId: rooms[3].id }, // Field Trip -> Outdoor
      { packageId: packages[4].id, roomId: rooms[0].id }, // Corporate -> Room A
      { packageId: packages[4].id, roomId: rooms[3].id }, // Corporate -> Outdoor
    ],
  });

  // Create time slots for packages
  for (const pkg of packages.slice(0, 3)) {
    // Birthday packages available Sat/Sun at specific times
    const slots = [
      { dayOfWeek: 6, startTime: '10:00', endTime: '11:30' },
      { dayOfWeek: 6, startTime: '12:00', endTime: '13:30' },
      { dayOfWeek: 6, startTime: '14:00', endTime: '15:30' },
      { dayOfWeek: 6, startTime: '16:00', endTime: '17:30' },
      { dayOfWeek: 0, startTime: '12:00', endTime: '13:30' },
      { dayOfWeek: 0, startTime: '14:00', endTime: '15:30' },
    ];
    for (const slot of slots) {
      await prisma.packageTimeSlot.create({
        data: { packageId: pkg.id, ...slot },
      });
    }
  }
  console.log('Created package time slots and room assignments');

  // ============================================================
  // 12. Create Addons
  // ============================================================
  const addonsData = [
    { name: 'Extra Pizza', description: 'Large pizza (cheese or pepperoni)', price: 18.99, sortOrder: 1 },
    { name: 'Goodie Bags (10-pack)', description: 'Fun-filled goodie bags for each guest', price: 29.99, sortOrder: 2 },
    { name: 'Balloon Arch', description: 'Custom color balloon arch for the party area', price: 49.99, sortOrder: 3 },
    { name: 'Face Painting', description: '1 hour of professional face painting', price: 75.00, sortOrder: 4 },
    { name: 'Extra Play Time (30 min)', description: 'Add 30 minutes of play time to your party', price: 35.00, sortOrder: 5 },
    { name: 'Custom Cake', description: 'Custom decorated cake (serves 20)', price: 59.99, sortOrder: 6 },
    { name: 'Photo Booth', description: 'Photo booth with props and instant prints', price: 89.99, sortOrder: 7 },
    { name: 'Custom Add-On', description: 'Custom add-on with your own price', price: 0, isCustom: true, sortOrder: 99 },
  ];

  const addons: any[] = [];
  for (const a of addonsData) {
    const addon = await prisma.addon.create({
      data: { locationId: location.id, ...a },
    });
    addons.push(addon);
  }
  console.log(`Created ${addons.length} addons`);

  // Link some addons to packages
  await prisma.packageAddon.createMany({
    data: [
      { packageId: packages[0].id, addonId: addons[0].id },
      { packageId: packages[0].id, addonId: addons[1].id },
      { packageId: packages[0].id, addonId: addons[2].id },
      { packageId: packages[1].id, addonId: addons[0].id },
      { packageId: packages[1].id, addonId: addons[3].id },
      { packageId: packages[1].id, addonId: addons[4].id },
      { packageId: packages[1].id, addonId: addons[6].id },
      { packageId: packages[2].id, addonId: addons[3].id },
      { packageId: packages[2].id, addonId: addons[4].id },
    ],
  });
  console.log('Linked addons to packages');

  // ============================================================
  // 13. Create Coupons
  // ============================================================
  await prisma.coupon.createMany({
    data: [
      {
        locationId: location.id,
        code: 'WELCOME10',
        type: CouponType.PERCENTAGE,
        value: 10,
        maxUses: 100,
        isActive: true,
      },
      {
        locationId: location.id,
        code: 'SAVE25',
        type: CouponType.FIXED_AMOUNT,
        value: 25,
        maxUses: 50,
        isActive: true,
      },
      {
        locationId: location.id,
        code: 'FREEBIRTHDAY',
        type: CouponType.FULL_AMOUNT,
        value: 0,
        maxUses: 5,
        isActive: true,
      },
    ],
  });
  console.log('Created coupons');

  // ============================================================
  // 14. Create Waiver Template
  // ============================================================
  const waiverTemplate = await prisma.waiverTemplate.create({
    data: {
      locationId: location.id,
      name: 'Standard Liability Waiver',
      content: `<h2>WAIVER AND RELEASE OF LIABILITY</h2>
<p>In consideration of being allowed to participate in activities at Tiny Towne, I hereby:</p>
<ol>
<li>Acknowledge that participation involves inherent risks including but not limited to falls, collisions, and other physical injuries.</li>
<li>Voluntarily assume all risks associated with participation.</li>
<li>Release, waive, and discharge Tiny Towne, its owners, operators, employees, and agents from any liability.</li>
<li>Agree to indemnify and hold harmless Tiny Towne from any claims arising from participation.</li>
</ol>
<p>I have read this waiver and release, fully understand its terms, and understand that I am giving up substantial rights by signing it.</p>`,
      isDefault: true,
      questions: {
        create: [
          {
            question: 'Does the child have any allergies?',
            type: 'text',
            isRequired: false,
            sortOrder: 1,
          },
          {
            question: 'Does the child have any medical conditions we should know about?',
            type: 'text',
            isRequired: false,
            sortOrder: 2,
          },
          {
            question: 'Emergency contact name and phone number',
            type: 'text',
            isRequired: true,
            sortOrder: 3,
          },
          {
            question: 'I agree to the terms and conditions above',
            type: 'checkbox',
            isRequired: true,
            sortOrder: 4,
          },
        ],
      },
    },
  });
  console.log('Created waiver template with', 4, 'questions');

  // ============================================================
  // 15. Create Email Templates
  // ============================================================
  await prisma.emailTemplate.createMany({
    data: [
      {
        locationId: location.id,
        name: 'Booking Confirmation',
        subject: 'Your Party at Tiny Towne is Confirmed!',
        body: '<h2>Booking Confirmed!</h2><p>Dear {{hostName}},</p><p>Your party <strong>{{partyName}}</strong> has been confirmed for {{partyDate}} at {{partyTime}}.</p><p>Package: {{packageName}}</p><p>Total: ${{total}}</p><p><a href="{{bookingLink}}">View Booking Details</a></p>',
        trigger: 'booking_confirmed',
      },
      {
        locationId: location.id,
        name: 'Payment Received',
        subject: 'Payment Received - {{partyName}}',
        body: '<h2>Payment Received</h2><p>Dear {{hostName}},</p><p>We received a payment of ${{amount}} for <strong>{{partyName}}</strong>.</p><p>Remaining Balance: ${{balance}}</p>',
        trigger: 'payment_received',
      },
      {
        locationId: location.id,
        name: 'Party Reminder',
        subject: 'Reminder: {{partyName}} is Tomorrow!',
        body: '<h2>Party Reminder</h2><p>Dear {{hostName}},</p><p>This is a friendly reminder that <strong>{{partyName}}</strong> is tomorrow at {{partyTime}}!</p><p>Location: {{locationName}}, {{locationAddress}}</p><p>Please arrive 15 minutes early for check-in.</p>',
        trigger: 'party_reminder',
      },
      {
        locationId: location.id,
        name: 'Cancellation Confirmation',
        subject: 'Party Cancelled - {{partyName}}',
        body: '<h2>Party Cancelled</h2><p>Dear {{hostName}},</p><p>Your party <strong>{{partyName}}</strong> scheduled for {{partyDate}} has been cancelled.</p><p>{{refundInfo}}</p>',
        trigger: 'cancellation',
      },
    ],
  });
  console.log('Created email templates');

  // ============================================================
  // 16. Create Party Types
  // ============================================================
  await prisma.partyType.createMany({
    data: [
      { locationId: location.id, name: 'Birthday Party', description: 'Classic birthday celebration', sortOrder: 1 },
      { locationId: location.id, name: 'Field Trip', description: 'School and daycare field trips', sortOrder: 2 },
      { locationId: location.id, name: 'Corporate Event', description: 'Team building and corporate parties', sortOrder: 3 },
      { locationId: location.id, name: 'Private Event', description: 'Custom private events', sortOrder: 4 },
    ],
  });
  console.log('Created party types');

  // ============================================================
  // 17. Create Sample Parties (for testing)
  // ============================================================
  const today = new Date();
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));

  const party1 = await prisma.party.create({
    data: {
      locationId: location.id,
      packageId: packages[1].id, // Premium Birthday Bash
      roomId: rooms[0].id,
      status: 'ACTIVE',
      eventType: EventType.BIRTHDAY,
      hostFirstName: 'Jessica',
      hostLastName: 'Williams',
      hostEmail: 'jessica@example.com',
      hostPhone: '+14045556001',
      childName: 'Olivia',
      partyName: "Olivia's 7th Birthday",
      partyDate: nextSaturday,
      startTime: '14:00',
      endTime: '16:00',
      guestCount: 15,
      packagePrice: 349.99,
      extraPersonAmount: 0,
      addonTotal: 68.98,
      subtotal: 418.97,
      discountAmount: 0,
      taxRate: 0.06,
      taxAmount: 25.14,
      total: 444.11,
      amountPaid: 200,
      balance: 244.11,
      invoiceNumber: '00000001',
      addons: {
        create: [
          { addonId: addons[0].id, price: 18.99, quantity: 1 },
          { addonId: addons[2].id, price: 49.99, quantity: 1 },
        ],
      },
    },
  });

  // Add a payment for party1
  await prisma.payment.create({
    data: {
      partyId: party1.id,
      amount: 200,
      type: 'CARD',
      status: 'PAID',
      cardLast4: '4242',
      cardholderName: 'Jessica Williams',
      cardBrand: 'visa',
      note: 'Deposit payment',
    },
  });

  const nextNextSaturday = new Date(nextSaturday);
  nextNextSaturday.setDate(nextSaturday.getDate() + 7);

  const party2 = await prisma.party.create({
    data: {
      locationId: location.id,
      packageId: packages[0].id, // Basic Birthday Party
      roomId: rooms[1].id,
      status: 'REQUEST',
      eventType: EventType.BIRTHDAY,
      hostFirstName: 'David',
      hostLastName: 'Chen',
      hostEmail: 'david@example.com',
      hostPhone: '+14045556002',
      childName: 'Lucas',
      partyName: "Lucas's 5th Birthday",
      partyDate: nextNextSaturday,
      startTime: '10:00',
      endTime: '11:30',
      guestCount: 10,
      packagePrice: 199.99,
      extraPersonAmount: 0,
      addonTotal: 0,
      subtotal: 199.99,
      discountAmount: 20.0,
      taxRate: 0.06,
      taxAmount: 10.80,
      total: 190.79,
      amountPaid: 0,
      balance: 190.79,
      invoiceNumber: '00000002',
    },
  });

  console.log(`Created ${2} sample parties`);

  // ============================================================
  // 18. Create Notification Emails
  // ============================================================
  await prisma.notificationEmail.createMany({
    data: [
      { locationId: location.id, email: 'owner@tinytowne.com' },
      { locationId: location.id, email: 'manager@tinytowne.com' },
    ],
  });
  console.log('Created notification emails');

  // ============================================================
  // 19. Create Social Links
  // ============================================================
  await prisma.socialLink.createMany({
    data: [
      { locationId: location.id, platform: 'facebook', url: 'https://facebook.com/tinytowne' },
      { locationId: location.id, platform: 'instagram', url: 'https://instagram.com/tinytowne' },
      { locationId: location.id, platform: 'website', url: 'https://tinytowne.com' },
    ],
  });
  console.log('Created social links');

  console.log('\nSeed completed successfully!');
  console.log('---');
  console.log('Login credentials:');
  console.log('  Admin:    admin@tinytowne.com / admin123!');
  console.log('  Owner:    owner@tinytowne.com / owner123!');
  console.log('  Manager:  manager@tinytowne.com / manager123!');
  console.log('  Employee: employee@tinytowne.com / employee123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
