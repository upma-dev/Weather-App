import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getWeather, getForecast } from "../utils/api";
import { useBreakpoint } from "../hooks/useBreakpoint";

const RECENT_KEY = "weatherAppRecentCities";
const MAX_RECENT = 6;

// ─── OpenWeatherMap: `timezone` = seconds offset from UTC for the city's civil time ───
const cityShiftedDate = (unixUtc, tzSec) => new Date((unixUtc + tzSec) * 1000);

const formatCityTime = (unixUtc, tzSec) => {
  const d = cityShiftedDate(unixUtc, tzSec);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = ((h + 11) % 12) + 1;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
};

const formatCityTimeShort = (unixUtc, tzSec) => {
  const d = cityShiftedDate(unixUtc, tzSec);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const formatCityFullDate = (unixUtc, tzSec) => {
  const d = cityShiftedDate(unixUtc, tzSec);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

const cityLocalHour = (unixUtc, tzSec) => cityShiftedDate(unixUtc, tzSec).getUTCHours();

const dayKey = (unixUtc, tzSec) => {
  const d = cityShiftedDate(unixUtc, tzSec);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
};

const isDaytimeAtCity = (nowUnix, sunrise, sunset) => nowUnix >= sunrise && nowUnix < sunset;

const daypartGreeting = (hour) => {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
};

const modeString = (arr) => {
  const counts = {};
  for (const x of arr) counts[x] = (counts[x] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Clear";
};

const ICON_MAP = {
  Clear: "☀️",
  Clouds: "☁️",
  Rain: "🌧️",
  Drizzle: "🌦️",
  Thunderstorm: "⛈️",
  Snow: "❄️",
  Mist: "🌫️",
  Fog: "🌫️",
  Haze: "🌁",
  Smoke: "💨",
  Dust: "🌪️",
  Sand: "🌪️",
  Ash: "🌋",
  Squall: "💨",
  Tornado: "🌪️",
};

const getIcon = (main) => ICON_MAP[main] || "🌡️";

const WIND_DIR = (deg) => {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
};

function readRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string" && x.trim()) : [];
  } catch {
    return [];
  }
}

function saveRecent(cities) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(cities.slice(0, MAX_RECENT)));
}

function pushRecentCity(name) {
  const n = name.trim();
  if (!n) return;
  const prev = readRecent().filter((c) => c.toLowerCase() !== n.toLowerCase());
  saveRecent([n, ...prev]);
}

