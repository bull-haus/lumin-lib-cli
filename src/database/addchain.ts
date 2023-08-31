import { initDao } from '../shared/init.js';
import { IDatabaseArgs, defaults } from '../shared/defaults.js';
import { LuminCLIError } from '../shared/error.js';

import { parse } from 'ts-command-line-args';
import { readFileSync } from 'fs';
import { Roarr as log } from 'roarr';

interface IDatabaseAddChainParams extends IDatabaseArgs {
    config: string;
    help?: boolean;
}

export const args = parse<IDatabaseAddChainParams>(
    {
        database: defaults.params.database,
        config: {
            type: String,
            alias: 'c',
            description: 'Chain config filename to use. (e.g. config/chain-bnb-testnet.json)'
        },
        help: { ...defaults.params.help, optional: true }
    },
    {
        helpArg: 'help',
        headerContentSections: [
            { header: `${defaults.helpHeader}: database addchain`, content: 'Add chain configuration to database.' }
        ]
    }
);

const runCmd = async () => {
    const context: any = {
        args: JSON.parse(JSON.stringify(args))
    };

    const dao = await initDao(args, log);

    const chainConfig = JSON.parse(readFileSync(args.config, { encoding: 'ascii' }));
    chainConfig._id = `chain/${chainConfig.type.toLowerCase()}/${chainConfig.name}`;
    chainConfig.docType = 'chain';

    await dao.chain.add(chainConfig);

    log.info(context, `Chain configuration from ${args.config} added to database`);
};

runCmd().catch((error: LuminCLIError) => {
    console.error(error);
});
