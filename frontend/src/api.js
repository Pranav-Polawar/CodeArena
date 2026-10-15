import axios from "axios";

const rawUrl = import.meta.env.VITE_API_URL;
const baseURL = (rawUrl && rawUrl.trim() !== "") ? rawUrl : "/api";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
