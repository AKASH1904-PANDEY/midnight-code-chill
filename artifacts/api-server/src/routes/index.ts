import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rsvpsRouter from "./rsvps";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rsvpsRouter);

export default router;
