import axios from "axios";

const API = axios.create({ baseURL: "/api" });

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
