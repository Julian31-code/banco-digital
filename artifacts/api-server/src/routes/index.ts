import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import transfersRouter from "./transfers";
import reservesRouter from "./reserves";
import sharedReservesRouter from "./shared-reserves";
import transactionsRouter from "./transactions";
import propertiesRouter from "./properties";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/transfers", transfersRouter);
router.use("/reserves", reservesRouter);
router.use("/shared-reserves", sharedReservesRouter);
router.use("/transactions", transactionsRouter);
router.use("/properties", propertiesRouter);

export default router;