function buildDailySummary(forecast, tzSec, todayDtKey) {
  if (!forecast?.length || tzSec == null) return [];
  const map = new Map();
  for (const f of forecast) {
    const key = dayKey(f.dt, tzSec);
    if (!map.has(key))
      map.set(key, { temps: [], mains: [], pops: [] });
    const g = map.get(key);
    g.temps.push(f.temp);
    g.mains.push(f.main);
    if (f.pop != null) g.pops.push(f.pop);
  }
  const rows = [...map.entries()].map(([key, g]) => ({
    key,
    min: Math.min(...g.temps),
    max: Math.max(...g.temps),
    main: modeString(g.mains),
    popMax: g.pops.length ? Math.max(...g.pops) : null,
  }));
  rows.sort((a, b) => a.key.localeCompare(b.key));
  const sliced = rows.slice(0, 5);
  const keys = sliced.map((r) => r.key);
  const todayIdx = keys.indexOf(todayDtKey);
  return sliced.map((row) => {
    let label;
    const i = keys.indexOf(row.key);
    if (row.key === todayDtKey) label = "Today";
    else if (todayIdx >= 0 && i === todayIdx + 1) label = "Tomorrow";
    else {
      const [y, mo, d] = row.key.split("-").map(Number);
      const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        new Date(Date.UTC(y, mo, d)).getUTCDay()
      ];
      label = wd;
    }
    return { ...row, label };
  });
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [, setCity] = useState("Delhi");
  const [search, setSearch] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [forecastTz, setForecastTz] = useState(0);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("C");
  const [recent, setRecent] = useState(readRecent);

  const lastQueryRef = useRef({ type: "city", value: "Delhi" });

  const tz = weather?.timezone ?? 0;
  const nowUnix = weather?.dt ?? Math.floor(Date.now() / 1000);
  const isDay = weather ? isDaytimeAtCity(nowUnix, weather.sunrise, weather.sunset) : true;
  const localHour = weather ? cityLocalHour(nowUnix, tz) : 12;
  const todayDtKey = weather ? dayKey(nowUnix, tz) : "";

  const daily = useMemo(
    () => buildDailySummary(forecast, forecastTz || tz, todayDtKey),
    [forecast, forecastTz, tz, todayDtKey]
  );

  const theme = useMemo(() => {
    if (isDay) {
      return {
        pageBg:
          "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(30,58,138,0.35) 40%, rgba(6,182,212,0.12) 100%)",
        mainCardBg:
          "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(251,191,36,0.08), rgba(6,182,212,0.1))",
        mainBorder: "rgba(59,130,246,0.35)",
        accentGlow: "rgba(251,191,36,0.15)",
      };
    }
    return {
      pageBg:
        "linear-gradient(180deg, rgba(6,11,20,0.95) 0%, rgba(30,27,75,0.45) 50%, rgba(15,23,42,0.9) 100%)",
      mainCardBg:
        "linear-gradient(135deg, rgba(49,46,129,0.35), rgba(30,58,138,0.2), rgba(15,23,42,0.5))",
      mainBorder: "rgba(99,102,241,0.35)",
      accentGlow: "rgba(129,140,248,0.12)",
    };
  }, [isDay]);

  const bp = useBreakpoint();
  const layout = useMemo(() => {
    const { width, isXs, isSm, isMd } = bp;
    /** Only stack search full-width on very narrow screens */
    const stackSearch = width < 360;
    /** Large phones (e.g. Galaxy S20 Ultra ~412px portrait) — compact row, not huge stacked blocks */
    const compactPhone = width < 560;

    return {
      header: {
        flexDirection: isMd ? "column" : "row",
        alignItems: isMd ? "stretch" : "center",
        justifyContent: isMd ? "flex-start" : "space-between",
        padding: isSm ? "14px 16px" : "20px 32px",
        gap: isMd ? 12 : 0,
      },
      headerLeft: { flexWrap: "wrap", gap: isSm ? 8 : 12 },
      headerRight: {
        justifyContent: isMd ? "flex-start" : "flex-end",
        width: isMd ? "100%" : "auto",
        gap: isSm ? 8 : 10,
        flexWrap: "wrap",
      },
      logoText: { fontSize: isSm ? 17 : 20 },
      userName: {
        maxWidth: isMd ? "100%" : 200,
        fontSize: isSm ? 13 : 14,
        textAlign: isMd ? "left" : "right",
        width: isMd ? "100%" : "auto",
      },
      searchForm: {
        flexDirection: stackSearch ? "column" : "row",
        flexWrap: "wrap",
        alignItems: stackSearch ? "stretch" : "center",
        gap: compactPhone ? 8 : 10,
        margin: compactPhone ? "12px auto 0" : "28px auto 0",
        maxWidth: "min(900px, 100%)",
        paddingLeft: compactPhone ? 12 : 20,
        paddingRight: compactPhone ? 12 : 20,
        boxSizing: "border-box",
      },
      searchInput: {
        flex: stackSearch ? "1 1 auto" : "1 1 min(0, 1fr)",
        width: stackSearch ? "100%" : undefined,
        minWidth: stackSearch ? undefined : 0,
        fontSize: compactPhone ? 15 : 16,
        padding: compactPhone ? "11px 12px" : "12px 14px",
        minHeight: compactPhone ? 44 : undefined,
      },
      searchBtn: {
        width: stackSearch ? "100%" : "auto",
        flex: stackSearch ? undefined : "0 0 auto",
        padding: compactPhone ? "11px 18px" : "14px 24px",
        fontSize: compactPhone ? 14 : 15,
        minHeight: compactPhone ? 44 : undefined,
      },
      geoBtn: {
        width: stackSearch ? "100%" : "auto",
        flex: stackSearch ? undefined : "0 0 auto",
        padding: compactPhone ? "11px 14px" : "12px 16px",
        fontSize: compactPhone ? 13 : 14,
        minHeight: compactPhone ? 44 : undefined,
        border: "1px solid var(--glass-border)",
        borderRadius: 10,
        background: "rgba(255,255,255,0.06)",
        color: "var(--accent)",
        fontWeight: 600,
      },
      cityRow: {
        flexDirection: isMd ? "column" : "row",
        alignItems: isMd ? "center" : "flex-start",
        textAlign: isMd ? "center" : "left",
      },
      cityName: { fontSize: isSm ? "clamp(1.25rem, 5.5vw, 1.75rem)" : 28 },
      desc: { fontSize: isSm ? 14 : 15 },
      sunRow: {
        flexDirection: isSm ? "column" : "row",
        alignItems: isMd ? "center" : "flex-start",
        justifyContent: isMd ? "center" : "flex-start",
        gap: isSm ? 6 : "12px 20px",
        fontSize: isSm ? 12 : 13,
      },
      weatherIcon: {
        fontSize: isMd ? 56 : 64,
        alignSelf: isMd ? "center" : "auto",
      },
      tempDisplay: {
        fontSize: isSm ? "clamp(2.75rem, 12vw, 4.5rem)" : 72,
        textAlign: isMd ? "center" : "left",
      },
      feelsLike: { textAlign: isMd ? "center" : "left" },
      minMax: { textAlign: isMd ? "center" : "left" },
      mainCardPad: { padding: isSm ? "20px 16px" : 32 },
      statsGrid: {
        gridTemplateColumns: isXs
          ? "repeat(2, minmax(0, 1fr))"
          : isSm
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(auto-fit, minmax(140px, 1fr))",
      },
      statCard: { padding: isSm ? 14 : 20 },
      statValue: { fontSize: isSm ? 14 : 16 },
      dailyRow: {
        gridTemplateColumns: isXs
          ? "repeat(2, minmax(0, 1fr))"
          : "repeat(auto-fit, minmax(min(100%, 108px), 1fr))",
      },
      forecastRow: {
        gap: isSm ? 8 : 12,
        WebkitOverflowScrolling: "touch",
        paddingBottom: isSm ? 12 : 8,
      },
      forecastCard: {
        minWidth: isSm ? 90 : 112,
        padding: isSm ? "12px 8px" : "14px 10px",
      },
      localMeta: {
        fontSize: isSm ? 12 : 13,
        padding: isSm ? "0 12px" : "0 16px",
      },
      sectionPad: { paddingLeft: isSm ? 12 : 20, paddingRight: isSm ? 12 : 20 },
    };
  }, [bp]);

  const applyWeatherPayload = useCallback((w, fList, fTz) => {
    setWeather(w);
    setForecast(fList);
    setForecastTz(typeof fTz === "number" ? fTz : w.timezone ?? 0);
    setCity(w.city);
    pushRecentCity(w.city);
    setRecent(readRecent());
  }, []);

  const fetchByCity = useCallback(async (cityName) => {
    const q = cityName.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    lastQueryRef.current = { type: "city", value: q };
    try {
      const [wRes, fRes] = await Promise.all([
        getWeather({ city: q }),
        getForecast({ city: q }),
      ]);
      applyWeatherPayload(wRes.data.weather, fRes.data.forecast, fRes.data.timezone);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch weather.");
      setWeather(null);
      setForecast([]);
    }
    setLoading(false);
  }, [applyWeatherPayload]);

  const fetchByCoords = useCallback(async (lat, lon) => {
    setLoading(true);
    setError("");
    lastQueryRef.current = { type: "geo", lat, lon };
    try {
      const [wRes, fRes] = await Promise.all([
        getWeather({ lat, lon }),
        getForecast({ lat, lon }),
      ]);
      applyWeatherPayload(wRes.data.weather, fRes.data.forecast, fRes.data.timezone);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch weather for your location.");
      setWeather(null);
      setForecast([]);
    }
    setLoading(false);
  }, [applyWeatherPayload]);

  const refresh = useCallback(() => {
    const q = lastQueryRef.current;
    if (q.type === "geo") fetchByCoords(q.lat, q.lon);
    else fetchByCity(q.value);
  }, [fetchByCity, fetchByCoords]);

  useEffect(() => {
    fetchByCity("Delhi");
  }, [fetchByCity]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) fetchByCity(search.trim());
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setGeoLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        fetchByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGeoLoading(false);
        setError("Location permission denied or unavailable. Try searching a city.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toDisplay = (c) => (unit === "C" ? `${c}°C` : `${Math.round((c * 9) / 5 + 32)}°F`);

  const cityLine =
    weather &&
    `${weather.city}, ${weather.country} · Local ${formatCityTimeShort(nowUnix, tz)} · ${formatCityFullDate(nowUnix, tz)}`;

  return (
    <div className="dashboard-root" style={{ ...s.page, background: theme.pageBg }}>
      <header style={{ ...s.header, ...layout.header }}>
        <div style={{ ...s.headerLeft, ...layout.headerLeft }}>
          <span style={{ ...s.logoText, ...layout.logoText }}>⛅ WeatherApp</span>
          {weather && (
            <span style={s.dayNightPill} title="Based on sunrise & sunset in this city">
              {isDay ? "☀️ Day" : "🌙 Night"}
            </span>
          )}
        </div>
        <div style={{ ...s.headerRight, ...layout.headerRight }}>
          <span style={{ ...s.userName, ...layout.userName }}>
            {daypartGreeting(localHour)}, {user?.name?.split(" ")[0]} 👋
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            style={s.iconBtn}
            title="Refresh"
          >
            ↻
          </button>
          <button type="button" onClick={() => setUnit((u) => (u === "C" ? "F" : "C"))} style={s.unitBtn}>
            °{unit === "C" ? "F" : "C"}
          </button>
          <button onClick={handleLogout} style={s.logoutBtn}>
            Sign out
          </button>
        </div>
      </header>

      <form
        className="dashboard-search-form"
        onSubmit={handleSearch}
        style={{ ...s.searchForm, ...layout.searchForm }}
      >
        <input
          className="input"
          style={{ ...s.searchInput, ...layout.searchInput }}
          placeholder={bp.width < 560 ? "Search city…" : "Search city (e.g. London, Tokyo)…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" style={{ ...s.searchBtn, ...layout.searchBtn }} type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : "Search"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ ...s.geoBtn, ...layout.geoBtn }}
          onClick={handleMyLocation}
          disabled={loading || geoLoading}
        >
          {geoLoading ? "…" : bp.width < 560 && bp.width >= 360 ? "📍 Here" : "📍 My location"}
        </button>
      </form>

      {recent.length > 0 && (
        <div style={{ ...s.recentWrap, ...layout.sectionPad }}>
          <span style={s.recentLabel}>Recent</span>
          <div style={s.recentRow}>
            {recent.map((c) => (
              <button
                key={c}
                type="button"
                style={s.recentChip}
                onClick={() => {
                  setSearch("");
                  fetchByCity(c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          className="alert alert-error"
          style={{ maxWidth: 900, margin: "0 auto 20px", paddingLeft: layout.sectionPad.paddingLeft, paddingRight: layout.sectionPad.paddingRight }}
        >
          {error}
        </div>
      )}

      {weather && (
        <>
          <p style={{ ...s.localMeta, ...layout.localMeta }}>{cityLine}</p>
          <div style={{ ...s.grid, ...layout.sectionPad }}>
            <div
              className="card fade-up"
              style={{
                ...s.mainCard,
                ...layout.mainCardPad,
                background: theme.mainCardBg,
                borderColor: theme.mainBorder,
                boxShadow: `0 0 60px ${theme.accentGlow}`,
              }}
            >
              <div style={{ ...s.cityRow, ...layout.cityRow }}>
                <div>
                  <div style={{ ...s.cityName, ...layout.cityName }}>
                    {weather.city}, {weather.country}
                  </div>
                  <div style={{ ...s.desc, ...layout.desc }}>{weather.description}</div>
                  <div style={{ ...s.sunRow, ...layout.sunRow }}>
                    <span title="City local time">
                      🕐 {formatCityTime(nowUnix, tz)}
                    </span>
                    <span>
                      🌅 {formatCityTime(weather.sunrise, tz)}
                    </span>
                    <span>
                      🌇 {formatCityTime(weather.sunset, tz)}
                    </span>
                  </div>
                </div>
                <div style={{ ...s.weatherIcon, ...layout.weatherIcon }}>{getIcon(weather.main)}</div>
              </div>
              <div style={{ ...s.tempDisplay, ...layout.tempDisplay }}>{toDisplay(weather.temp)}</div>
              <div style={{ ...s.feelsLike, ...layout.feelsLike }}>Feels like {toDisplay(weather.feelsLike)}</div>

              <div style={{ ...s.minMax, ...layout.minMax }}>
                <span>↑ {toDisplay(weather.tempMax)}</span>
                <span style={{ color: "var(--muted)", margin: "0 8px" }}>|</span>
                <span>↓ {toDisplay(weather.tempMin)}</span>
              </div>
            </div>

            <div style={{ ...s.statsGrid, ...layout.statsGrid }}>
              {[
                { label: "Humidity", value: `${weather.humidity}%`, icon: "💧" },
                { label: "Wind", value: `${weather.windSpeed} m/s ${WIND_DIR(weather.windDeg)}`, icon: "💨" },
                { label: "Pressure", value: `${weather.pressure} hPa`, icon: "🔵" },
                { label: "Clouds", value: `${weather.clouds ?? 0}%`, icon: "☁️" },
                { label: "Visibility", value: `${(weather.visibility / 1000).toFixed(1)} km`, icon: "👁️" },
                { label: "Conditions", value: weather.main, icon: "🌡️" },
              ].map((stat) => (
                <div key={stat.label} className="card" style={{ ...s.statCard, ...layout.statCard }}>
                  <div style={s.statIcon}>{stat.icon}</div>
                  <div style={{ ...s.statValue, ...layout.statValue }}>{stat.value}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {daily.length > 0 && (
        <div style={{ ...s.dailySection, ...layout.sectionPad }}>
          <h3 style={s.sectionTitle}>5-day outlook</h3>
          <p style={s.sectionSub}>High / low in the city&apos;s local calendar days · max rain chance</p>
          <div style={{ ...s.dailyRow, ...layout.dailyRow }}>
            {daily.map((d) => (
              <div key={d.key} className="card" style={s.dailyCard}>
                <div style={s.dailyLabel}>{d.label}</div>
                <div style={s.dailyIcon}>{getIcon(d.main)}</div>
                <div style={s.dailyTemps}>
                  <span>{toDisplay(d.max)}</span>
                  <span style={{ color: "var(--muted)", fontWeight: 500 }}>{toDisplay(d.min)}</span>
                </div>
                {d.popMax != null && d.popMax > 0 && (
                  <div style={s.dailyPop}>🌧️ {d.popMax}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {forecast.length > 0 && (
        <div style={{ ...s.forecastSection, ...layout.sectionPad }}>
          <h3 style={s.sectionTitle}>3-hour steps (city local time)</h3>
          {bp.isSm && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              Swipe horizontally to see all hours →
            </p>
          )}
          <div style={{ ...s.forecastRow, ...layout.forecastRow }}>
            {forecast.map((f, i) => (
              <div key={`${f.dt}-${i}`} className="card" style={{ ...s.forecastCard, ...layout.forecastCard }}>
                <div style={s.forecastTime}>{formatCityTimeShort(f.dt, forecastTz || tz)}</div>
                <div style={s.forecastIcon}>{getIcon(f.main)}</div>
                <div style={s.forecastTemp}>{toDisplay(f.temp)}</div>
                <div style={s.forecastHum}>💧 {f.humidity}%</div>
                {f.pop != null && f.pop > 0 && <div style={s.forecastPop}>🌧️ {f.pop}%</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!weather && !loading && (
        <div style={s.empty}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🌍</div>
          <p>Search a city or use your location</p>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", padding: "0 0 48px", transition: "background 0.6s ease" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 32px",
    borderBottom: "1px solid var(--glass-border)",
    background: "rgba(0,0,0,0.25)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  logoText: { fontSize: 20, fontWeight: 700, letterSpacing: 0.5 },
  dayNightPill: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 999,
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    color: "var(--muted)",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  userName: { fontSize: 14, color: "var(--muted)", maxWidth: 200, textAlign: "right" },
  iconBtn: {
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    color: "var(--accent)",
    borderRadius: 8,
    width: 40,
    height: 36,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 18,
    lineHeight: 1,
  },
  unitBtn: {
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    color: "var(--accent)",
    borderRadius: 8,
    padding: "6px 14px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
  },
  logoutBtn: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.2)",
    color: "#fca5a5",
    borderRadius: 8,
    padding: "6px 14px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 14,
  },
  searchForm: {
    display: "flex",
    gap: 10,
    maxWidth: 900,
    margin: "28px auto 0",
    flexWrap: "wrap",
  },
  searchInput: { flex: "1 1 200px", fontSize: 16, minWidth: 0 },
  searchBtn: { width: "auto", padding: "14px 24px", flexShrink: 0 },
  geoBtn: { flexShrink: 0, whiteSpace: "nowrap" },
  recentWrap: { maxWidth: 900, margin: "16px auto 0" },
  recentLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted)", display: "block", marginBottom: 8 },
  recentRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  recentChip: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid var(--glass-border)",
    color: "var(--text)",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  localMeta: {
    textAlign: "center",
    color: "var(--muted)",
    fontSize: 13,
    marginTop: 20,
    padding: "0 16px",
    lineHeight: 1.5,
  },
  grid: { maxWidth: 1000, margin: "12px auto 0", display: "grid", gap: 20 },
  mainCard: {
    borderWidth: 1,
    borderStyle: "solid",
    transition: "background 0.5s ease, box-shadow 0.5s ease",
  },
  cityRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  cityName: { fontSize: 28, fontWeight: 700 },
  desc: { color: "var(--muted)", fontSize: 15, textTransform: "capitalize", marginTop: 4 },
  sunRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px 20px",
    marginTop: 12,
    fontSize: 13,
    color: "var(--muted)",
  },
  weatherIcon: { fontSize: 64, lineHeight: 1 },
  tempDisplay: { fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1, marginBottom: 8 },
  feelsLike: { color: "var(--muted)", fontSize: 15, marginBottom: 12 },
  minMax: { fontSize: 16, fontWeight: 500 },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
  },
  statCard: { textAlign: "center", padding: 20 },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  statLabel: { fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 },
  dailySection: { maxWidth: 1000, margin: "32px auto 0" },
  forecastSection: { maxWidth: 1000, margin: "28px auto 0" },
  sectionTitle: { fontSize: 18, fontWeight: 600, marginBottom: 6, color: "var(--text)" },
  sectionSub: { fontSize: 13, color: "var(--muted)", marginBottom: 16 },
  dailyRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: 12,
  },
  dailyCard: { textAlign: "center", padding: "16px 10px" },
  dailyLabel: { fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 },
  dailyIcon: { fontSize: 28, marginBottom: 8 },
  dailyTemps: { fontSize: 15, fontWeight: 700, display: "flex", justifyContent: "center", gap: 8 },
  dailyPop: { fontSize: 11, color: "var(--muted)", marginTop: 6 },
  forecastRow: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 },
  forecastCard: { minWidth: 112, textAlign: "center", padding: "14px 10px", flexShrink: 0 },
  forecastTime: { fontSize: 12, color: "var(--muted)", marginBottom: 8 },
  forecastIcon: { fontSize: 30, marginBottom: 8 },
  forecastTemp: { fontSize: 17, fontWeight: 700, marginBottom: 4 },
  forecastHum: { fontSize: 11, color: "var(--muted)" },
  forecastPop: { fontSize: 11, color: "var(--accent)", marginTop: 4 },
  empty: { textAlign: "center", padding: "80px 20px", color: "var(--muted)" },
};
