import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type ApiStatus = "checking" | "ok" | "unreachable";

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/health`)
      .then((res) => {
        if (!cancelled) setApiStatus(res.ok ? "ok" : "unreachable");
      })
      .catch(() => {
        if (!cancelled) setApiStatus("unreachable");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Seller</h1>
      <p>
        API status:{" "}
        {apiStatus === "checking" && "checking..."}
        {apiStatus === "ok" && "connected"}
        {apiStatus === "unreachable" && "unreachable"}
      </p>
    </main>
  );
}

export default App;
