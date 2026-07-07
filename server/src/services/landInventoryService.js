import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const listingsPath = path.join(__dirname, "../data/landListings.json");

const liquidityScore = {
  Low: 4,
  Medium: 7,
  High: 10
};

const riskPenalty = {
  Low: 0,
  Medium: 5,
  High: 12
};

let cachedListings;

async function loadListings() {
  if (!cachedListings) {
    const raw = await readFile(listingsPath, "utf8");
    cachedListings = JSON.parse(raw);
  }

  return cachedListings;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function propertyMatches(profileType, listingType) {
  const profile = normalize(profileType);
  const listing = normalize(listingType);

  if (!profile || !listing) return false;
  if (profile === listing) return true;
  if (profile.includes("villa") && listing.includes("villa")) return true;
  if (profile.includes("open") && (listing.includes("open") || listing.includes("residential"))) return true;
  if (profile.includes("residential") && (listing.includes("residential") || listing.includes("villa"))) return true;
  if (profile.includes("agricultural") && listing.includes("agricultural")) return true;
  if (profile.includes("commercial") && listing.includes("commercial")) return true;

  return false;
}

function purposeMatches(profilePurpose, listingPurposes) {
  const profile = normalize(profilePurpose);
  return listingPurposes.some((purpose) => {
    const normalizedPurpose = normalize(purpose);
    return normalizedPurpose === profile || profile.includes(normalizedPurpose) || normalizedPurpose.includes(profile);
  });
}

function scoreBudget(priceLakhs, budgetLakhs) {
  if (!budgetLakhs) return 12;
  const ratio = priceLakhs / budgetLakhs;

  if (ratio <= 0.9) return 24;
  if (ratio <= 1) return 22;
  if (ratio <= 1.1) return 14;
  if (ratio <= 1.25) return 7;
  return 0;
}

function scoreCommute(listing, officeHub, travelPreference) {
  const hub = officeHub || "Financial District";
  const distance = listing.distance_to_office_hubs_km?.[hub];

  if (!distance) return 6;

  const preference = normalize(travelPreference);
  const limit = preference.includes("30") ? 28 : preference.includes("60") ? 55 : 75;

  if (distance <= limit * 0.55) return 16;
  if (distance <= limit) return 12;
  if (distance <= limit * 1.2) return 6;
  return 1;
}

function scoreGrowth(listing, goal, holdingPeriod) {
  const appreciation = Number(listing.expected_appreciation_percent) || 0;
  const normalizedGoal = normalize(goal);
  const normalizedHolding = normalize(holdingPeriod);

  if (normalizedGoal.includes("aggressive") || normalizedHolding.includes("5+")) {
    return appreciation >= 35 ? 18 : appreciation >= 28 ? 14 : appreciation >= 22 ? 8 : 4;
  }

  if (normalizedGoal.includes("stable")) {
    return listing.risk === "Low" ? 16 : appreciation >= 24 && listing.risk === "Medium" ? 12 : 6;
  }

  return appreciation >= 30 ? 16 : appreciation >= 22 ? 13 : 8;
}

function scoreInfrastructure(listing) {
  let score = 0;

  if (listing.approval === "HMDA") score += 6;
  else if (listing.approval === "DTCP") score += 4;

  if (listing.road_width_feet >= 40) score += 4;
  else if (listing.road_width_feet >= 30) score += 2;

  if (listing.water) score += 2;
  if (listing.electricity) score += 2;
  if (listing.distance_to_orr_km <= 10) score += 4;
  else if (listing.distance_to_orr_km <= 20) score += 2;
  if (listing.future_projects?.length) score += 3;

  return Math.min(score, 18);
}

function scoreListing(listing, profile) {
  const budget = scoreBudget(listing.price_lakhs, profile.budgetLakhs);
  const property = propertyMatches(profile.propertyType, listing.property_type) ? 14 : 4;
  const purpose = purposeMatches(profile.purpose, listing.suitable_for || []) ? 10 : 3;
  const commute = scoreCommute(listing, profile.officeHub, profile.maxTravelTime);
  const growth = scoreGrowth(listing, profile.appreciationGoal, profile.holdingPeriod);
  const infrastructure = scoreInfrastructure(listing);
  const liquidity = liquidityScore[listing.liquidity] || 5;
  const penalty = riskPenalty[listing.risk] || 0;

  return Math.max(1, Math.min(99, Math.round(budget + property + purpose + commute + growth + infrastructure + liquidity - penalty)));
}

function buildFitSignals(listing, profile) {
  const signals = [];

  if (listing.price_lakhs <= profile.budgetLakhs) {
    signals.push(`Fits the Rs. ${profile.budgetLakhs}L budget`);
  } else {
    signals.push(`Slightly above the Rs. ${profile.budgetLakhs}L budget`);
  }

  signals.push(`${listing.approval} approval`);
  signals.push(`${listing.road_width_feet} ft road`);

  if (listing.distance_to_orr_km <= 12) {
    signals.push(`${listing.distance_to_orr_km} km from ORR`);
  }

  if (listing.future_projects?.[0]) {
    signals.push(`Future trigger: ${listing.future_projects[0]}`);
  }

  return signals;
}

function summarizeListing(listing, profile) {
  const matchScore = scoreListing(listing, profile);

  return {
    ...listing,
    matchScore,
    fitSignals: buildFitSignals(listing, profile)
  };
}

function aggregateAreas(listings) {
  const areaMap = new Map();

  listings.forEach((listing) => {
    const current = areaMap.get(listing.location) || {
      area: listing.location,
      market: listing.market,
      availableListingsCount: 0,
      minPriceLakhs: listing.price_lakhs,
      maxPriceLakhs: listing.price_lakhs,
      averageMatchScore: 0,
      averageExpectedAppreciation: 0,
      approvals: new Set(),
      futureProjects: new Set(),
      listingIds: [],
      listings: []
    };

    current.availableListingsCount += 1;
    current.minPriceLakhs = Math.min(current.minPriceLakhs, listing.price_lakhs);
    current.maxPriceLakhs = Math.max(current.maxPriceLakhs, listing.price_lakhs);
    current.averageMatchScore += listing.matchScore;
    current.averageExpectedAppreciation += listing.expected_appreciation_percent;
    current.approvals.add(listing.approval);
    listing.future_projects.forEach((project) => current.futureProjects.add(project));
    current.listingIds.push(listing.id);
    current.listings.push(listing);

    areaMap.set(listing.location, current);
  });

  return [...areaMap.values()]
    .map((area) => ({
      ...area,
      averageMatchScore: Math.round(area.averageMatchScore / area.availableListingsCount),
      averageExpectedAppreciation: Math.round(area.averageExpectedAppreciation / area.availableListingsCount),
      approvals: [...area.approvals],
      futureProjects: [...area.futureProjects].slice(0, 4),
      listings: area.listings.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3)
    }))
    .sort((a, b) => b.averageMatchScore - a.averageMatchScore);
}

