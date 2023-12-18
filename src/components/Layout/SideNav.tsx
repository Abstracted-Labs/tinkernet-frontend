import { NavLink } from "react-router-dom";
import logoFull from "../../assets/logo-full.svg";
import Footer from "./Footer";
import LoginButton from "../LoginButton";
import { useEffect } from "react";

export interface SideNavProps {
  navOpen?: (bool: boolean) => void;
  isNavOpen?: boolean;
}

const navLinks = [
  { path: "/overview", name: "Account Overview" },
  { path: "/staking", name: "DAO Staking" },
  { path: "/claim", name: "Claim Vesting" },
  { path: "/transfer", name: "Asset Transfers" },
];

const SideNav = (props: SideNavProps) => {
  const { navOpen } = props;

  const handleClick = () => {
    if (navOpen) navOpen(false);
  };

  useEffect(() => {
    if (navOpen) navOpen(false);

    return () => {
      if (navOpen) navOpen(false);
    };
  }, []);

  return (
    <div className="side-nav flex flex-col items-center justify-between bg-black bg-opacity-50 backdrop-blur-sm h-screen">
      <div className="mt-7 flex-grow flex flex-col items-center w-full">
        <NavLink to="/overview" className="flex items-center justify-center w-full relative right-1 invisible md:visible">
          <img
            className="h-6 w-auto block"
            src={logoFull}
            alt="Tinkernet Logo"
          />
        </NavLink>
        <div className="flex flex-col items-center w-full text-xs lg:text-md my-10 px-0">
          {navLinks.map((link, index) => (
            <NavLink
              key={index}
              to={link.path}
              onClick={handleClick}
              className={({ isActive }) =>
                isActive ? 'truncate text-white bg-tinkerYellow bg-opacity-25 border-l border-tinkerYellow border-l-4 w-full h-16 pl-6 text-sm flex flex-col justify-center hover:text-tinkerYellow' : 'truncate text-white w-full h-16 pl-7 text-sm flex flex-col justify-center hover:text-tinkerYellow'
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>
      </div>
      <div>
        <div className="px-5 hidden md:block">
          <LoginButton />
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default SideNav;