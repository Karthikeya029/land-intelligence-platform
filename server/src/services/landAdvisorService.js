import dotenv from "dotenv";

import { compactRetrievalContext, searchLandDatabase } from "./landInventoryService.js";

dotenv.config();

const OPENAI_API_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const recommendationSchema = {
  name: "land_advisor_response",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      inventoryMode: {
        type: "string",
        enum: ["ai-over-retrieval", "retrieved-listings", "no-matches"]
      },
      disclaimer: { type: "string" },
      recommendations: {
        type: "array",
        minItems: 0,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            area: { type: "string" },
            market: { type: "string" },
            matchScore: { type: "number" },
            investmentScore: { type: "number" },
            fit: { type: "string" },
            indicativeBudget: { type: "string" },
            availabilitySignal: { type: "string" },
            riskLevel: { type: "string" },
            expectedAppreciation: { type: "string" },
            liquidity: { type: "string" },
            availableListingsCount: { type: "number" },
            listingIds: {
              type: "array",
              minItems: 1,
              maxItems: 4,
              items: { type: "string" }
            },
            reasons: {
              type: "array",
              minItems: 3,
              maxItems: 4,
              items: { type: "string" }
            },
            demandDrivers: {
              type: "array",
              minItems: 3,
              maxItems: 4,
              items: { type: "string" }
            },
            nextChecks: {
              type: "array",
              minItems: 3,
              maxItems: 4,
              items: { type: "string" }
            },
            recommendedProperties: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  priceLakhs: { type: "number" },
                  approval: { type: "string" },
                  fitReason: { type: "string" }
                },
                required: ["id", "title", "priceLakhs", "approval", "fitReason"]
              }
            }
          },
          required: [
            "area",
            "market",
            "matchScore",
            "investmentScore",
            "fit",
            "indicativeBudget",
            "availabilitySignal",
            "riskLevel",
            "expectedAppreciation",
            "liquidity",
            "availableListingsCount",
            "listingIds",
            "reasons",
            "demandDrivers",
            "nextChecks",
            "recommendedProperties"
          ]
        }
      },
      followUpQuestions: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" }
      }
    },
    required: ["summary", "inventoryMode", "disclaimer", "recommendations", "followUpQuestions"]
  }
};

function buildSystemPrompt() {
  return [
    "You are a land investment intelligence analyst for Indian real-estate buyers.",
    "Recommend areas first, then cite matching properties from the retrieved inventory.",
    "Do not repeat generic advice. Tailor each response to the user's budget, goal, financing preference, travel constraints, and property type.",
    "Use only the provided retrieved inventory. Do not invent locations, listing IDs, availability, owners, prices, approvals, distances, or projects.",
    "Every recommended area must appear in the retrieved area context. Every recommended property must use an existing listing ID.",
    "If the retrieved inventory is weak for the buyer profile, explain the tradeoff instead of adding outside market guesses."
  ].join(" ");
}

function buildUserPrompt(profile, retrievalContext) {
  return [
    `Market: ${profile.market}`,
    `Purpose: ${profile.purpose}`,
    `Budget: Rs. ${profile.budgetLakhs} lakh`,
    `Office hub: ${profile.officeHub || "Not specified"}`,
    `Travel preference: ${profile.maxTravelTime || "Not specified"}`,
    `Need loan: ${profile.needLoan || "Not specified"}`,
    `Appreciation goal: ${profile.appreciationGoal || "Not specified"}`,
    `Property type: ${profile.propertyType}`,
    `Holding period: ${profile.holdingPeriod || "Not specified"}`,
    `Buyer priorities: ${profile.priorities || "Not specified"}`,
    "Retrieved land inventory:",
    retrievalContext,
    "Return only valid JSON matching the schema."
  ].join("\n");
}

