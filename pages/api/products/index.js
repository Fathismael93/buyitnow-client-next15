import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { getProducts } from '@/backend/controllers/productControllers';
import onError from '@/backend/middlewares/errors';

const router = createRouter();

console.log('WE ARE IN THE GET PRODUCTS API');

await dbConnect()
  .then((result) => {
    console.log('RESULT IN DATABASE CONNECTION');
    console.log(result);
  })
  .catch((error) => {
    console.error('Error IN DATABASE CONNECTION');
    console.error(error);
  });

router.get(getProducts);

export default router.handler({
  onError,
});
