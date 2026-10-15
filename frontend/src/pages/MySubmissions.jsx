import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiInbox, FiClock } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../api";

export default function MySubmissions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/submissions/mine")
      .then((res) => setSubs(res.data))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load submissions"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading submissions...</div>;

  return (
    <div className="container">
      <h2>My Submissions</h2>
      {subs.length === 0 ? (
        <div className="empty-state">
          <FiInbox />
          <p>No submissions yet. Go solve something!</p>
        </div>
      ) : (
        subs.map((s) => (
          <div className="card" key={s._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Link to={`/problems/${s.problem?._id}`} style={{ color: "var(--text)", fontWeight: 600, textDecoration: "none" }}>
                {s.problem?.title || "Deleted problem"}
              </Link>
              <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <FiClock /> {new Date(s.createdAt).toLocaleString()}
              </div>
            </div>
            <span className={`badge verdict-${s.verdict === "Accepted" ? "Accepted" : "Pending"}`}>
              {s.verdict}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
