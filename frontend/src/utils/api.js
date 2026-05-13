import axios from "axios";

// Dev: CRA proxy → "/api". Production: set REACT_APP_API_URL on Vercel (e.g. https://your-api.onrender.com/api)
const baseURL = process.env.REACT_APP_API_URL || "/api";

const API = axios.create({ baseURL });

// Auth
export const registerUser = (data) => API.post("/auth/register", data);
export const verifyOTP = (data) => API.post("/auth/verify-otp", data);
export const resendOTP = (data) => API.post("/auth/resend-otp", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const loginVerify = (data) => API.post("/auth/login-verify", data);
export const forgotPassword = (data) => API.post("/auth/forgot-password", data);
export const resetPassword = (data) => API.post("/auth/reset-password", data);

// Weather
export const getWeather = (params) => API.get("/weather", { params });
export const getForecast = (params) => API.get("/weather/forecast", { params });
