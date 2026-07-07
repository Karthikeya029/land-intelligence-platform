import React, { useState } from "react";
import { api } from "../lib/api";

const initialForm = {
  market: "Hyderabad",
  purpose: "Investment",
  budgetLakhs: "60",
  officeHub: "Financial District",
  maxTravelTime: "Up to 60 minutes",
  needLoan: "Yes",
  appreciationGoal: "Balanced",
  propertyType: "Villa plot",
  holdingPeriod: "5+ years",
  priorities: "Good resale, strong infrastructure pipeline, and visible demand"
};

const purposeOptions = ["Investment", "Residential", "Mixed"];
const travelOptions = ["Up to 30 minutes", "Up to 60 minutes", "Flexible if upside is better"];
const loanOptions = ["Yes", "No", "Maybe"];
const growthOptions = ["Stable", "Balanced", "Aggressive"];
const propertyOptions = ["Villa plot", "Residential plot", "Agricultural land", "Open plot"];
const holdingOptions = ["1-3 years", "3-5 years", "5+ years"];

function formatCurrencyLabel(value) {
  if (!value) return "Budget not specified";
  return `Rs. ${value} lakh`;
}

function formatModeLabel(mode) {
  if (mode === "ai-over-retrieval") return "AI over retrieved listings";
  if (mode === "retrieved-listings") return "Database-ranked results";
  if (mode === "no-matches") return "No matching inventory";
  return "AI recommendation mode";
}

