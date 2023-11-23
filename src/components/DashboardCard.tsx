import React, { ReactNode } from 'react';

interface DashboardCardProps {
  children: ReactNode;
  cardTitle: string;
  iconSrc?: string;
}

const DashboardCard = (props: DashboardCardProps) => {
  const { children, cardTitle, iconSrc } = props;
  return (
    <div className="min-w-[151px] h-[194px] bg-tinkerDarkGrey rounded-lg p-8 flex flex-col justify-between">
      <div className="w-[48px] h-[48px] bg-[#393a3e] rounded-full mx-auto flex items-center justify-center">
        {iconSrc && <img src={iconSrc} alt="icon" />}
      </div>
      <div className="font-bold text-white text-[18px] text-center tracking-[0] leading-[normal]">
        {children}
      </div>
      <div className="font-normal text-tinkerTextGrey text-[12px] text-center tracking-[0] leading-[normal]">
        {cardTitle}
      </div>
    </div>
  );
};

export default DashboardCard;