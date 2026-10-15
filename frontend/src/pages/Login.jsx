import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiLogIn } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/problems");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 380, margin: "40px auto" }}>
        <h2>Welcome back</h2>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? <span className="spinner" /> : <FiLogIn />} Login
          </button>
        </form>
        <p style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 14 }}>
          No account? <Link to="/register" style={{ color: "var(--primary)" }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
