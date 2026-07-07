import React, { useEffect, useState } from "react";
import Home from "./pages/Home";

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <>
      <div className="topbar-wrap">
        <header className="topbar">
          <div className="brand" aria-label="Land Advisor Home">
            <span className="brand-dot" />
            <span className="brand-mark">LAND INTELLIGENCE</span>
          </div>

          <div className="spacer" />

          <div className="topbar-actions">
            <button className="btn btn-ghost" onClick={() => setDark((prev) => !prev)}>
              {dark ? "Light" : "Dark"}
            </button>
          </div>
        </header>
      </div>

      <Home />
    </>
  );
}
