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
                className="h-6 w-auto lock"
                src={logoFull}
                alt="Tinkernet Logo"
              />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4 md:mx-0">
          <LoginButton />
        </div>
      </div>
    </nav>
  );
};

export default Header;
