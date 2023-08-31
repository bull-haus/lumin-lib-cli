import { handleError } from './error.js';
import { IChain } from '@lumin/lib/Chain/IChain.js';
import { IAssetArgs, IChainArgs, IDatabaseArgs } from './defaults.js';
import { DAO } from '@lumin/lib/Database/DAO/DAO.js';
import { Database } from '@lumin/lib/Database/Database.js';
import { Lumin } from '@lumin/lib/Lumin/Lumin.js';

import { Roarr } from 'roarr';

export const initAsset = async (args: IAssetArgs, context: any, dao: DAO, chain: IChain) => {
    let assets;
    try {
        assets = await dao.asset.getAssets(chain);
        context.found.assets = assets.map((asset) => asset.symbol);
    } catch (error: any) {
        handleError('Could not find assets', error, context);
    }

    if (!assets) {
        return handleError('Could not find assets', undefined, context);
    }

    const asset = assets.find((asset) => asset.symbol.toUpperCase() === args.asset.toUpperCase());
    if (!asset) {
        handleError('Could not find asset', undefined, context);
    }

    context.found.asset = asset;

    return asset;
};

export const initChain = async (args: IChainArgs, context: any, dao: DAO) => {
    let chain: IChain;
    try {
        chain = await dao.chain.getChainByChainId(args.chainId);
        if (!chain) {
            return handleError('Could not find chain', undefined, context);
        }

        context.found = {
            chain: chain._id
        };

        return chain;
    } catch (error: any) {
        return handleError('Could not find chain', error, context);
    }
};

export const initDao = async (args: IDatabaseArgs, log: typeof Roarr) => {
    const db = new Database({
        localDbName: args.database,
        log
    });

    await db.initialize();

    return new DAO(db, log);
};

export const initLumin = async (args: IChainArgs, dao: DAO) => {
    const lumin = new Lumin(
        {
            chainId: args.chainId
        },
        dao
    );

    await lumin.initialize();
    await lumin.start();
    return lumin;
};
