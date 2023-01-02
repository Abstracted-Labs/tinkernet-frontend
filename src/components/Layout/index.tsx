import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import Header from "./Header";

const Layout = () => {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-neutral-900 py-8 text-white">
        <Outlet />
      </main>

      <Footer />
    </>
  );
};

export default Layout;
