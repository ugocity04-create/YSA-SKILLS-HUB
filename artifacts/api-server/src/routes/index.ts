import { Router, type IRouter } from "express";
import healthRouter from "./health";
import remindersRouter from "./reminders";
import inviteRouter from "./invite";
import transferEmailsRouter from "./transfer-emails";

const router: IRouter = Router();

router.use(healthRouter);
router.use(remindersRouter);
router.use(inviteRouter);
router.use(transferEmailsRouter);

export default router;
