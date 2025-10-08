import { useEffect, useRef } from "react";

export default function Items() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;      // evita segunda ejecución en StrictMode
    didRun.current = true;

    fetch("http://localhost:8000/")
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(console.log)
      .catch(console.error);
  }, []);

  return null;
}