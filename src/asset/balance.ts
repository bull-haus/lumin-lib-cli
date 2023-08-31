import { initChain, initDao, initLumin } from '../shared/init.js';
import { IChainArgs, IDatabaseArgs, defaults } from '../shared/defaults.js';
import { LuminCLIError, handleError } from '../shared/error.js';
import { Wallet } from '../shared/wallet.js';

import { ethers } from 'ethers';
import { parse } from 'ts-command-line-args';
import { Roarr as log } from 'roarr';

interface IAssetWithdrawParams extends IChainArgs, IDatabaseArgs {
    wallet: string;
    help?: boolean;
}

export const args = parse<IAssetWithdrawParams>(
    {
        database: defaults.params.database,
        chainId: defaults.params.chainId,
        wallet: defaults.params.wallet,
        help: { ...defaults.params.help, optional: true }
    },
    {
        helpArg: 'help',
        headerContentSections: [
            { header: `${defaults.helpHeader}: asset balance`, content: 'Display user\'s asset balances and deposits.' }
        ]
    }
);

const runCmd = async () => {
    const context: any = {
        args: JSON.parse(JSON.stringify(args))
    };

    const dao = await initDao(args, log);
    await initChain(args, context, dao);
    const lumin = await initLumin(args, dao);

    log.info(context, 'checking deposits');

    const luminChain = lumin.chains.get(context.found.chain);
    if (!luminChain) {
        return handleError('Chain could not be instantiated', undefined, context);
    }

    if (!luminChain.provider.currentProvider) {
        return handleError('Provider not running', undefined, context);
    }

    const wallet = new Wallet();
    wallet.read(args.wallet);
    wallet.provider = luminChain.provider.currentProvider;

    const txBalances = await luminChain.assetManager.balancesOf(wallet.data.address);

    const chainAssets = await dao.asset.getAssets(luminChain.config);
    for (let index = 0; index < txBalances.assetIds.length; ++index) {
        const asset = chainAssets.find((asset) => asset.assetId == txBalances.assetIds[index]);
        if (asset) {
            console.log(`Asset ${asset._id}`);
            const depositTotal = txBalances.depositsTotal[index];
            if (depositTotal) {
                console.log(`  platform deposit`);
                console.log(`    - total: ${ethers.formatEther(depositTotal.total)}`);
                console.log(`    - locked: ${ethers.formatEther(depositTotal.locked)}`);
            }

            const depositUser = txBalances.depositsUser[index];
            if (depositUser) {
                console.log(`  user deposit`);
                console.log(`    - total: ${ethers.formatEther(depositUser.total)}`);
                console.log(`    - locked: ${ethers.formatEther(depositUser.locked)}`);
            }

            const balanceUser = txBalances.balances[index];
            if (balanceUser !== undefined) {
                console.log(`  wallet balance`);
                console.log(`    - total: ${ethers.formatEther(balanceUser)}`);
            }
            console.log();
        } else {
            console.error(`Unknown asset at index ${index}: ${txBalances.assetIds[index]}`);
        }
    }
};

runCmd().catch((error: LuminCLIError) => {
    console.error(error);
});
