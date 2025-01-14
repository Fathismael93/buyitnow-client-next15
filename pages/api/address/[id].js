import { createRouter } from "next-connect";
import dbConnect from "@/backend/config/dbConnect";
import {
  deleteAddress,
  getAddress,
  updateAddress,
} from "@/backend/controllers/addressControllers";
import { isAuthenticatedUser } from "@/backend/middlewares/auth";

import onError from "@/backend/middlewares/errors";

const router = createRouter();

dbConnect();

router.use(isAuthenticatedUser).get(getAddress);
router.use(isAuthenticatedUser).put(updateAddress);
router.use(isAuthenticatedUser).delete(deleteAddress);

export default router.handler({ onError });
