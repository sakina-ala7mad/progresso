export default function Header() {
  return (
    <header style={{
      padding: "1rem",
      background: "rgba(255, 255, 255, 0.95)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
      backdropFilter: "blur(10px)",
      marginBottom: "1rem"
    }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#333" }}>
        🧠 Sakina's Productivity App
      </h1>
    </header>
  );
}
