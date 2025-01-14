import { createRouter } from "next-connect";
import dbConnect from "@/backend/config/dbConnect";
import {
  getAddresses,
  newAddress,
} from "@/backend/controllers/addressControllers";
import { isAuthenticatedUser } from "@/backend/middlewares/auth";

import onError from "@/backend/middlewares/errors";

const router = createRouter();

dbConnect();

router.use(isAuthenticatedUser).get(getAddresses);
router.use(isAuthenticatedUser).post(newAddress);

export default router.handler({ onError });
