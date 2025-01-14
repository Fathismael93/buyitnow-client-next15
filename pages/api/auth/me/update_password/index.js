import { createRouter } from "next-connect";
import dbConnect from "@/backend/config/dbConnect";
import { updatePassword } from "@/backend/controllers/authControllers";
import onError from "@/backend/middlewares/errors";
import { isAuthenticatedUser } from "@/backend/middlewares/auth";

const router = createRouter();

dbConnect();

router.use(isAuthenticatedUser).put(updatePassword);

export default router.handler({ onError });
