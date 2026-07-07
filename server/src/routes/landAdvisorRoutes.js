import { Router } from "express";
import { createLandRecommendations } from "../controllers/landAdvisorController.js";

const router = Router();

router.post("/recommendations", createLandRecommendations);

export default router;
