import { Link } from "react-router-dom";
import { FiCode, FiCpu, FiZap, FiArrowRight } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <div className="hero">
        <h1>Sharpen your code. Beat the judge.</h1>
        <p>
          Solve algorithmic problems, get instant verdicts across multiple languages,
          and unblock yourself with AI-generated hints — without spoiling the answer.
        </p>
        <div className="hero-actions">
          <Link to={user ? "/problems" : "/register"}>
            <button>
              {user ? "Go to Problems" : "Get Started"} <FiArrowRight />
            </button>
          </Link>
          {!user && (
            <Link to="/login">
              <button className="secondary">Login</button>
            </Link>
          )}
        </div>
      </div>

      <div className="feature-grid">
        <div className="card">
          <div className="feature-icon"><FiCode /></div>
          <h3 style={{ fontSize: 16 }}>Multi-language judging</h3>
          <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
            Submit in JavaScript, Python, C++, or Java. Code runs in an isolated
            sandbox and is checked against hidden test cases automatically.
          </p>
        </div>
        <div className="card">
          <div className="feature-icon"><FiZap /></div>
          <h3 style={{ fontSize: 16 }}>Instant verdicts</h3>
          <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
            Get Accepted / Wrong Answer / Runtime Error feedback in seconds, with
            full output so you can debug quickly.
          </p>
        </div>
        <div className="card">
          <div className="feature-icon"><FiCpu /></div>
          <h3 style={{ fontSize: 16 }}>AI hints, not answers</h3>
          <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
            Stuck? Get a short conceptual nudge in the right direction — never a
            full solution.
          </p>
        </div>
      </div>
    </div>
  );
}
