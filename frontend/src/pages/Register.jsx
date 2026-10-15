import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiUserPlus } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(username, email, password);
      toast.success("Account created!");
      navigate("/problems");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 380, margin: "40px auto" }}>
        <h2>Create your account</h2>
        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? <span className="spinner" /> : <FiUserPlus />} Create account
          </button>
        </form>
        <p style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 14 }}>
          Have an account? <Link to="/login" style={{ color: "var(--primary)" }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
