import { Routes, Route, Link, Navigate } from "react-router-dom";
import { FiTerminal, FiList, FiPlusCircle, FiClock, FiLogOut } from "react-icons/fi";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Problems from "./pages/Problems";
import ProblemDetail from "./pages/ProblemDetail";
import AdminCreateProblem from "./pages/AdminCreateProblem";
import MySubmissions from "./pages/MySubmissions";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const { user, logout } = useAuth();

  return (
    <>
      <nav>
        <Link to="/" className="brand"><FiTerminal size={20} /> CodeArena</Link>
        {user && (
          <>
            <Link to="/problems" className="navlink"><FiList /> Problems</Link>
            <Link to="/submissions" className="navlink"><FiClock /> My Submissions</Link>
            {user.role === "admin" && (
              <Link to="/admin/create" className="navlink"><FiPlusCircle /> Add Problem</Link>
            )}
          </>
        )}
        <div className="nav-right">
          {user ? (
            <>
              <div className="user-pill">
                <span className="avatar">{user.username?.[0]?.toUpperCase()}</span>
                {user.username}
              </div>
              <button className="ghost" onClick={logout}><FiLogOut /></button>
            </>
          ) : (
            <>
              <Link to="/login" className="navlink">Login</Link>
              <Link to="/register"><button>Get Started</button></Link>
            </>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/problems" element={<PrivateRoute><Problems /></PrivateRoute>} />
        <Route path="/problems/:id" element={<PrivateRoute><ProblemDetail /></PrivateRoute>} />
        <Route path="/submissions" element={<PrivateRoute><MySubmissions /></PrivateRoute>} />
        <Route path="/admin/create" element={<PrivateRoute><AdminCreateProblem /></PrivateRoute>} />
      </Routes>
    </>
  );
}
