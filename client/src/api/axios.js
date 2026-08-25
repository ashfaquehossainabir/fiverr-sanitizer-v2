import axios from "axios";

// In local dev this falls back to the relative "/api" path, which Vite's
// dev server proxies to http://localhost:5000 (see vite.config.js).
// In production (e.g. frontend on Vercel, backend on Render) the two apps
// live on different domains, so VITE_API_URL must be set at build time to
// the deployed backend's URL, e.g. https://your-backend.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sanitizer_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
