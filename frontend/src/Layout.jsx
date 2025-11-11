import Header from "./components/Header";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div style={{ display: "flex" }}>
      <Header />
      <main
        style={{
          flexGrow: 1,
          padding: "32px",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
