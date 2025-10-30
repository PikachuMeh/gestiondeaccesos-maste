// App.jsx
import { Outlet } from "react-router-dom";
import Navbar from "./jsx/navbar/navbar";
import { useAuth } from "./jsx/auth/AuthContext";

export default function App() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
     
      <Navbar />
      <main style={{ padding: "24px" }}>
        <Outlet />
      </main>
    </>
  );
  
}