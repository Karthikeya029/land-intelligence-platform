import { asyncHandler } from "../middleware/error.js";
import { generateLandRecommendations } from "../services/landAdvisorService.js";

export const createLandRecommendations = asyncHandler(async (req, res) => {
  const {
    market,
    purpose,
    budgetLakhs,
    officeHub,
    maxTravelTime,
    needLoan,
    appreciationGoal,
    propertyType,
    holdingPeriod,
    priorities
  } = req.body;

  if (!market || !purpose || !budgetLakhs || !propertyType) {
    return res.status(400).json({ message: "Market, purpose, budget, and property type are required." });
  }

  const parsedBudget = Number(budgetLakhs);

  if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
    return res.status(400).json({ message: "Budget must be a valid positive number in lakhs." });
  }

  const recommendation = await generateLandRecommendations({
    market: String(market).trim(),
    purpose: String(purpose).trim(),
    budgetLakhs: parsedBudget,
    officeHub: String(officeHub || "").trim(),
    maxTravelTime: String(maxTravelTime || "").trim(),
    needLoan: String(needLoan || "").trim(),
    appreciationGoal: String(appreciationGoal || "").trim(),
    propertyType: String(propertyType).trim(),
    holdingPeriod: String(holdingPeriod || "").trim(),
    priorities: String(priorities || "").trim()
  });

  res.json({ recommendation });
});
