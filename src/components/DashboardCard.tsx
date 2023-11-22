import React, { ReactNode } from 'react';

interface DashboardCardProps {
  children: ReactNode;
  cardTitle: string;
  iconSrc?: string;
}

const DashboardCard = (props: DashboardCardProps) => {
  const { children, cardTitle, iconSrc } = props;
  return (
    <div className="flex flex-col w-full justify-between">
      {iconSrc && <img src={iconSrc} alt="icon" />}
      <div className="text-md font-bold leading-5 w-[200%]">
        {children}
      </div>
      <div className="text-xs leading-4 w-[200%]">{cardTitle}</div>
    </div>
  );
};

export default DashboardCard;