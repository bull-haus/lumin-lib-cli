import { abi_erc20 } from '../shared/abi_erc20.js';
import { initAsset, initChain, initDao, initLumin } from '../shared/init.js';
import { IAssetArgs, IChainArgs, IDatabaseArgs, defaults } from '../shared/defaults.js';
import { LuminCLIError, handleError } from '../shared/error.js';
import { Wallet } from '../shared/wallet.js';

import { parse } from 'ts-command-line-args';
import { Roarr as log } from 'roarr';
import { ethers } from 'ethers';

interface IAssetDepositParams extends IAssetArgs, IChainArgs, IDatabaseArgs {
    amount: string;
    wallet: string;
    help?: boolean;
}

export const args = parse<IAssetDepositParams>(
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
        headerContentSections: [{ header: `${defaults.helpHeader}: asset deposit`, content: 'Deposit assets on Lumin.' }]
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

    log.info(context, 'depositing');

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

    const assetContract = new ethers.Contract(
        assetChainInfo.contract.toString(),
        abi_erc20,
        luminChain.provider.currentProvider
    );

    if (assetContract.approve) {
        const wallet = new Wallet();
        wallet.read(args.wallet);
        wallet.provider = luminChain.provider.currentProvider;

        const amount = ethers.parseEther(args.amount);
        const txApprove = await assetContract.approve.populateTransaction(
            luminChain.config.contracts.assetManager.address,
            amount
        );

        const txDeposit = await luminChain.createTxDeposit(asset, ethers.parseEther(args.amount));

        wallet
            .sendTransaction(txApprove)
            .then(() => {
                console.log(`Approved ${args.amount} ${args.asset}`);
                wallet
                    .sendTransaction(txDeposit)
                    .then(() => {
                        console.log(`Deposited ${args.amount} ${args.asset} from ${wallet.data.address}`);
                    })
                    .catch((error) => {
                        handleError('Error while sending deposit transaction', error, context);
                    });
            })
            .catch((error) => {
                handleError('Error while sending approve transaction', error, context);
            });
    } else {
        handleError('Contract instantiation error', undefined, context);
    }
};

runCmd().catch((error: LuminCLIError) => {
    console.error(error);
});
