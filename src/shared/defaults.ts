const constants = {
    database: {
        localName: 'lumin-local'
    },
    helpHeader: 'Lumin Finance CLI',
    wallet: {
        filename: 'mywallet.json'
    }
};

const params = {
    database: {
        type: String,
        alias: 'd',
        defaultValue: constants.database.localName,
        description: 'Local database name. The database is stored in a new directory in the current working directory, under the same name as the database name.'
    },
    chainId: { type: Number, alias: 'c', description: 'Chain ID (e.g. 97).' },
    asset: { type: String, alias: 'a', description: 'Asset symbol (e.g. ETH).' },
    amount: {
        type: String,
        alias: 'n',
        description:
            'Amount of <asset> (0.02, 1.0, 1000, ..) When withdrawing, use the value "max" to withdraw all unlocked deposits.'
    },
    wallet: {
        type: String,
        alias: 'w',
        defaultValue: constants.wallet.filename,
        description: 'Wallet filename to use. (e.g. mywallet.json)'
    },
    help: { type: Boolean, alias: 'h', description: 'Prints this usage guide.' }
};

export const defaults = {
    ...constants,
    params: {
        ...params
    }
};

export interface IAssetArgs {
    asset: string;
}

export interface IChainArgs {
    chainId: number;
}

export interface IDatabaseArgs {
    database: string;
}
