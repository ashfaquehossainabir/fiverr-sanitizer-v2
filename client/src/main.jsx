import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

// Fade out and remove the HTML-level splash screen now that React has
// taken over rendering (App/ProtectedRoute show their own loader while
// the auth check resolves).
const initialLoader = document.getElementById("initial-loader");
if (initialLoader) {
  requestAnimationFrame(() => {
    initialLoader.classList.add("il-hide");
    setTimeout(() => initialLoader.remove(), 300);
  });
}
