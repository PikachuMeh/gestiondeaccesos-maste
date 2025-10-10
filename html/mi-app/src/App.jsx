// App.jsx
import { Outlet } from "react-router-dom";
import Navbar from "./jsx/navbar/navbar";

export default function App() {
  return (
    <>

      <Navbar />
      <main style={{ padding: "24px" }}>
        <Outlet />
      </main>
    </>
  );
  
}