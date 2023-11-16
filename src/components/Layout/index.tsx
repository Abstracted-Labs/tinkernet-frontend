import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import Header from "./Header";

import pattern from "../../assets/pattern.svg";

const Layout = () => {
  return (
    <div
      className="bg-neutral-900"
      aria-hidden="true"
      style={{
        backgroundImage: `url(${ pattern })`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >

      <Header />

      <main className="relative min-h-screen py-8 text-white">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
