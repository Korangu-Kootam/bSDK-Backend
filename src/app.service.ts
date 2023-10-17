import { Injectable } from '@nestjs/common';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

@Injectable()
export class EthereumService {
  async sendFromWallet(mnemonic: string, toAddress: string) {
    const account = mnemonicToAccount(mnemonic);
    const client = createWalletClient({
      account,
      chain: sepolia,
      transport: http(),
    });

    const value = await publicClient.getBalance({
      address: account.address,
    });

    const gasEst = await publicClient.estimateGas({
      account,
      to: toAddress,
      value: value,
    });
    await client.sendTransaction({
      account: account,
      to: toAddress,
      value: value - gasEst,
      gas: gasEst,
      chain: sepolia,
    });
  }

  async checkWalletBalance(address: `0x${string}`) {
    const value = await publicClient.getBalance({
      address: address,
    });
    return value;
  }

  generateMnemonicPhrase() {
    const mnemonic = generateMnemonic(english);
    return mnemonic;
  }

  async getWalletAddress(mnemonic: string) {
    const account = mnemonicToAccount(mnemonic);
    return account.address;
  }
}

@Injectable()
export class BitcoinService {}
