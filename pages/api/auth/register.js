import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { registerUser } from '@/backend/controllers/authControllers';
import onError from '@/backend/middlewares/errors';

const router = createRouter();

await dbConnect();

router.post(registerUser);

export default router.handler({ onError });
