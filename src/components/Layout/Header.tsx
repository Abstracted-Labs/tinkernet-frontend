import { Link } from "react-router-dom";
import logoFull from "../../assets/logo-full.svg";
import LoginButton from "../LoginButton";
import Button from "../Button";
import MenuIcon from "../../assets/menu-icon.svg";
import CloseIcon from "../../assets/close-icon.svg";
import { useEffect, useState } from "react";
import { SideNavProps } from "./SideNav";

const Header = (props: SideNavProps) => {
  const { navOpen, isNavOpen } = props;
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(!open);
    if (navOpen) navOpen(!open);
  };

  useEffect(() => {
    if (!isNavOpen) setOpen(false);
  }, [isNavOpen]);

  return (
    <nav className="fixed flex flex-row w-full z-[49] justify-between bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full flex flex-row justify-between gap-8 p-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <Link to="/">
              <img
                className="h-3 md:h-6 w-auto lock"
                src={logoFull}
                alt="Tinkernet Logo"
              />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 md:mx-0">
          <LoginButton />
          <Button variant="secondary" className="p-0 block" mini onClick={handleClick}>
            <img src={!open ? MenuIcon : CloseIcon} alt="Menu" className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Header;
