import BasiliskLogo from '../assets/basilisk-logo-icon.svg';
import TinkernetLogo from '../assets/tinkernet-logo-icon.svg';

export interface ChainLogo {
  name: string;
  logo?: string;
}

export const chainLedger: ChainLogo[] = [
  {
    name: 'Tinkernet',
    logo: TinkernetLogo,
  },
  {
    name: 'Basilisk',
    logo: BasiliskLogo,
  },
];

export enum Chain {
  Basilisk = 'Basilisk',
  Tinkernet = 'Tinkernet',
}

export function getChainInfo(chain?: Chain, logo?: boolean) {
  if (!chain) return chainLedger;

  const chainInfo = chainLedger.find((item) => item.name === chain);
  if (!chainInfo || !logo) return chainInfo;

  switch (chain) {
    case Chain.Basilisk:
      return { ...chainInfo, logo: BasiliskLogo };
    case Chain.Tinkernet:
      return { ...chainInfo, logo: TinkernetLogo };
    default:
      return chainInfo;
  }
}
