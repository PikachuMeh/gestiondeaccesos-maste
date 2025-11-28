import { Outlet } from "react-router-dom";
import Navbar from "./jsx/navbar/navbar";

export default function App() {
  return (
    <div>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
