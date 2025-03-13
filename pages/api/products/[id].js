import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { getProduct } from '@/backend/controllers/productControllers';
import onError from '@/backend/middlewares/errors';

const router = createRouter();

await dbConnect();

router.get(getProduct);

export default router.handler({ onError });
