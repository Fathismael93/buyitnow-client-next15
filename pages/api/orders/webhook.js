import { createRouter } from "next-connect";
import dbConnect from "@/backend/config/dbConnect";
import onError from "@/backend/middlewares/errors";
import { webhook } from "@/backend/controllers/orderControllers";
import { isAuthenticatedUser } from "@/backend/middlewares/auth";

const router = createRouter();

dbConnect();

router.use(isAuthenticatedUser).post(webhook);

export default router.handler({ onError });
