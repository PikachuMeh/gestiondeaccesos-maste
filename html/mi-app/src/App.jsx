import { Outlet } from "react-router-dom";
import Navbar from "./jsx/navbar/navbar";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
