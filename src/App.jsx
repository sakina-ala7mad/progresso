import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Todo from "./pages/Todo";
import Habits from "./pages/Habits";
import Goals from "./pages/Goals";
import Timer from "./pages/Timer";

const navStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  padding: "0.5rem 1rem",
  background: "rgba(255, 255, 255, 0.9)",
  borderRadius: "12px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
  backdropFilter: "blur(10px)",
};

function App() {
  return (
    <BrowserRouter>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "1rem" }}>
        <Header />
        <nav style={{ margin: "1rem 0" }}>
          <div style={navStyle}>
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/todo">To-Do</NavLink>
            <NavLink to="/habits">Habits</NavLink>
            <NavLink to="/goals">Goals</NavLink>
            <NavLink to="/timer">Timer</NavLink>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/todo" element={<Todo />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/timer" element={<Timer />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

