import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import Header from "./Header";

const Layout = () => {
  return (
    <>
      <Header />

      <main className="relative flex h-[calc(100vh_-_12rem)] items-center justify-center overflow-hidden">
        <Outlet />
      </main>

      <Footer />
    </>
  );
};

export default Layout;
