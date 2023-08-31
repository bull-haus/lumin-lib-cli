import { defaults } from '../shared/defaults.js';
import { Wallet } from '../shared/wallet.js';

import { parse } from 'ts-command-line-args';
import { Roarr as log } from 'roarr';

interface IWalletGenerateParams {
    filename: string;
    overwrite: boolean;
    mode: string;
    help?: boolean;
}

export const args = parse<IWalletGenerateParams>(
    {
        filename: {
            type: String,
            alias: 'f',
            defaultValue: defaults.wallet.filename,
            description: 'Wallet filename to write to.'
        },
        overwrite: {
            type: Boolean,
            alias: 'o',
            defaultValue: false,
            description: 'Overwrite file if <filename> already exists.'
        },
        mode: {
            type: String,
            alias: 'm',
            defaultValue: '0600',
            description: 'File mode, only applies when creating a new file.'
        },
        help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide.' }
    },
    {
        helpArg: 'help',
        headerContentSections: [
            { header: 'Lumin Finance CLI: wallet generate', content: 'Generate wallet for testing purposes.' }
        ]
    }
);

const runCmd = async () => {
    const context: any = {
        args: JSON.parse(JSON.stringify(args))
    };

    log.info(context, 'generating wallet');

    const wallet = new Wallet();
    wallet.write(args.filename, args.overwrite, args.mode);
};

runCmd();
