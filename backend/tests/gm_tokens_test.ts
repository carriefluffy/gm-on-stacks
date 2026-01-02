
import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("gm-on-stacks-mainnet NFT Metadata", () => {
    it("should mint a token and return correct dynamic token-uri", () => {
        // Mint a token (mint-gm-nft)
        // Public function: (mint-gm-nft)
        const mintResult = simnet.callPublicFn(
            "gm-on-stacks-mainnet",
            "mint-gm-nft",
            [],
            wallet1
        );
        // Expect OK
        // The contract mints to tx-sender
        expect(mintResult.result).toBeOk(Cl.tuple({
            "token-id": Cl.uint(1),
            "fee-paid": Cl.uint(33000000), // NFT_FEE_NORMAL
            "had-discount": Cl.bool(false)
        }));

        // Check token-uri (default base-uri)
        const defaultBaseUri = "https://purple-hidden-dove-344.mypinata.cloud/ipfs/bafybeie4w73dxkcrsgswua6yntqjii7eb7ho5cq5iiglugsc2irkd74vmq/";
        const uriResult1 = simnet.callReadOnlyFn(
            "gm-on-stacks-mainnet",
            "get-token-uri",
            [Cl.uint(1)],
            deployer
        );
        expect(uriResult1.result).toBeOk(Cl.some(Cl.stringAscii(defaultBaseUri + "1.json")));

        // Update base-uri
        const newBaseUri = "ipfs://QmNewHash/";
        const setResult = simnet.callPublicFn(
            "gm-on-stacks-mainnet",
            "set-base-uri",
            [Cl.stringAscii(newBaseUri)],
            deployer
        );
        expect(setResult.result).toBeOk(Cl.bool(true));

        // Check token-uri again
        const uriResult2 = simnet.callReadOnlyFn(
            "gm-on-stacks-mainnet",
            "get-token-uri",
            [Cl.uint(1)],
            deployer
        );
        expect(uriResult2.result).toBeOk(Cl.some(Cl.stringAscii(newBaseUri + "1.json")));
    });

    it("should fail to set base-uri if not owner", () => {
        const setResult = simnet.callPublicFn(
            "gm-on-stacks-mainnet",
            "set-base-uri",
            [Cl.stringAscii("ipfs://Malicious/")],
            wallet1
        );
        // ERR_NOT_AUTHORIZED is u101
        expect(setResult.result).toBeErr(Cl.uint(101));
    });
});