function formatCount(value, label) {
  const count = Number(value) || 0;
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const budgetLakhs = Number(form.budgetLakhs);
      const { data } = await api.post("/land-advisor/recommendations", {
        ...form,
        budgetLakhs
      });

      setResult(data.recommendation);
    } catch (requestError) {
      const apiMessage = requestError.response?.data?.message;

      if (apiMessage) {
        setError(apiMessage);
      } else if (requestError.code === "ERR_NETWORK") {
        setError("Backend is not reachable. Start the server on http://localhost:5001 and try again.");
      } else {
        setError("Unable to generate recommendations right now.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setResult(null);
    setError("");
  };

  return (
    <main className="page land-page">
      <section className="advisor-hero">
        <div className="advisor-hero__copy">
          <p className="advisor-kicker">AI Land Intelligence Platform</p>
          <h1>Search inventory first. Let AI explain the best land.</h1>
          <p className="advisor-lead">
            A buyer shares budget, purpose, commute, financing, and land preference. The backend
            retrieves matching available plots first, scores them, then the AI explains only those
            database results.
          </p>

          <div className="advisor-pill-row" aria-label="Platform highlights">
            <span className="advisor-pill">Area-first decisions</span>
            <span className="advisor-pill">Dynamic AI output</span>
            <span className="advisor-pill">Availability-aware reasoning</span>
          </div>
        </div>

        <div className="advisor-hero__panel card">
          <p className="advisor-panel-label">Strategy preview</p>
          <h2>Buyer brief</h2>
          <ul className="advisor-preview-list">
            <li>{formatCurrencyLabel(form.budgetLakhs)} budget</li>
            <li>{form.purpose} intent</li>
            <li>{form.propertyType} preference</li>
            <li>{form.maxTravelTime} commute comfort</li>
          </ul>
          <p className="helper-text">
            The recommendations change when the inventory changes because area choices come from
            retrieved listings, not fixed frontend place names.
          </p>
        </div>
      </section>

      <section className="advisor-layout">
        <form className="advisor-form card" onSubmit={handleSubmit}>
          <div className="advisor-section-head">
            <div>
              <p className="advisor-panel-label">Decision input</p>
              <h2>Build the buyer profile</h2>
            </div>
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              Reset
            </button>
          </div>

          <div className="form-grid-2">
            <div>
              <label htmlFor="market">Market / City</label>
              <input id="market" value={form.market} onChange={handleChange("market")} placeholder="Hyderabad" />
            </div>

            <div>
              <label htmlFor="purpose">Purpose</label>
              <select id="purpose" value={form.purpose} onChange={handleChange("purpose")}>
                {purposeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="budgetLakhs">Budget (Lakhs)</label>
              <input
                id="budgetLakhs"
                type="number"
                min="1"
                value={form.budgetLakhs}
                onChange={handleChange("budgetLakhs")}
                placeholder="60"
              />
            </div>

            <div>
              <label htmlFor="officeHub">Office / Daily destination</label>
              <input
                id="officeHub"
                value={form.officeHub}
                onChange={handleChange("officeHub")}
                placeholder="Financial District"
              />
            </div>

            <div>
              <label htmlFor="maxTravelTime">Commute preference</label>
              <select id="maxTravelTime" value={form.maxTravelTime} onChange={handleChange("maxTravelTime")}>
                {travelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="needLoan">Need loan?</label>
              <select id="needLoan" value={form.needLoan} onChange={handleChange("needLoan")}>
                {loanOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="appreciationGoal">Appreciation goal</label>
              <select
                id="appreciationGoal"
                value={form.appreciationGoal}
                onChange={handleChange("appreciationGoal")}
              >
                {growthOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="propertyType">Property type</label>
              <select id="propertyType" value={form.propertyType} onChange={handleChange("propertyType")}>
                {propertyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label htmlFor="holdingPeriod">Holding period</label>
              <select id="holdingPeriod" value={form.holdingPeriod} onChange={handleChange("holdingPeriod")}>
                {holdingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priorities">Priorities</label>
              <textarea
                id="priorities"
                rows="4"
                value={form.priorities}
                onChange={handleChange("priorities")}
                placeholder="Mention road access, approvals, rental demand, or exit timeline"
              />
            </div>
          </div>

          <div className="advisor-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Searching and analyzing inventory..." : "Find best land matches"}
            </button>
            <p className="helper-text advisor-note">
              No place names are stored in the frontend. The backend searches the listings database first.
            </p>
          </div>
        </form>

        <section className="advisor-results stack" aria-live="polite">
          {!result && !loading ? (
            <div className="card advisor-empty">
              <p className="advisor-panel-label">What you’ll get</p>
              <h2>Area recommendations with reasoning</h2>
              <p>
                The backend retrieves available plots, groups them by area, and returns investment
                reasoning, matching listings, risk, liquidity, and next checks.
              </p>
              <div className="advisor-empty-grid">
                <article>
                  <strong>Retrieved areas</strong>
                  <p>Area names come from current matching records, not frontend constants.</p>
                </article>
                <article>
                  <strong>Available properties</strong>
                  <p>Each recommendation cites listing IDs, approvals, pricing, and fit signals.</p>
                </article>
                <article>
                  <strong>AI explanation</strong>
                  <p>The model explains retrieved evidence instead of inventing market options.</p>
                </article>
              </div>
            </div>
          ) : null}

          {loading ? <div className="empty">Searching inventory and preparing recommendations...</div> : null}
          {error ? <div className="empty status-text-danger">{error}</div> : null}

          {result ? (
            <>
              <div className="card advisor-summary-card">
                <div className="advisor-summary-head">
                  <div>
                    <p className="advisor-panel-label">AI summary</p>
                    <h2>{result.summary}</h2>
                  </div>
                  <span className="advisor-mode-badge">{formatModeLabel(result.inventoryMode)}</span>
                </div>

                <p className="helper-text">{result.disclaimer}</p>
                {result.retrievalStats ? (
                  <div className="advisor-stat-row">
                    <span>{formatCount(result.retrievalStats.matchedListings, "matched listing")}</span>
                    <span>{formatCount(result.retrievalStats.totalAvailableListings, "available listing")}</span>
                    <span>{result.retrievalStats.dataSource}</span>
                  </div>
                ) : null}
                <div className="advisor-pill-row">
                  <span className="advisor-pill">{formatCurrencyLabel(form.budgetLakhs)}</span>
                  <span className="advisor-pill">{form.market}</span>
                  <span className="advisor-pill">{form.propertyType}</span>
                </div>
              </div>

              <div className="advisor-card-grid">
                {result.recommendations?.map((item) => (
                  <article className="card advisor-card" key={`${item.area}-${item.matchScore}`}>
                    <div className="advisor-card-head">
                      <div>
                        <p className="advisor-panel-label">{item.market}</p>
                        <h3>{item.area}</h3>
                      </div>
                      <span className="advisor-score">{item.investmentScore || item.matchScore}/100</span>
                    </div>

                    <p className="advisor-fit-text">{item.fit}</p>
                    <p className="advisor-budget">{item.indicativeBudget}</p>

                    <div className="advisor-signal-row">
                      <span className="advisor-signal">{item.availabilitySignal}</span>
                      <span className="advisor-signal advisor-signal--soft">{item.riskLevel} risk</span>
                      {item.expectedAppreciation ? (
                        <span className="advisor-signal advisor-signal--soft">{item.expectedAppreciation}</span>
                      ) : null}
                      {item.liquidity ? <span className="advisor-signal advisor-signal--soft">{item.liquidity} liquidity</span> : null}
                    </div>

                    {item.recommendedProperties?.length ? (
                      <div className="advisor-property-list">
                        <strong>{formatCount(item.availableListingsCount, "available plot")}</strong>
                        {item.recommendedProperties.map((property) => (
                          <article key={property.id}>
                            <div>
                              <span>{property.id}</span>
                              <h4>{property.title}</h4>
                            </div>
                            <p>Rs. {property.priceLakhs}L | {property.approval} | {property.fitReason}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}

                    <div className="advisor-list-block">
                      <strong>Why this area</strong>
                      <ul>
                        {item.reasons?.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="advisor-list-block">
                      <strong>Demand drivers</strong>
                      <ul>
                        {item.demandDrivers?.map((driver) => (
                          <li key={driver}>{driver}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="advisor-list-block">
                      <strong>What to verify</strong>
                      <ul>
                        {item.nextChecks?.map((check) => (
                          <li key={check}>{check}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>

              {result.followUpQuestions?.length ? (
                <div className="card advisor-followups">
                  <p className="advisor-panel-label">Next AI questions</p>
                  <h2>Use these to narrow the strategy further</h2>
                  <ul>
                    {result.followUpQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}
