import { NavLink } from "react-router-dom";
import logoFull from "../../assets/logo-full.svg";
import Footer from "./Footer";
import LoginButton from "../LoginButton";
import { useEffect } from "react";
import ClaimNavIcon from "../../assets/claim-nav-icon.svg";
import TransferNavIcon from "../../assets/transfer-nav-icon.svg";
import StakingNavIcon from "../../assets/staking-nav-icon.svg";
import OverviewNavIcon from "../../assets/overview-nav-icon.svg";

export interface SideNavProps {
  navOpen?: (bool: boolean) => void;
  isNavOpen?: boolean;
}

const navLinks = [
  { path: "/overview", name: "Account Overview", icon: OverviewNavIcon },
  { path: "/staking", name: "DAO Staking", icon: StakingNavIcon },
  { path: "/claim", name: "Claim Vesting", icon: ClaimNavIcon },
  { path: "/transfer", name: "Asset Transfers", icon: TransferNavIcon },
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
    <div className="side-nav flex flex-col items-center justify-between bg-black bg-opacity-70 backdrop-blur-sm h-screen">
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
              <div className="flex items-center">
                <img
                  className="w-5 h-auto inline-block mr-4 fill-current text-black hover:text-tinkerYellow transition-colors duration-200"
                  src={link.icon}
                  alt="icon"
                />
                {link.name}
              </div>
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