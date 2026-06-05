import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import analysisRouter from "./analysis";
import modulesRouter from "./modules";
import dataRouter from "./data";
import scrapeRouter from "./scrape";
import userRouter from "./user";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(analysisRouter);
router.use(modulesRouter);
router.use(dataRouter);
router.use(scrapeRouter);
router.use(userRouter);

export default router;
