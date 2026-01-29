"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function migrateRBAC() {
    console.log('🔄 Starting RBAC migration...');
    try {
        // Step 1: Get all users
        const users = await prisma.user.findMany({
            include: {
                events: {
                    select: { id: true },
                },
            },
        });
        console.log(`📊 Found ${users.length} users to migrate`);
        // Step 2: Migrate each user
        for (const user of users) {
            // Check if user already has roles (skip if already migrated)
            const existingRoles = await prisma.userRole.findMany({
                where: { userId: user.id },
            });
            if (existingRoles.length > 0) {
                console.log(`⏭️  User ${user.email} already has roles, skipping...`);
                continue;
            }
            // Grant BUYER role to all users
            await prisma.userRole.create({
                data: {
                    userId: user.id,
                    role: client_1.Role.BUYER,
                },
            });
            console.log(`✅ Granted BUYER role to ${user.email}`);
            // Grant ORGANIZER role to users with events
            if (user.events.length > 0) {
                await prisma.userRole.create({
                    data: {
                        userId: user.id,
                        role: client_1.Role.ORGANIZER,
                    },
                });
                console.log(`✅ Granted ORGANIZER role to ${user.email} (has ${user.events.length} events)`);
            }
            // Create BuyerProfile if it doesn't exist
            const existingBuyerProfile = await prisma.buyerProfile.findUnique({
                where: { userId: user.id },
            });
            if (!existingBuyerProfile) {
                // Parse name into firstName/lastName if available
                const nameParts = user.name?.split(' ') || [];
                const firstName = nameParts[0] || null;
                const lastName = nameParts.slice(1).join(' ') || null;
                await prisma.buyerProfile.create({
                    data: {
                        userId: user.id,
                        firstName,
                        lastName,
                    },
                });
                console.log(`✅ Created BuyerProfile for ${user.email}`);
            }
            // Create OrganizerProfile for users with events
            if (user.events.length > 0) {
                const existingOrganizerProfile = await prisma.organizerProfile.findUnique({
                    where: { userId: user.id },
                });
                if (!existingOrganizerProfile) {
                    await prisma.organizerProfile.create({
                        data: {
                            userId: user.id,
                            businessName: user.name || `Organizer ${user.email}`,
                            businessType: 'individual',
                            verificationStatus: client_1.OrganizerVerificationStatus.PENDING,
                            onboardingCompleted: false,
                        },
                    });
                    console.log(`✅ Created OrganizerProfile for ${user.email}`);
                }
            }
        }
        console.log('\n🎉 RBAC migration completed successfully!');
        console.log('\n📋 Summary:');
        const totalUsers = await prisma.user.count();
        const totalBuyers = await prisma.userRole.count({ where: { role: client_1.Role.BUYER } });
        const totalOrganizers = await prisma.userRole.count({ where: { role: client_1.Role.ORGANIZER } });
        const totalBuyerProfiles = await prisma.buyerProfile.count();
        const totalOrganizerProfiles = await prisma.organizerProfile.count();
        console.log(`  - Total users: ${totalUsers}`);
        console.log(`  - Users with BUYER role: ${totalBuyers}`);
        console.log(`  - Users with ORGANIZER role: ${totalOrganizers}`);
        console.log(`  - Buyer profiles: ${totalBuyerProfiles}`);
        console.log(`  - Organizer profiles: ${totalOrganizerProfiles}`);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
migrateRBAC()
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=migrate-rbac.js.map