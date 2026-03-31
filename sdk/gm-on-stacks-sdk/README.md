# gm-on-stacks-sdk

A lightweight SDK for interacting with the GM on Stacks smart contract.

## features

- **sayGm**: easily broadcast a 'say-gm' transaction to the Stacks network.
- **Dynamic Greetings**: helper functions for time-based greetings.
- **Native Support**: built on top of `@stacks/transactions` and `@stacks/network`.

## installation

```bash
npm install gm-on-stacks-sdk
```

## usage

```typescript
import { sayGm } from 'gm-on-stacks-sdk';

const result = await sayGm({
  contractAddress: 'ST...',
  contractName: 'gm-on-stacks',
  senderKey: '...',
  network: 'mainnet'
});
```
