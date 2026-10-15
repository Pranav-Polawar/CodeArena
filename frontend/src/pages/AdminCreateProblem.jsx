import { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function AdminCreateProblem() {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", difficulty: "Easy", constraints: "" });
  const [testCases, setTestCases] = useState([{ input: "", expectedOutput: "" }]);
  const [submitting, setSubmitting] = useState(false);

  if (user?.role !== "admin") {
    return <div className="container"><div className="card">Admin access only.</div></div>;
  }

  const updateTestCase = (i, field, value) => {
    const next = [...testCases];
    next[i][field] = value;
    setTestCases(next);
  };

  const addTestCase = () => setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  const removeTestCase = (i) => setTestCases(testCases.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/problems", { ...form, testCases });
      toast.success("Problem created!");
      setForm({ title: "", description: "", difficulty: "Easy", constraints: "" });
      setTestCases([{ input: "", expectedOutput: "" }]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create problem");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Create Problem</h2>
        <form onSubmit={handleSubmit}>
          <label>Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />

          <label>Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />

          <label>Difficulty</label>
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>

          <label>Constraints (optional)</label>
          <input value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} />

          <label>Test Cases (first one shown to users as a sample)</label>
          {testCases.map((tc, i) => (
            <div key={i} className="testcase-row" style={{ marginBottom: 10 }}>
              <textarea
                rows={2}
                placeholder={`Input #${i + 1}`}
                value={tc.input}
                onChange={(e) => updateTestCase(i, "input", e.target.value)}
                style={{ margin: 0 }}
                required
              />
              <textarea
                rows={2}
                placeholder={`Expected output #${i + 1}`}
                value={tc.expectedOutput}
                onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                style={{ margin: 0 }}
                required
              />
              <button
                type="button"
                className="ghost"
                onClick={() => removeTestCase(i)}
                disabled={testCases.length === 1}
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={addTestCase} style={{ marginBottom: 16 }}>
            <FiPlus /> Add test case
          </button>

          <div>
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Problem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
