import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';

export interface GMOptions {
  contractAddress: string;
  contractName: string;
  senderKey: string;
  network?: 'mainnet' | 'testnet';
  fee?: number;
}

/**
 * Utility to say GM on Stacks.
 * Requirements: @stacks/transactions, @stacks/network
 */
export async function sayGm(opts: GMOptions) {
  const network = opts.network === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
  
  const txOptions = {
    contractAddress: opts.contractAddress,
    contractName: opts.contractName,
    functionName: 'say-gm',
    functionArgs: [],
    senderKey: opts.senderKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: opts.fee ?? 400,
  };

  const transaction = await makeContractCall(txOptions);
  return broadcastTransaction(transaction, network);
}

export function getGmMessage(hour: number): string {
  if (hour < 12) return "GM! ☀️";
  if (hour < 18) return "GA! 🌤️";
  return "GN! 🌙";
}
