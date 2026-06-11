import { Router, type IRouter } from "express";
import healthRouter from "./health";
import remindersRouter from "./reminders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(remindersRouter);

export default router;
