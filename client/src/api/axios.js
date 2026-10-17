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

// An expired or revoked session used to surface as a confusing error banner on
// every action. Send the user back to sign in instead. Only the auth middleware's
// "Not authorized" replies count: a wrong current-password answer is also a 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "";
    const status = error.response?.status;
    // 401 "Not authorized": expired/invalid token. 403 "deactivated"/"pending approval":
    // an admin cut the account off - the session is unusable, so sign out instead of
    // showing an error on every action.
    const sessionDead =
      (status === 401 && /not authorized/i.test(message)) ||
      (status === 403 && /deactivated|pending admin approval/i.test(message));
    if (sessionDead && localStorage.getItem("sanitizer_token")) {
      localStorage.removeItem("sanitizer_token");
      if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export default api;
