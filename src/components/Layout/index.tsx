import { Outlet } from "react-router-dom";
import Header from "./Header";
import pattern from "../../assets/pattern.svg";
import SideNav from "./SideNav";
import { useState } from "react";

const Layout = () => {
  const [navOpen, setNavOpen] = useState(false);

  const handleNavOpen = (bool: boolean) => {
    setNavOpen(bool);
  };

  return (
    <div
      className="bg-neutral-900 h-screen overflow-y-hidden flex flex-col justify-start"
      aria-hidden="true"
      style={{
        backgroundImage: `url(${ pattern })`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'stretch',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >

      <div className="block md:hidden">
        <Header isNavOpen={navOpen} navOpen={handleNavOpen} />
        <div className={`relative z-[48] transform ${ navOpen ? "translate-x-0" : "-translate-x-full" } transition-transform duration-200 ease-in-out`}>
          <div className="absolute w-screen"><SideNav navOpen={handleNavOpen} /></div>
        </div>
      </div>

      <div className="flex flex-row overflow-y-auto">
        <div className="hidden md:block">
          <SideNav />
        </div>
        <main className="w-full relative text-white tinker-scrollbar scrollbar scrollbar-thumb-amber-300 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
