import { createRouter } from "next-connect";
import dbConnect from "@/backend/config/dbConnect";
import { isAuthenticatedUser } from "@/backend/middlewares/auth";
import onError from "@/backend/middlewares/errors";
import {
  getCart,
  newCart,
  updateCart,
} from "@/backend/controllers/cartControllers";

const router = createRouter();

dbConnect();

router.use(isAuthenticatedUser).get(getCart);
router.use(isAuthenticatedUser).post(newCart);
router.use(isAuthenticatedUser).put(updateCart);

export default router.handler({ onError });
