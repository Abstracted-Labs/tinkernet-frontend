import SubwalletIcon from "../assets/subwallet-icon.png";
import TalismanIcon from "../assets/talisman-icon.svg";
import NovaWalletIcon from "../assets/novawallet-icon.png";
import PjsIcon from "../assets/pjs-icon.png";
// TODO: WalletConnectIcon

export enum WalletNameEnum {
  SUBWALLET = "subwallet-js",
  TALISMAN = "talisman",
  NOVAWALLET = "nova wallet",
  PJS = "polkadot-js",
  WALLETCONNECT = "wallet-connect"
}

export function getWalletIcon(type: string | undefined) {
  if (!type) return;
  const lcType = type.toLowerCase();
  if (WalletNameEnum.SUBWALLET.toLowerCase().includes(lcType)) {
    return SubwalletIcon;
  } else if (WalletNameEnum.TALISMAN.toLowerCase().includes(lcType)) {
    return TalismanIcon;
  } else if (WalletNameEnum.NOVAWALLET.toLowerCase().includes(lcType)) {
    return NovaWalletIcon;
  } else if (WalletNameEnum.PJS.toLowerCase().includes(lcType)) {
    return PjsIcon;
  } else {
    return undefined;
  }
}
