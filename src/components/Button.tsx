import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant: "primary" | "secondary";
  mini?: boolean;
}

const Button = (props: ButtonProps) => {
  const { children, variant, mini, type, ...rest } = props;
  return (
    <button {...rest} type={type} className={`${ mini ? 'h-9 lg:h-[46px]' : 'px-4 py-2 lg:py-3 lg:px-7 h-auto' } truncate w-full flex items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:bg-opacity-10 disabled:text-opacity-40 text-xs sm:text-sm lg:text-lg text-center leading-normal whitespace-nowrap backdrop-blur-sm transition duration-100 z-40 ${ variant === 'secondary' ? 'text-tinkerYellow text-opacity-60 bg-tinkerYellow bg-opacity-10 border-[1px] border-tinkerYellow border-opacity-50 hover:text-opacity-100 hover:bg-opacity-20 hover:border-opacity-100 disabled:border-opacity-30 disabled:bg-opacity-5 disabled:text-opacity-20' : 'text-tinkerYellow bg-tinkerYellow bg-opacity-20 enabled:hover:text-black hover:bg-opacity-100 hover:cursor-pointer' }`}>
      {children}
    </button>
  );
};

export default Button;