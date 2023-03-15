import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import Header from "./Header";

import pattern from "../../assets/pattern.svg";

const Layout = () => {
  return (
    <div className="bg-neutral-900">
      <div
        className="pointer-events-none absolute inset-y-0 h-screen overflow-hidden"
        aria-hidden="true"
      >
        {Array.from({ length: 10 }).map((_, i) => {
          return <img src={pattern} key={`${pattern}-${i}`} alt="pattern" />;
        })}
      </div>

      <Header />

      <main className="relative min-h-screen py-8 text-white">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
