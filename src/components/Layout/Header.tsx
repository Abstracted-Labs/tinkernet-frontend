import { Link } from "react-router-dom";
import logoFull from "../../assets/logo-full.svg";
import logoIcon from "../../assets/tinkernet-logo-icon.svg";
import LoginButton from "../LoginButton";

const Header = () => {
  return (
    <nav className="fixed flex flex-row w-full z-[49] justify-between bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full flex flex-row justify-between gap-8 p-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <Link to="/">
              <img
                className="block h-6 w-auto lg:hidden"
                src={logoIcon}
                alt="Tinkernet Logo"
              />
              <img
                className="hidden h-6 w-auto lg:block"
                src={logoFull}
                alt="Tinkernet Logo"
              />
            </Link>
          </div>

          {/* <div className="flex items-center gap-4 text-xs lg:text-md">
            <Link to="/overview">
              <span className="truncate text-white">Account Overview</span>
            </Link>
            <Link to="/staking">
              <span className="truncate text-white">DAO Staking</span>
            </Link>
            <Link to="/claim">
              <span className="truncate text-white">Claim Vesting</span>
            </Link>
            <Link to="/transfer">
              <span className="truncate text-white">Asset Transfers</span>
            </Link>
          </div> */}
        </div>

        <div className="flex items-center gap-4 md:mx-0">
          <LoginButton />
        </div>
      </div>
    </nav>
  );
};

export default Header;
