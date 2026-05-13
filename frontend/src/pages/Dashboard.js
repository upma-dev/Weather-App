import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getWeather, getForecast } from "../utils/api";

// ─── Weather icon map ────────────────────────────────────────────────────────
const ICON_MAP = {
  Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
  Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️", Fog: "🌫️",
  Haze: "🌁", Smoke: "💨", Dust: "🌪️", Sand: "🌪️",
  Ash: "🌋", Squall: "💨", Tornado: "🌪️",
};

const getIcon = (main) => ICON_MAP[main] || "🌡️";

const formatTime = (unix) => new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const formatHour = (unix) => new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const WIND_DIR = (deg) => {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [city, setCity] = useState("Delhi");
  const [search, setSearch] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("C");

  const fetchWeather = useCallback(async (cityName) => {
    setLoading(true);
    setError("");
    try {
      const [wRes, fRes] = await Promise.all([
        getWeather({ city: cityName }),
        getForecast({ city: cityName }),
      ]);
      setWeather(wRes.data.weather);
      setForecast(fRes.data.forecast);
      setCity(wRes.data.weather.city);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch weather.");
      setWeather(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWeather("Delhi"); }, [fetchWeather]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) fetchWeather(search.trim());
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const toDisplay = (c) => unit === "C" ? `${c}°C` : `${Math.round(c * 9 / 5 + 32)}°F`;

  return (
    <div style={s.page}>
      {/* ─── Header ─── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logoText}>⛅ WeatherApp</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.userName}>Hello, {user?.name?.split(" ")[0]} 👋</span>
          <button onClick={() => setUnit(u => u === "C" ? "F" : "C")} style={s.unitBtn}>
            °{unit === "C" ? "F" : "C"}
          </button>
          <button onClick={handleLogout} style={s.logoutBtn}>Sign out</button>
        </div>
      </header>

      {/* ─── Search ─── */}
      <form onSubmit={handleSearch} style={s.searchForm}>
        <input
          className="input"
          style={s.searchInput}
          placeholder="🔍  Search city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" style={s.searchBtn} type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : "Search"}
        </button>
      </form>

      {error && <div className="alert alert-error" style={{ maxWidth: 700, margin: "0 auto 20px" }}>{error}</div>}

      {weather && (
        <div style={s.grid}>
          {/* ─── Main card ─── */}
          <div className="card fade-up" style={s.mainCard}>
            <div style={s.cityRow}>
              <div>
                <div style={s.cityName}>{weather.city}, {weather.country}</div>
                <div style={s.desc}>{weather.description}</div>
              </div>
              <div style={s.weatherIcon}>{getIcon(weather.main)}</div>
            </div>
            <div style={s.tempDisplay}>{toDisplay(weather.temp)}</div>
            <div style={s.feelsLike}>Feels like {toDisplay(weather.feelsLike)}</div>

            <div style={s.minMax}>
              <span>↑ {toDisplay(weather.tempMax)}</span>
              <span style={{ color: "var(--muted)", margin: "0 8px" }}>|</span>
              <span>↓ {toDisplay(weather.tempMin)}</span>
            </div>
          </div>

          {/* ─── Stats grid ─── */}
          <div style={s.statsGrid}>
            {[
              { label: "Humidity", value: `${weather.humidity}%`, icon: "💧" },
              { label: "Wind", value: `${weather.windSpeed} m/s ${WIND_DIR(weather.windDeg)}`, icon: "💨" },
              { label: "Pressure", value: `${weather.pressure} hPa`, icon: "🔵" },
              { label: "Visibility", value: `${(weather.visibility / 1000).toFixed(1)} km`, icon: "👁️" },
              { label: "Sunrise", value: formatTime(weather.sunrise), icon: "🌅" },
              { label: "Sunset", value: formatTime(weather.sunset), icon: "🌇" },
            ].map((stat) => (
              <div key={stat.label} className="card" style={s.statCard}>
                <div style={s.statIcon}>{stat.icon}</div>
                <div style={s.statValue}>{stat.value}</div>
                <div style={s.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Forecast ─── */}
      {forecast.length > 0 && (
        <div style={s.forecastSection}>
          <h3 style={s.forecastTitle}>24-Hour Forecast</h3>
          <div style={s.forecastRow}>
            {forecast.map((f, i) => (
              <div key={i} className="card" style={s.forecastCard}>
                <div style={s.forecastTime}>{formatHour(f.dt)}</div>
                <div style={s.forecastIcon}>{getIcon(f.main)}</div>
                <div style={s.forecastTemp}>{toDisplay(f.temp)}</div>
                <div style={s.forecastHum}>💧 {f.humidity}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!weather && !loading && (
        <div style={s.empty}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🌍</div>
          <p>Search any city to get started</p>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", padding: "0 0 40px" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 32px", borderBottom: "1px solid var(--glass-border)",
    background: "rgba(0,0,0,0.2)", backdropFilter: "blur(10px)",
    position: "sticky", top: 0, zIndex: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  logoText: { fontSize: 20, fontWeight: 700, letterSpacing: 0.5 },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  userName: { fontSize: 14, color: "var(--muted)" },
  unitBtn: {
    background: "var(--glass)", border: "1px solid var(--glass-border)",
    color: "var(--accent)", borderRadius: 8, padding: "6px 14px",
    cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
  },
  logoutBtn: {
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
    color: "#fca5a5", borderRadius: 8, padding: "6px 14px",
    cursor: "pointer", fontFamily: "inherit", fontSize: 14,
  },
  searchForm: {
    display: "flex", gap: 12, maxWidth: 700, margin: "32px auto",
    padding: "0 20px",
  },
  searchInput: { flex: 1, fontSize: 16 },
  searchBtn: { width: "auto", padding: "14px 28px", flexShrink: 0 },
  grid: { maxWidth: 1000, margin: "0 auto", padding: "0 20px", display: "grid", gap: 20 },
  mainCard: {
    background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.06))",
    borderColor: "rgba(59,130,246,0.2)",
  },
  cityRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  cityName: { fontSize: 28, fontWeight: 700 },
  desc: { color: "var(--muted)", fontSize: 15, textTransform: "capitalize", marginTop: 4 },
  weatherIcon: { fontSize: 64, lineHeight: 1 },
  tempDisplay: { fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1, marginBottom: 8 },
  feelsLike: { color: "var(--muted)", fontSize: 15, marginBottom: 12 },
  minMax: { fontSize: 16, fontWeight: 500 },
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12,
  },
  statCard: { textAlign: "center", padding: 20 },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  statLabel: { fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 },
  forecastSection: { maxWidth: 1000, margin: "20px auto 0", padding: "0 20px" },
  forecastTitle: { fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--muted)" },
  forecastRow: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 },
  forecastCard: { minWidth: 120, textAlign: "center", padding: "16px 12px", flexShrink: 0 },
  forecastTime: { fontSize: 12, color: "var(--muted)", marginBottom: 8 },
  forecastIcon: { fontSize: 32, marginBottom: 8 },
  forecastTemp: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  forecastHum: { fontSize: 12, color: "var(--muted)" },
  empty: { textAlign: "center", padding: "80px 20px", color: "var(--muted)" },
};
