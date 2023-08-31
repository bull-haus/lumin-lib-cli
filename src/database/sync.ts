import { defaults } from '../shared/defaults.js';
import { DAO } from '@lumin/lib/Database/DAO/DAO.js';
import { Database, RemoteType } from '@lumin/lib/Database/Database.js';
import { DebugMethod } from '@lumin/lib/Chain/Chain.js';
import { IChain } from '@lumin/lib/Chain/IChain.js';
import { Lumin } from '@lumin/lib/Lumin/Lumin.js';
import { LuminCLIError, handleError } from '../shared/error.js';

import { parse } from 'ts-command-line-args';
import { Roarr as log } from 'roarr';


interface IDatabaseSyncParams {
    database: string;
    chainId: number;
    force?: boolean;
    help?: boolean;
}

export const args = parse<IDatabaseSyncParams>(
    {
        database: defaults.params.database,
        chainId: defaults.params.chainId,
        force: { type: Boolean, optional: true, alias: 'f', description: 'Force complete resync.' },
        help: { ...defaults.params.help, optional: true }
    },
    {
        helpArg: 'help',
        headerContentSections: [{ header: 'Lumin Finance CLI: database sync', content: 'Sync database with chain.' }]
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

    db.setRemote({
        remoteType: RemoteType.Push,
        url: 'http://178.26.178.185:5984/lumin-pushed/',
        username: 'admin',
        password: 'admin'
    });

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

    if (args.force) {
        const syncConfig = await dao.sync.getSync(chain);
        syncConfig.contracts.assetManager.toBlock = undefined;
        await dao.sync.upsert(syncConfig);
    }

    const lumin = new Lumin(
        {
            chainId: args.chainId
        },
        dao
    );

    await lumin.initialize();
    await lumin.start(true, DebugMethod.Debug);
    const luminChain = lumin.chains.get(context.found.chain);
    if (!luminChain) {
        return handleError('Chain could not be instantiated', undefined, context);
    }

    if (!luminChain.provider.currentProvider) {
        return handleError('Provider not running', undefined, context);
    }

    while (await luminChain.sync(dao)) {
        //
    }
};

runCmd().catch((error: LuminCLIError) => {
    console.error(error);
});
