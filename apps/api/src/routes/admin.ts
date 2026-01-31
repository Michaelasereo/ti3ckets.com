import { Router } from 'express';
import dashboardRoutes from './admin/index';
import usersRoutes from './admin/users';
import organizersRoutes from './admin/organizers';
import eventsRoutes from './admin/events';
import ordersRoutes from './admin/orders';
import settingsRoutes from './admin/settings';
import launchWaitlistRoutes from './admin/launchWaitlist';

const router = Router();

// Mount all admin sub-routes
router.use('/', dashboardRoutes);
router.use('/users', usersRoutes);
router.use('/organizers', organizersRoutes);
router.use('/events', eventsRoutes);
router.use('/orders', ordersRoutes);
router.use('/settings', settingsRoutes);
router.use('/launch-waitlist', launchWaitlistRoutes);

export default router;
