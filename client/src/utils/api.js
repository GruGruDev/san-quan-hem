const DEFAULT_SERVER_URL = import.meta.env.PROD
  ? "https://san-quan-hem-backend.onrender.com"
  : "http://localhost:3001";

export const SERVER_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  DEFAULT_SERVER_URL
).replace(/\/+$/, "");

export const apiUrl = (path) =>
  `${SERVER_URL}${path.startsWith("/") ? path : `/${path}`}`;
