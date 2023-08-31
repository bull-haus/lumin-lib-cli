import { defaults } from './defaults.js';

import { readFileSync, writeFileSync } from 'fs';
import { ethers } from 'ethers';

export interface IWallet {
    address: string;
    key: {
        private: string;
        public: string;
    };
    mnemonic: string;
}

export class Wallet {
    constructor() {
        this.generate();
    }

    generate() {
        const generatedWallet = ethers.Wallet.createRandom();

        this.data.address = generatedWallet.address;
        this.data.key.private = generatedWallet.privateKey;
        this.data.key.public = generatedWallet.publicKey;
        this.data.mnemonic = generatedWallet.mnemonic?.phrase ?? '';
    }

    read(filename = defaults.wallet.filename) {
        this.data = JSON.parse(readFileSync(filename, { encoding: 'ascii' }));
    }

    write(filename = defaults.wallet.filename, overwrite = false, mode = '0600') {
        writeFileSync(filename, JSON.stringify(this.data, null, 2), {
            encoding: 'ascii',
            flag: overwrite ? 'w' : 'wx',
            mode: mode
        });
    }

    data: IWallet = {
        address: ethers.ZeroAddress,
        key: {
            private: '',
            public: ''
        },
        mnemonic: ''
    };

    #ethersWallet: ethers.Wallet | undefined;
    set provider(value: ethers.AbstractProvider) {
        this.#ethersWallet = new ethers.Wallet(this.data.key.private, value);
    }

    sendTransaction = async (tx: ethers.ContractTransaction) => {
        return new Promise<void>((resolve, reject) => {
            if (!this.#ethersWallet) {
                return reject('No signer set');
            }

            this.#ethersWallet
                .sendTransaction(tx)
                .then((result) => {
                    result
                        .wait()
                        .then(() => {
                            return resolve();
                        })
                        .catch((error) => {
                            return reject(error);
                        });
                })
                .catch((error) => {
                    return reject(error);
                });
        });
    };
}
