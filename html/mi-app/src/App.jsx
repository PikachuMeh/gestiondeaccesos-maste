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
    <div className="min-h-screen bg-surface-variant">
      <Navbar />
      <main className="p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
  
}