import { Database } from '@lumin/lib/Database/Database.js';
import { writeFileSync } from 'fs';

import { initDao } from '../shared/init.js';
import { IDatabaseArgs, defaults } from '../shared/defaults.js';
import { LuminCLIError } from '../shared/error.js';

import { parse } from 'ts-command-line-args';
import { Roarr as log } from 'roarr';

interface IDatabaseAddChainParams extends IDatabaseArgs {
    file: string;
    start?: string;
    end?: string;
    help?: boolean;
}

export const args = parse<IDatabaseAddChainParams>(
    {
        database: defaults.params.database,
        file: {
            type: String,
            alias: 'f',
            defaultValue: 'dump.json',
            description: 'Output filename to to dump data to. (e.g. dump.json)'
        },
        start: {
            type: String,
            optional: true,
            alias: 's',
            description: 'Start key of document to filter for.'
        },
        end: {
            type: String,
            optional: true,
            alias: 'e',
            description: 'End key of document to filter for.'
        },   
        help: { ...defaults.params.help, optional: true }
    },
    {
        helpArg: 'help',
        headerContentSections: [
            { header: `${defaults.helpHeader}: database dump`, content: 'Dump all database documents to file.' }
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

    const allDocs = await db.db.allDocs({ include_docs: true, startkey: args.start, endkey: args.end });

    writeFileSync(args.file, JSON.stringify(allDocs, null, 4));

    log.info(context, 'Database dumped');
};

runCmd().catch((error: LuminCLIError) => {
    console.error(error);
});
