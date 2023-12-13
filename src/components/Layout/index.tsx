import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import Header from "./Header";

import pattern from "../../assets/pattern.svg";

const Layout = () => {
  return (
    <div
      className="bg-neutral-900 h-screen overflow-y-hidden flex flex-col justify-between"
      aria-hidden="true"
      style={{
        backgroundImage: `url(${ pattern })`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'stretch',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >

      <Header />

      <main className="relative py-8 text-white tinker-scrollbar scrollbar scrollbar-thumb-amber-300 overflow-y-auto">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
