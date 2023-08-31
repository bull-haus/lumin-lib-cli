import { abi_erc20 } from '../shared/abi_erc20.js';
import { initAsset, initChain, initDao, initLumin } from '../shared/init.js';
import { IAssetArgs, IChainArgs, IDatabaseArgs, defaults } from '../shared/defaults.js';
import { LuminCLIError, handleError } from '../shared/error.js';
import { Wallet } from '../shared/wallet.js';

import { parse } from 'ts-command-line-args';
import { Roarr as log } from 'roarr';
import { ethers } from 'ethers';

interface IAssetInfoParams extends IAssetArgs, IChainArgs, IDatabaseArgs {
    help?: boolean;
}

export const args = parse<IAssetInfoParams>(
    {
        database: defaults.params.database,
        chainId: defaults.params.chainId,
        asset: defaults.params.asset,
        help: { ...defaults.params.help, optional: true }
    },
    {
        helpArg: 'help',
        headerContentSections: [{ header: `${defaults.helpHeader}: asset info`, content: 'Display asset information.' }]
    }
);

const runCmd = async () => {
    const context: any = {
        args: JSON.parse(JSON.stringify(args))
    };

    const dao = await initDao(args, log);
    const chain = await initChain(args, context, dao);
    const asset = await initAsset(args, context, dao, chain!);
    if (!asset) {
        return handleError('Asset not found', undefined, context);
    }

    console.log('Asset info');
    console.log(`  - id    : ${asset.assetId}`)
    console.log(`  - name  : ${asset.asset}`);
    console.log(`  - symbol: ${asset.symbol}`);
    console.log('  - chains:');
    for(const chain of asset.chains) {
        const assetChain = await dao.chain.getChainByChainId(chain.chainId);

        console.log(`    - chainId: ${chain.chainId}`);
        console.log('    - price feeds');
        for(const priceFeed of chain.priceFeed) {
            console.log(`      - index ${priceFeed.index}:`);
            console.log(`        - address: ${priceFeed.address}`);
            console.log(`        - enabled: ${priceFeed.enabled ? 'yes' : 'no'}`);
            const priceFeedProxy = assetChain.contracts.assetManager.priceFeedProxy[priceFeed.index];
            if (priceFeedProxy) {
                console.log('        - price feed proxy:');
                console.log(`          - description: ${priceFeedProxy.description}`);
                console.log(`          - address    : ${priceFeedProxy.address}`);
                console.log(`          - enabled    : ${priceFeedProxy.enabled ? 'yes' : 'no'}`);
            }
        }
    }
};

runCmd().catch((error: LuminCLIError) => {
    console.error(error);
});
