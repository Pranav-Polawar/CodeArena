import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { FiPlay, FiCpu, FiCheckCircle, FiXCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../api";

const LANGUAGES = [
  { id: "javascript", name: "JavaScript (Node.js)", ext: javascript(), stub: "function solve() {\n  \n}\n\nconsole.log(solve());\n" },
  { id: "python", name: "Python 3", ext: python(), stub: "def solve():\n    pass\n\nprint(solve())\n" },
  { id: "cpp", name: "C++ (GCC)", ext: cpp(), stub: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  \n  return 0;\n}\n" },
  { id: "java", name: "Java", ext: java(), stub: "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    \n  }\n}\n" },
];

export default function ProblemDetail() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [languageId, setLanguageId] = useState(LANGUAGES[0].id);
  const [code, setCode] = useState(LANGUAGES[0].stub);
  const [result, setResult] = useState(null);
  const [hint, setHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    api.get(`/problems/${id}`)
      .then((res) => setProblem(res.data))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load problem"))
      .finally(() => setPageLoading(false));
  }, [id]);

  const currentLang = LANGUAGES.find((l) => l.id === languageId);

  const handleLanguageChange = (newId) => {
    setLanguageId(newId);
    const lang = LANGUAGES.find((l) => l.id === newId);
    setCode(lang.stub);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/submissions", { problemId: id, code, languageId });
      setResult(data);
      if (data.verdict === "Accepted") toast.success("Accepted! 🎉");
      else toast.error(data.verdict);
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const handleHint = async () => {
    setHintLoading(true);
    setHint("");
    try {
      const { data } = await api.post("/ai/hint", { problemId: id });
      setHint(data.hint);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not get a hint right now.");
    } finally {
      setHintLoading(false);
    }
  };

  if (pageLoading) return <div className="container">Loading...</div>;
  if (!problem) return <div className="container">Problem not found.</div>;

  return (
    <div className="container">
      <h2>{problem.title} <span className={`badge ${problem.difficulty}`}>{problem.difficulty}</span></h2>

      <div className="card">
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{problem.description}</p>
        {problem.constraints && (
          <p><strong>Constraints:</strong> {problem.constraints}</p>
        )}
        {problem.testCases?.[0] && (
          <>
            <label>Sample Input</label>
            <div className="pre-box">{problem.testCases[0].input}</div>
            <label style={{ marginTop: 10, display: "block" }}>Sample Output</label>
            <div className="pre-box">{problem.testCases[0].expectedOutput}</div>
          </>
        )}
      </div>

      <div className="card">
        <div className="filter-row" style={{ marginBottom: 4 }}>
          <select value={languageId} onChange={(e) => handleLanguageChange(e.target.value)} style={{ flex: "0 0 220px" }}>
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={handleSubmit} disabled={loading || !code}>
            {loading ? <span className="spinner" /> : <FiPlay />} {loading ? "Running..." : "Submit"}
          </button>
          <button className="ai" onClick={handleHint} disabled={hintLoading}>
            {hintLoading ? <span className="spinner" /> : <FiCpu />} AI Hint
          </button>
        </div>

        <div className="editor-wrap">
          <CodeMirror
            value={code}
            height="320px"
            theme="dark"
            extensions={[currentLang.ext]}
            onChange={(val) => setCode(val)}
          />
        </div>

        {result && (
          <div className="card" style={{ marginTop: 14, marginBottom: 0, background: "var(--bg-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
              {result.verdict === "Accepted" ? <FiCheckCircle color="var(--success)" /> : <FiXCircle color="var(--danger)" />}
              {result.verdict}
            </div>
            {result.output && <div className="pre-box" style={{ marginTop: 10 }}>{result.output}</div>}
          </div>
        )}

        {hint && (
          <div className="card" style={{ marginTop: 14, marginBottom: 0, borderColor: "#7c3aed" }}>
            <div style={{ fontWeight: 700, color: "#a78bfa", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <FiCpu /> AI Hint
            </div>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