function getContentString(content) {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function normalizeRecommendation(data, retrieval, inventoryMode = "ai-over-retrieval") {
  return {
    summary: data.summary,
    inventoryMode,
    disclaimer: data.disclaimer,
    retrievalStats: {
      dataSource: retrieval.dataSource,
      totalAvailableListings: retrieval.totalAvailableListings,
      matchedListings: retrieval.matchedListings,
      generatedAt: retrieval.generatedAt
    },
    recommendations: (data.recommendations || []).map((item) => ({
      ...item,
      matchScore: Math.max(1, Math.min(99, Math.round(Number(item.matchScore) || 0))),
      investmentScore: Math.max(1, Math.min(100, Math.round(Number(item.investmentScore) || Number(item.matchScore) || 0)))
    })),
    followUpQuestions: data.followUpQuestions || []
  };
}

function compactPriceRange(area) {
  if (area.minPriceLakhs === area.maxPriceLakhs) {
    return `Rs. ${area.minPriceLakhs}L`;
  }

  return `Rs. ${area.minPriceLakhs}L-Rs. ${area.maxPriceLakhs}L`;
}

function buildFallbackRecommendation(profile, retrieval, reason = "AI analysis is not configured, so this uses database retrieval and scoring only.") {
  if (!retrieval.areas.length) {
    return normalizeRecommendation(
      {
        summary: "No available listings matched this buyer profile yet.",
        disclaimer: "The system searched the land inventory and found no available records for this market and budget. Add more listings or widen the budget to unlock recommendations.",
        recommendations: [],
        followUpQuestions: [
          "Can the buyer increase the budget or consider a wider commute radius?",
          "Should unavailable or owner-verification-pending listings be included?"
        ]
      },
      retrieval,
      "no-matches"
    );
  }

  const recommendations = retrieval.areas.slice(0, 4).map((area) => {
    const topListing = area.listings[0];
    const projects = area.futureProjects.length ? area.futureProjects : ["Local infrastructure pipeline"];

    return {
      area: area.area,
      market: area.market,
      matchScore: area.averageMatchScore,
      investmentScore: Math.min(100, area.averageMatchScore + Math.round(area.averageExpectedAppreciation / 8)),
      fit: `${area.area} has ${area.availableListingsCount} available listing${area.availableListingsCount > 1 ? "s" : ""} retrieved for this buyer profile.`,
      indicativeBudget: `${compactPriceRange(area)} across retrieved listings`,
      availabilitySignal: `${area.availableListingsCount} available listing${area.availableListingsCount > 1 ? "s" : ""} in the database`,
      riskLevel: topListing.risk,
      expectedAppreciation: `${area.averageExpectedAppreciation}% over the selected horizon`,
      liquidity: topListing.liquidity,
      availableListingsCount: area.availableListingsCount,
      listingIds: area.listingIds,
      reasons: [
        topListing.fitSignals[0],
        `${area.approvals.join(" / ")} approval signal`,
        `${projects[0]} supports future demand`
      ],
      demandDrivers: [
        topListing.demand,
        ...(topListing.nearby_it_parks || []).slice(0, 2),
        ...projects.slice(0, 1)
      ].slice(0, 4),
      nextChecks: [
        "Verify title chain, encumbrance certificate, and approval layout number.",
        "Confirm road width, access, water, and electricity at site.",
        "Check recent comparable transactions before negotiating.",
        profile.needLoan === "Yes" ? "Confirm bank loan eligibility for this exact approval type." : "Validate payment milestones and registration costs."
      ],
      recommendedProperties: area.listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        priceLakhs: listing.price_lakhs,
        approval: listing.approval,
        fitReason: listing.fitSignals[0]
      }))
    };
  });

  return normalizeRecommendation(
    {
      summary: `Found ${retrieval.matchedListings} available listings and ranked ${recommendations.length} areas for this buyer.`,
      disclaimer: reason,
      recommendations,
      followUpQuestions: [
        "Should the buyer prefer lower risk or higher appreciation potential?",
        "Is the commute limit strict, or can the system trade commute for upside?",
        "Should agricultural or commercial parcels be included in the next search?"
      ]
    },
    retrieval,
    "retrieved-listings"
  );
}

export async function generateLandRecommendations(profile) {
  const retrieval = await searchLandDatabase(profile);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "replace_with_your_openai_api_key") {
    return buildFallbackRecommendation(profile, retrieval);
  }

  if (!retrieval.areas.length) {
    return buildFallbackRecommendation(profile, retrieval);
  }

  const retrievalContext = compactRetrievalContext(retrieval);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt()
        },
        {
          role: "user",
          content: buildUserPrompt(profile, retrievalContext)
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: recommendationSchema
      }
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    return buildFallbackRecommendation(
      profile,
      retrieval,
      payload.error?.message
        ? `AI explanation was unavailable (${payload.error.message}). Showing database-ranked recommendations.`
        : "AI explanation was unavailable. Showing database-ranked recommendations."
    );
  }

  const rawContent = payload.choices?.[0]?.message?.content;
  const content = getContentString(rawContent);

  if (!content) {
    return buildFallbackRecommendation(profile, retrieval, "AI returned an empty response. Showing database-ranked recommendations.");
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    return buildFallbackRecommendation(profile, retrieval, "AI returned invalid JSON. Showing database-ranked recommendations.");
  }

  return normalizeRecommendation(parsed, retrieval);
}
