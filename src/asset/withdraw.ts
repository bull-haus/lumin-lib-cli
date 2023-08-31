import { initAsset, initChain, initDao, initLumin } from '../shared/init.js';
import { IAssetArgs, IChainArgs, IDatabaseArgs, defaults } from '../shared/defaults.js';
import { LuminCLIError, handleError } from '../shared/error.js';
import { Wallet } from '../shared/wallet.js';

import { parse } from 'ts-command-line-args';
import { Roarr as log } from 'roarr';
import { ethers } from 'ethers';

interface IAssetWithdrawParams extends IAssetArgs, IChainArgs, IDatabaseArgs {
    amount: string;
    wallet: string;
    help?: boolean;
}

export const args = parse<IAssetWithdrawParams>(
    {
        database: defaults.params.database,
        chainId: defaults.params.chainId,
        asset: defaults.params.asset,
        amount: defaults.params.amount,
        wallet: defaults.params.wallet,
        help: { ...defaults.params.help, optional: true }
    },
    {
        helpArg: 'help',
        headerContentSections: [
            { header: `${defaults.helpHeader}: asset withdraw`, content: 'Withdraw assets from Lumin.' }
        ]
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

    const lumin = await initLumin(args, dao);

    log.info(context, 'withdrawing');

    const luminChain = lumin.chains.get(context.found.chain);
    if (!luminChain) {
        return handleError('Chain could not be instantiated', undefined, context);
    }

    if (!luminChain.provider.currentProvider) {
        return handleError('Provider not running', undefined, context);
    }

    const assetChainInfo = asset.chains.find((chain) => chain.chainId === args.chainId);
    if (!assetChainInfo) {
        return handleError('Could not get asset chain details', undefined, context);
    }

    const wallet = new Wallet();
    wallet.read(args.wallet);
    wallet.provider = luminChain.provider.currentProvider;

    const txWithdraw = await luminChain.createTxWithdraw(
        asset,
        args.amount.toLowerCase() === 'max' ? ethers.MaxUint256 : ethers.parseEther(args.amount)
    );

    wallet
        .sendTransaction(txWithdraw)
        .then(() => {
            console.log(`Withdrew ${args.amount} ${args.asset} to ${wallet.data.address}`);
        })
        .catch((error) => {
            handleError('Error while sending withdraw transaction', error, context);
        });
};

runCmd().catch((error: LuminCLIError) => {
    console.error(error);
});
