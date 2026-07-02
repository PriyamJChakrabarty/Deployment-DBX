const cardStyle = {
  width: "min(520px, calc(100vw - 32px))",
  background: "#0e191f",
  border: "1px solid rgba(61,220,132,0.22)",
  borderRadius: "16px",
  padding: "28px",
  boxShadow: "0 0 40px rgba(61,220,132,0.08)",
};

export default function ClerkSetupCard({ title, message }) {
  return (
    <div style={cardStyle}>
      <p
        style={{
          margin: "0 0 10px 0",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#3ddc84",
        }}
      >
        Clerk Setup Required
      </p>
      <h1
        style={{
          margin: "0 0 12px 0",
          fontSize: "28px",
          lineHeight: 1.15,
          color: "#e8f0f3",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: "15px",
          lineHeight: 1.7,
          color: "#8ba0a6",
        }}
      >
        {message}
      </p>
    </div>
  );
}
