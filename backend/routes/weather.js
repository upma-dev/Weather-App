const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/auth");

const BASE_URL = "https://api.openweathermap.org/data/2.5";

// ─── GET /api/weather?city=London ────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    let url;
    if (lat && lon) {
      url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_API_KEY}&units=metric`;
    } else if (city) {
      url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${process.env.WEATHER_API_KEY}&units=metric`;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Provide city or coordinates." });
    }

    const { data } = await axios.get(url);

    res.json({
      success: true,
      weather: {
        city: data.name,
        country: data.sys.country,
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        tempMin: Math.round(data.main.temp_min),
        tempMax: Math.round(data.main.temp_max),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        windDeg: data.wind.deg,
        visibility: data.visibility,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        main: data.weather[0].main,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
        timezone: data.timezone,
        dt: data.dt,
      },
    });
  } catch (err) {
    if (err.response?.status === 404)
      return res
        .status(404)
        .json({ success: false, message: "City not found." });
    console.error("Weather API error:", err.message);
    res.status(500).json({ success: false, message: "Weather service error." });
  }
});

// ─── GET /api/weather/forecast?city=London ────────────────────────────────────
router.get("/forecast", async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    let url;
    if (lat && lon) {
      url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_API_KEY}&units=metric&cnt=8`;
    } else if (city) {
      url = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${process.env.WEATHER_API_KEY}&units=metric&cnt=8`;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Provide city or coordinates." });
    }

    const { data } = await axios.get(url);

    const forecast = data.list.map((item) => ({
      dt: item.dt,
      temp: Math.round(item.main.temp),
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      main: item.weather[0].main,
      humidity: item.main.humidity,
      windSpeed: item.wind.speed,
    }));

    res.json({
      success: true,
      city: data.city.name,
      country: data.city.country,
      forecast,
    });
  } catch (err) {
    if (err.response?.status === 404)
      return res
        .status(404)
        .json({ success: false, message: "City not found." });
    console.error("Forecast error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Forecast service error." });
  }
});

module.exports = router;
