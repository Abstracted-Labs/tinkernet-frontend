import React, { ReactNode } from 'react';

interface DashboardCardProps {
  children: ReactNode;
  cardTitle: string | ReactNode;
  iconSrc?: string;
  leading?: string;
}

const DashboardCard = (props: DashboardCardProps) => {
  const { children, cardTitle, iconSrc, leading } = props;
  return (
    <div className="w-auto h-[194px] bg-tinkerDarkGrey rounded-xl flex-grow p-8 flex flex-col justify-between items-center hover:text-tinkerYellow hover:border-tinkerYellow border-2 border-tinkerLightGrey transition duration-150 ease-in-out">
      <div className="w-[48px] h-[48px] bg-[#393a3e] rounded-full mx-auto flex items-center justify-center">
        {iconSrc && <img src={iconSrc} alt="icon" />}
      </div>
      <div className="font-bold leading-tight text-md text-center">
        {children}
      </div>
      <div className={`font-normal text-tinkerTextGrey text-[12px] text-center ${ leading ? leading : 'leading-none' } whitespace-nowrap`}>
        {cardTitle}
      </div>
    </div>
  );
};

export default DashboardCard;