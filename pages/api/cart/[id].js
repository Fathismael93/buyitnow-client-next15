import { createRouter } from "next-connect";
import dbConnect from "@/backend/config/dbConnect";
import { isAuthenticatedUser } from "@/backend/middlewares/auth";
import onError from "@/backend/middlewares/errors";
import { deleteCart } from "@/backend/controllers/cartControllers";

const router = createRouter();

dbConnect();

router.use(isAuthenticatedUser).delete(deleteCart);

export default router.handler({ onError });
