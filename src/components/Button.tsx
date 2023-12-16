import { ReactNode } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant: "primary" | "secondary";
  mini?: boolean;
  group?: boolean;
  groupLabel?: ReactNode;
  groupId?: string;
  groupCallback?: () => void;
}

const Button = (props: ButtonProps) => {
  const { children, variant, mini, type, group, groupId, groupLabel, groupCallback, ...rest } = props;
  const style = `${ mini ? 'h-9 lg:h-[46px] text-xs md:text-sm lg:text-md' : 'px-4 py-2 lg:py-3 lg:px-7 h-auto text-xs sm:text-sm lg:text-lg' } focus:outline-none w-full flex items-center justify-center disabled:cursor-not-allowed disabled:bg-opacity-10 disabled:text-opacity-40 text-center leading-normal whitespace-nowrap backdrop-blur-sm transition duration-100 z-40 ${ variant === 'secondary' ? 'text-tinkerYellow text-opacity-60 bg-tinkerYellow bg-opacity-10 border-[1px] border-tinkerYellow border-opacity-50 hover:text-opacity-100 hover:bg-opacity-20 hover:border-opacity-100 disabled:border-opacity-30 disabled:bg-opacity-5 disabled:text-opacity-20' : 'text-tinkerYellow bg-tinkerYellow bg-opacity-20 enabled:hover:text-black hover:bg-opacity-100 hover:cursor-pointer' }`;
  return (
    <div className="flex gap-1">
      <button {...rest} type={type} className={`${ style } ${ group ? 'rounded-tl-lg rounded-bl-lg flex-grow' : 'rounded-lg' }`}>
        {children}
      </button>
      {group && groupLabel ? <button disabled={props.disabled} id={groupId} type="button" className={`bg-tinkerLightGrey opacity-75 hover:opacity-100 text-white rounded-tr-lg rounded-br-lg`} onClick={groupCallback}>{groupLabel}</button> : null}
    </div>
  );
};

export default Button;