import { createRouter } from "next-connect";
import { sendEmail } from "@/backend/controllers/authControllers";
import onError from "@/backend/middlewares/errors";
import { isAuthenticatedUser } from "@/backend/middlewares/auth";

const router = createRouter();

router.use(isAuthenticatedUser).post(sendEmail);

export default router.handler({ onError });
