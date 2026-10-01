import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "./AdminApp.jsx";
import App from "./App.jsx";
import "./index.css";

const RootApp =
  window.location.pathname.replace(/\/+$/, "") === "/admin" ? AdminApp : App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
