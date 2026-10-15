import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiInbox } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../api";

export default function Problems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");

  useEffect(() => {
    api.get("/problems")
      .then((res) => setProblems(res.data))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load problems"))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    total: problems.length,
    Easy: problems.filter((p) => p.difficulty === "Easy").length,
    Medium: problems.filter((p) => p.difficulty === "Medium").length,
    Hard: problems.filter((p) => p.difficulty === "Hard").length,
  }), [problems]);

  const filtered = problems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficulty === "All" || p.difficulty === difficulty;
    return matchesSearch && matchesDifficulty;
  });

  if (loading) return <div className="container">Loading problems...</div>;

  return (
    <div className="container">
      <h2>Problems</h2>

      <div className="stats-row">
        <div className="card stat-card">
          <div className="stat-num">{counts.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="card stat-card">
          <div className="stat-num" style={{ color: "var(--success)" }}>{counts.Easy}</div>
          <div className="stat-label">Easy</div>
        </div>
        <div className="card stat-card">
          <div className="stat-num" style={{ color: "var(--warning)" }}>{counts.Medium}</div>
          <div className="stat-label">Medium</div>
        </div>
        <div className="card stat-card">
          <div className="stat-num" style={{ color: "#f87171" }}>{counts.Hard}</div>
          <div className="stat-label">Hard</div>
        </div>
      </div>

      <div className="filter-row">
        <div style={{ position: "relative", flex: 1 }}>
          <FiSearch style={{ position: "absolute", left: 12, top: 12, color: "var(--text-dim)" }} />
          <input
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 34, margin: 0 }}
          />
        </div>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option>All</option>
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <FiInbox />
          <p>No problems match your search.</p>
        </div>
      ) : (
        filtered.map((p) => (
          <Link to={`/problems/${p._id}`} key={p._id} className="card card-hover" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "var(--text)" }}>{p.title}</strong>
            <span className={`badge ${p.difficulty}`}>{p.difficulty}</span>
          </Link>
        ))
      )}
    </div>
  );
}
