import { Link } from "react-router-dom";
import logoFull from "../../assets/logo-full.svg";
import Footer from "./Footer";
import LoginButton from "../LoginButton";
const SideNav = () => {
  return (
    <div className="side-nav flex flex-col items-center justify-between bg-tinkerGrey">
      <div className="flex-shrink-0 mt-6">
        <Link to="/overview">
          <img
            className="h-6 w-auto block"
            src={logoFull}
            alt="Tinkernet Logo"
          />
        </Link>
      </div>
      <div>
        <div className="px-5">
          <LoginButton />
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default SideNav;