import ErrorHandler from "../utils/errorHandler";
import { getServerSession } from "next-auth";
import auth from "@/pages/api/auth/[...nextauth]";

const isAuthenticatedUser = async (req, res, next) => {
  const session = await getServerSession(req, res, auth);

  if (!session) {
    return new ErrorHandler("Login first to access this route", 401);
  }

  req.user = session.user;

  next();
};

export { isAuthenticatedUser };