function isRelevantMarket(listing, market) {
  const requestedMarket = normalize(market);
  const listingMarket = normalize(listing.market);
  return !requestedMarket || listingMarket.includes(requestedMarket) || requestedMarket.includes(listingMarket);
}

export async function searchLandDatabase(profile) {
  const listings = await loadListings();
  const availableListings = listings.filter((listing) => listing.availability === "available");
  const marketListings = availableListings.filter((listing) => isRelevantMarket(listing, profile.market));
  const budgetBuffer = Number(profile.budgetLakhs) * 1.25;
  const candidates = marketListings
    .filter((listing) => !budgetBuffer || listing.price_lakhs <= budgetBuffer)
    .map((listing) => summarizeListing(listing, profile))
    .sort((a, b) => b.matchScore - a.matchScore);

  const relaxedCandidates = candidates.length
    ? candidates
    : marketListings.map((listing) => summarizeListing(listing, profile)).sort((a, b) => b.matchScore - a.matchScore);

  const retrievedListings = relaxedCandidates.slice(0, 8);
  const areaContext = aggregateAreas(retrievedListings);

  return {
    dataSource: "server/src/data/landListings.json",
    totalAvailableListings: availableListings.length,
    matchedListings: retrievedListings.length,
    generatedAt: new Date().toISOString(),
    listings: retrievedListings,
    areas: areaContext
  };
}

export function compactRetrievalContext(retrieval) {
  return JSON.stringify(
    {
      dataSource: retrieval.dataSource,
      totalAvailableListings: retrieval.totalAvailableListings,
      matchedListings: retrieval.matchedListings,
      areas: retrieval.areas.map((area) => ({
        area: area.area,
        market: area.market,
        availableListingsCount: area.availableListingsCount,
        budgetRangeLakhs: [area.minPriceLakhs, area.maxPriceLakhs],
        averageMatchScore: area.averageMatchScore,
        averageExpectedAppreciation: area.averageExpectedAppreciation,
        approvals: area.approvals,
        futureProjects: area.futureProjects,
        listingIds: area.listingIds,
        listings: area.listings.map((listing) => ({
          id: listing.id,
          title: listing.title,
          price_lakhs: listing.price_lakhs,
          property_type: listing.property_type,
          approval: listing.approval,
          risk: listing.risk,
          liquidity: listing.liquidity,
          demand: listing.demand,
          fitSignals: listing.fitSignals
        }))
      }))
    },
    null,
    2
  );
}
