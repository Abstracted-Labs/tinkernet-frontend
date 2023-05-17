import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Signer, SignerResult } from '@polkadot/types/types';
import type { HexString } from '@polkadot/util/types';
import { TypeRegistry } from '@polkadot/types';
import type { Account, BaseWallet, BaseWalletProvider, WalletMetadata } from '@polkadot-onboard/core';
import SignClient from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
import type { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { SignClientTypes } from '@walletconnect/types';
import { Web3Modal } from "@web3modal/standalone";
import { WalletType } from '@polkadot-onboard/core';

type AccountState = {
    wallet: BaseWallet | null;
    setWallet: (wallet: BaseWallet | null) => void;
    accounts: Account[];
    selectedAccount: Account | null;
    setAccounts: (accounts: Account[]) => void;
    setSelectedAccount: (account: Account | null) => void;
};

const useAccount = create<AccountState>()(
  persist(
    (set) => ({
      wallet: null,
      setWallet: (wallet) => set({ wallet }),
      accounts: [],
      selectedAccount: null,
      setAccounts: (accounts) => set({ accounts }),
      setSelectedAccount: (selectedAccount) =>
        set({ selectedAccount }),
    }),
    {
        name: "account",
        partialize: (state) => ({
            accounts: state.accounts,
            selectedAccount: state.selectedAccount,
            setAccounts: state.setAccounts,
            setSelectedAccount: state.setSelectedAccount,
            setWallet: state.setWallet,
        }),
    }
  )
);

interface Signature {
  signature: HexString;
}

export type WcAccount = `${string}:${string}:${string}`;

export class WalletConnectSigner implements Signer {
    registry: TypeRegistry;
  client: SignClient;
  session: SessionTypes.Struct;
  chainId: string;
  id = 0;

  constructor(client: SignClient, session: SessionTypes.Struct, chainId: string) {
    this.client = client;
    this.session = session;
    this.registry = new TypeRegistry();
    this.chainId = chainId;
  }

  // this method is set this way to be bound to this class.
  signPayload = async (payload: SignerPayloadJSON): Promise<SignerResult> => {
    const request = {
      topic: this.session.topic,
      chainId: this.chainId,
      request: {
        id: 1,
        jsonrpc: '2.0',
        method: 'polkadot_signTransaction',
        params: { address: payload.address, transactionPayload: payload },
      },
    };
    const { signature } = await this.client.request<Signature>(request);
    return { id: ++this.id, signature };
  };

  // this method is set this way to be bound to this class.
  // It might be used outside of the object context to sign messages.
  // ref: https://polkadot.js.org/docs/extension/cookbook#sign-a-message
  signRaw = async (raw: SignerPayloadRaw): Promise<SignerResult> => {
    const request = {
        topic: this.session.topic,
        chainId: 'polkadot:d42e9606a995dfe433dc7955dc2a70f4',
        request: {
            id: 1,
            jsonrpc: '2.0',
            method: 'polkadot_signMessage',
            params: { address: raw.address, message: raw.data },
        },
    };
    const { signature } = await this.client.request<Signature>(request);
    return { id: ++this.id, signature };
  };
}

const toWalletAccount = (wcAccount: WcAccount) => {
  const address = wcAccount.split(':')[2];
  return { address };
};

const web3Modal = new Web3Modal({
    projectId: "3e4e3c1e8ad4ac731c399248e20d69fd",
    walletConnectVersion: 2,
});

class WalletConnectWallet implements BaseWallet {
  type = WalletType.WALLET_CONNECT;
  appName: string;
  metadata: WalletMetadata;
    config: SignClientTypes.Options;
    client: SignClient | undefined;
  signer: Signer | undefined;
  session: SessionTypes.Struct | undefined;

    constructor(config: SignClientTypes.Options, appName: string) {
        this.config = config;
    this.appName = appName;
    this.metadata = {
      id: 'wallet-connect',
      title: config.metadata?.name || 'Wallet Connect',
      description: config.metadata?.description || '',
      urls: { main: config.metadata?.url || '' },
      iconUrl: config.metadata?.icons[0] || '',
      version: "2.0",
    };
  }

  reset(): void {
    this.client = undefined;
    this.session = undefined;
    this.signer = undefined;
  }

  async getAccounts(): Promise<Account[]> {
    let accounts: Account[] = [];
    if (this.session) {
      const wcAccounts = Object.values(this.session.namespaces)
        .map((namespace) => namespace.accounts)
        .flat();
      accounts = wcAccounts.map((wcAccount) => toWalletAccount(wcAccount as WcAccount));
    }
    return accounts;
  }

  async connect() {
    // reset the client
    this.reset();

    // init the client
    const client = await SignClient.init(this.config);
    const params = {
      requiredNamespaces: {
        polkadot: {
            methods: ['polkadot_signTransaction', 'polkadot_signMessage'],
            chains: ["polkadot:d42e9606a995dfe433dc7955dc2a70f4"],
            events: [],
        },
      },
    };

      const { uri, approval } = await client.connect(params);
    return new Promise<void>((resolve, reject) => {
      // Open QRCode modal if a URI was returned (i.e. we're not connecting an existing pairing).
      if (uri) {
          web3Modal.openModal({ uri });
      }
      // Await session approval from the wallet.
      approval()
        .then((session) => {
          // setup the client
          this.client = client;
          this.session = session;
            this.signer = new WalletConnectSigner(client, session, "polkadot:d42e9606a995dfe433dc7955dc2a70f4");
            resolve();
        })
        .catch(reject)
        .finally(() => web3Modal.closeModal());
    });
  }

  async disconnect() {
    if (this.session?.topic) {
      this.client?.disconnect({
        topic: this.session?.topic,
        reason: {
          code: -1,
          message: 'Disconnected by client!',
        },
      });
    }
    this.reset();
  }

  isConnected() {
    return !!(this.client && this.signer && this.session);
  }
}

export class WalletConnectProvider implements BaseWalletProvider {
    config: SignClientTypes.Options;
    appName: string;

    constructor(config: SignClientTypes.Options, appName: string) {
        this.config = config;
    this.appName = appName;
  }

  getWallets(): BaseWallet[] {
    return [new WalletConnectWallet(this.config, this.appName)];
  }
}

export default useAccount;
