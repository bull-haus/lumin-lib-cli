import { abi_erc20 } from '../shared/abi_erc20.js';
import { defaults } from '../shared/defaults.js';
import { LuminCLIError, handleError } from '../shared/error.js';
import { Wallet } from '../shared/wallet.js';

import { DAO } from '@lumin/lib/Database/DAO/DAO.js';
import { Database } from '@lumin/lib/Database/Database.js';
import { IChain } from '@lumin/lib/Chain/IChain.js';
import { Lumin } from '@lumin/lib/Lumin/Lumin.js';

import { parse } from 'ts-command-line-args';
import { Roarr as log } from 'roarr';
import { ethers } from 'ethers';

interface IAssetMintParams {
    database: string;
    chainId: number;
    asset: string;
    wallet: string;
    help?: boolean;
}

export const args = parse<IAssetMintParams>(
    {
        database: defaults.params.database,
        chainId: defaults.params.chainId,
        asset: defaults.params.asset,
        wallet: defaults.params.wallet,
        help: { ...defaults.params.help, optional: true }
    },
    {
        helpArg: 'help',
        headerContentSections: [
            { header: 'Lumin Finance CLI: mock asset mint', content: 'Mint mock tokens on testnet' }
        ]
    }
);

const runCmd = async () => {
    const context: any = {
        args: JSON.parse(JSON.stringify(args))
    };

    const db = new Database({
        localDbName: args.database,
        log
    });

    await db.initialize();

    const dao = new DAO(db, log);

    let chain: IChain;
    try {
        chain = await dao.chain.getChainByChainId(args.chainId);
        context.found = {
            chain: chain._id
        };
    } catch (error: any) {
        return handleError('Could not find chain', error, context);
    }

    let assets;
    try {
        assets = await dao.asset.getAssets(chain);
        context.found.assets = assets.map((asset) => asset.symbol);
    } catch (error: any) {
        return handleError('Could not find assets', error, context);
    }

    const asset = assets.find((asset) => asset.symbol.toUpperCase() === args.asset.toUpperCase());
    if (!asset) {
        return handleError('Could not find asset', undefined, context);
    }

    context.found.asset = asset;

    const assetChainInfo = asset.chains.find((chain) => chain.chainId === args.chainId);
    if (!assetChainInfo) {
        return handleError('Could not get asset chain details', undefined, context);
    }

    const lumin = new Lumin(
        {
            chainId: args.chainId
        },
        dao
    );

    await lumin.initialize();
    await lumin.start();
    const luminChain = lumin.chains.get(context.found.chain);
    if (!luminChain) {
        return handleError('Chain could not be instantiated', undefined, context);
    }

    if (!luminChain.provider.currentProvider) {
        return handleError('Provider not running', undefined, context);
    }

    const assetContract = new ethers.Contract(
        assetChainInfo.contract.toString(),
        abi_erc20,
        luminChain.provider.currentProvider
    );

    if (assetContract.mint) {
        const wallet = new Wallet();
        wallet.read(args.wallet);
        wallet.provider = luminChain.provider.currentProvider;

        const txMint = await assetContract.mint.populateTransaction();

        wallet
            .sendTransaction(txMint)
            .then(() => {
                console.log(`Minted ${args.asset} to ${wallet.data.address}`);
            })
            .catch((error) => {
                handleError('Error while sending transaction', error, context);
            });
    } else {
        handleError('Contract instantiation error', undefined, context);
    }
};

runCmd().catch((error: LuminCLIError) => {
    console.error(error);
});
