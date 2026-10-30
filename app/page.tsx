export default function Home() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", maxWidth: 680, margin: "70px auto", padding: 24, lineHeight: 1.6 }}>
      <h1>12-Hour Redirect System</h1>
      <p>Use the redirect endpoint below. It sends a visitor to Link 1 on their first visit, then Link 2 for every further visit during the next 12 hours.</p>
      <p><a href="/api/redirect">Open redirect link</a></p>
      <p style={{ color: "#666", fontSize: 14 }}>After 12 hours from the first visit, the next visit starts a new window and goes to Link 1 again.</p>
    </main>
  );
}
