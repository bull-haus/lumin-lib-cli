# General

Install dependencies:
```
npm install
```

## Log output

`@lib/lumin` and the CLI utils use https://github.com/gajus/roarr for logging.

Show log output:

```
ROARR_LOG=1 <command>
```

### Pretty-print

#### Browser

As stated on Roarr's GitHub page, consider using https://github.com/gajus/roarr-browser-log-writer to display log output.

#### NodeJS

When using `@lib/lumin` in a NodeJS application, consider installing the following tools to pretty-print logging output:

```
npm install --global @roarr/cli
```

Pretty-print log output:

```
ROARR_LOG=1 <command> | roarr
```

# Build

```
tsc
```

Output artifacts are placed in `./cli`

# Wallet

All transactions are signed with a user-owned wallet.

#### CLI command: wallet / generate

```
$ node cli/wallet/generate --help

Lumin Finance CLI: wallet generate

  Generate wallet for testing purposes. 

Options

  -f, --filename string   Wallet filename to write to.                      
  -o, --overwrite         Overwrite file if <filename> already exists.      
  -m, --mode string       File mode, only applies when creating a new file. 
  -h, --help              Prints this usage guide. 
```

You can generate a wallet with the following command:

```
node cli/wallet/generate.js
```

By default the wallet is stored in `mywallet.json`. Files are not overwritten unless the `-o --overwrite` option is used.

> Note: these wallets need some testnet tokens to actually send transactions. The wallet JSON files contain the private key, mnemonic and wallet address.
These can be used to import a wallet into e.g. Metamask, and to get testnet tokens on using a faucet.

Sample generated wallet:

```
{
  "address": "0x06914b943A91E10Ea15bEA6fabB60Abbdbed50A4",
  "key": {
    "private": "0x4dbb20396cef33e02ccf180c354509217ea817d30a76c1ae3a92a1bea1cec598",
    "public": "0x023ccf61ad47063472aa42b965efd145729a4955cb43dd4d1984c4b080245a21e4"
  },
  "mnemonic": "quick tattoo pull action arch laugh field spray flush head funny normal"
}                                                                        
```

`address` is the public wallet address, to which users (and faucets) can send testnet tokens.

`key.private` can be used to import this wallet into Metamask. Go to `import account`, select `private key` and copy the text from `key.private` into the field.

When using CLI commands that need a wallet (all state changing transactions), the file `mywallet.json` is used by default. If you want to use another wallet, use the `-w --wallet` option for these commands.

# Database

The database used by Lumin Finance is [PouchDB](https://pouchdb.com/) for the client lib, and [CouchDB](https://couchdb.apache.org/) as master database on https://db.lumin.finance.

All clients need a local database, but it can just be a simple compacted clone of one of the master databases.

The default local database name is `lumin-local`, which is stored in the current directory under `./lumin-local`. Remove this directory to start with a fresh database, or use the `-d --database` option to specify a new database.

You can specify the local database using the `-d --database` option on all CLI commands using the database, in case you want to use a name different than the default `lumin-local`.

## Master database

The master database on https://db.lumin.finance needs the following HTTP authentication:

- username: `client`
- password: `client`

For example, to get all documents:

```
curl -X GET https://client:client@db.lumin.finance/db-testnet/_all_docs
```

From now on all examples have `https://client:client@db.lumin.finance/db-testnet` rewritten as `<db>`, so the following commands are identical in this document:

```
curl -X GET https://client:client@db.lumin.finance/db-testnet/_all_docs
curl -X GET <db>/_all_docs
```

> Lumin Finance team will later provide access to the database without authentication, so that it is easier to query Lumin Finance data using other tools or directly from the browser.

## Filling the database

Since `@lumin/lib` uses the local database for most of its operations, it needs to be filled with useful data before using the lib. This can be done in two ways:

- bootstrap from a centralized up-to-date master database
- manually configure the local database

Both options are explained in this guide. Although the bootstrap option is the easiest option, we start by explaining the manual option so that it is clear what data is contained in the database, and how `@lumin/lib` uses this data. It is safe to skip the following sections and continue with the bootstrapping option.

### Manual database configuration

#### Chain configuration

Lumin Finance supports multiple chains. A chain configuration looks as follows:

```
{
   "name":"BNB Smart Chain Testnet",
   "chainId":97,
   "type":"Testnet",
   "providers":[
      {
         "url":"https://rpc.ankr.com/bsc_testnet_chapel",
         "type":"JSONRPC",
         "priority":1,
         "eth_getLogsMaxBlocks":1000
      },
      {
         "url":"https://data-seed-prebsc-1-s1.binance.org:8545/",
         "type":"JSONRPC",
         "priority":2,
         "eth_getLogsMaxBlocks":0
      }
   ],
   "contracts":{
      "assetManager":{
         "address":"0xFb4d7CBC2Ea6030E8C0C9F5e40b30ffBfe91b2e4",
         "block":32808604
      }
   }
}
```

The database document id for chain configurations is: `<chain/<lowercase type>/<name>`. For example:

- `chain/devnet/local`
- `chain/testnet/BNB Smart Chain Testnet`
- `chain/testnet/Arbitrum Goerli`
- `chain/mainnet/Arbitrum`

This allows for easy retrieval from the database:

```
# Get all chain configurations
curl -X GET '<db>/_all_docs?startkey="chain/"&endkey="chain0"'

# Get all mainnet chain configurations
curl -X GET '<db>/_all_docs?startkey="chain/mainnet/"&endkey="chain/mainnet0"'

```

> Note: the ASCII character `/` (character code 47) is followed by `0` (character code 48). When searching for specific documents, the start- and endkey feature can help quickly retrieve the wanted data. As per CouchDB documentation, the `_all_docs` view is the most optimized of all views, so querying based on the document ID using start- and endkey is fastest.

`chainId` is a unique value indicating the official chain identifier. See https://chainlist.org/ for known chain identifiers.

`type` can be `Devnet`, `Testnet` and `Mainnet`. Its only purpose is to semantically separate the configurations, and to make it easier to provide generic commands (e.g. "connect to all mainnet chains", instead of "connect to chain 97, 1003, .." individually).

`providers` is a list of JSON RPC or Websocket providers that shall be used for communicating with the nodes.

> Note: at this moment, the provider with the lowest numeric `priority` value is used. Later there will be some connection strategies offered, in case communication to a node stops working during runtime.

`eth_getLogsMaxBlocks` shall be 0 in case the provider does not support `eth_getLogs`. If this command is supported, it shall be maximum the amount of blocks that can be queried at once.

> Note: it is not possible to retrieve old event data if a provider does not support `eth_getLogs`. In those cases the synchronization between the nodes and the local database is much slower and the database will lack event data, consider bootstrapping your database from one of the centralized master databases instead.

`contracts` contains all contracts that are deployed on this particular chain. Each contract has an address and a block number, indicating at what block the contract has been deployed. This helps with synchronization, as the nodes only need to be checked for event data since contract deployment.

The CLI tools provide some sample chain configurations in `./config`.

##### CLI command: database / addchain

```
$ node cli/database/addchain.js --help

Lumin Finance CLI: database addchain

  Add chain configuration to database. 

Options

  -d, --database string   Local database name. The database is stored in a new directory in the   
                          current working directory, under the same name as the database name.    
  -c, --config string     Chain config filename to use. (e.g. config/chain-bnb-testnet.json)      
  -h, --help              Prints this usage guide.   
```

> Note: there is no directory named `lumin-local` in your current working directory yet.

Add the sample BNB Chain configuration as follows:

```
node cli/database/addchain.js --config config/chain-bnb-testnet.json
```

> Note: you should now see a directory named `lumin-local`.

##### CLI command: database / dump

```
$ node cli/database/dump.js --help

Lumin Finance CLI: database dump

  Dump all database documents to file. 

Options

  -d, --database string   Local database name. The database is stored in a new directory in the   
                          current working directory, under the same name as the database name.    
  -f, --file string       Output filename to to dump data to. (e.g. dump.json)                    
  -s, --start string      Start key of document to filter for.                                    
  -e, --end string        End key of document to filter for.                                      
  -h, --help              Prints this usage guide. ```
```

Verify that your database contains the newly added chain data:

```
node cli/database/dump.js
```

Open the file `dump.json` to see that the chain data (plus some data added by PouchDB) has been added to your local database.

##### CLI command: database / sync

```
$ node cli/database/sync.js --help

Lumin Finance CLI: database sync

  Sync database with chain.

Options

  -d, --database string   Local database name. The database is stored in a new directory in the   
                          current working directory, under the same name as the database name.    
  -c, --chainId number    Chain ID (e.g. 97).                                                     
  -f, --force             Force complete resync.                                                  
  -h, --help              Prints this usage guide.  
```

Now that `@lumin/lib` can find a chain configuration, the database can be synchronized with a node. We have added BSC Testnet, which has a chain ID of 97 (see https://chainlist.org/chain/97).

If we have configured a provider that supports `eth_getLogs`, we will be able to quickly retrieve most data using emitted events.

When `eth_getLogs` is not supported, `@lumin/lib` will have to resort to finding out all data in individual requests to the RPC provider. This can lead to rate limiting. Requesting individual data is also necessary in the case where `eth_getLogs` does work, but to a much lesser extent.

To synchronize the newly added BSC Testnet chain, use the following command:

```
node cli/database/sync.js --chainId 97
```

> Note: when you receive the following error, the chain configuration has a too high value for `eth_getLogsMaxBlocks`: _Error: missing response for request (value=[ { "error": { "code": -32600, "message": "block range is too wide" }, "id": null, "jsonrpc": "2.0" } ], info={ "payload": { "id": 4, "jsonrpc": "2.0", "method": "eth_getLogs" .._

When the sync command finishes, dump the `sync` documents from your database:

```
node cli/database/dump.js --start sync/ --end sync/0
```

Open `dump.json`; it shows a synchronization document for each chain:

```
{
    "total_rows": 16,
    "offset": 0,
    "rows": [
        {
            "id": "sync/chain/97",
            "key": "sync/chain/97",
            "value": {
                "rev": "106-ea001865ef7504912b1171d340d5c81f"
            },
            "doc": {
                "chainId": 97,
                "contracts": {
                    "assetManager": {
                        "fromBlock": 32808604,
                        "toBlock": 32913132
                    }
                },
                "_id": "sync/chain/97",
                "_rev": "106-ea001865ef7504912b1171d340d5c81f"
            }
        }
    ]
}
```

Each contract has a `fromBlock` value, indicating from which block onwards the data has been synchronized, and a `toBlock` value, indicating up to which block the data has been synchronized.

> Note: every time `eth_getLogs` is requested, the revision of the document is increased. This is done on purpose, but due to this rapid increase of revisions this document will be moved to the same local database used for quickly-changing data like price data. That document only stores the latest revision, leading to a more compact database.

#### Assets

After successful synchronization, your local database should now have a list of assets provided on the platform. Check this by dumping asset documents.

```
node cli/database/dump.js --start asset/ --end asset/0
```

You should see several assets, one is listed here:

```
{
    "id": "asset/BTC/0",
    "key": "asset/BTC/0",
    "value": {
        "rev": "1-7361555ca162d68e906c74a67291dfe6"
    },
    "doc": {
        "symbol": "BTC",
        "asset": "Bitcoin",
        "collectionId": "0",
        "type": "1",
        "assetId": "24913638989147350416888755397444558319016497336379360162583774432170883087185",
        "chains": [
            {
                "chainId": 97,
                "contract": "0x8D88e5E43b396F4bf84E1AEB80A9567dB2785Ea9"
            }
        ],
        "_id": "asset/BTC/0",
        "_rev": "1-7361555ca162d68e906c74a67291dfe6"
    }
}
```

Your local database has been created and is filled with actual data from the blockchain. As you will have to keep a daemon process running to add new data to the chain, it is recommended to synchronize your local database with a centralized master database, as is explained in the next section. There is nothing against maintaining your own database though.

Before we continue with the section about synchronizing to the master database, we briefly handle synchronizing your own database contents to a remote database. This is exactly what the Lumin Finance team does; maintain a local database, and push any changes directly to their public master database. This master database is in turn used by others to make use of the latest data received from the blockchain.

<TODO Sync to master database>

### Master database

<TODO Sync from master database>

### Assets

Each asset is uniquely identified by a numerical ID (`assetId`), which is equal across all chains. The value is the keccak256 value over the tuple `(symbol, collectionId)`. Since ERC1155 assets are planned to be supported in the future, each asset has a `collectionId`, which is always `0` for now. For ERC1155 assets, this will be set to the token ID within that contract.

The `chains` attribute lists all chains on which the asset is supported for Lumin Finance. All smart contract methods of Lumin Finance that deal with assets use `assetId`, not `symbol`, to identify tokens.

##### CLI command: asset / balance

```
$ node cli/asset/balance.js --help

Lumin Finance CLI: asset balance

  Display user's asset balances and deposits. 

Options

  -d, --database string   Local database name. The database is stored in a 
                          new directory in the current working directory,  
                          under the same name as the database name.        
  -c, --chainId number    Chain ID (e.g. 97).                              
  -w, --wallet string     Wallet filename to use. (e.g. mywallet.json)     
  -h, --help              Prints this usage guide. 
```

Before we mint and deposit any tokens, verify that your wallet does not yet have any balance.

```
node cli/asset/balance.js --chainId 97
```

For each asset supported on this chain, you should see that `wallet balance` and `user deposit` is `0`.

##### CLI command: asset / mint

```
node cli/asset/mint.js --help

Lumin Finance CLI: mock asset mint

  Mint mock tokens on testnet.

Options

  -d, --database string   Local database name. The database is stored in a 
                          new directory in the current working directory,  
                          under the same name as the database name.        
  -c, --chainId number    Chain ID (e.g. 97).                              
  -a, --asset string      Asset symbol (e.g. ETH).                         
  -w, --wallet string     Wallet filename to use. (e.g. mywallet.json)     
  -h, --help              Prints this usage guide.  
```

> Note: This CLI command is only useful on testnets, as Lumin Finance provides a few mock ERC20 tokens that can be used to test the platform.

> Note: This is a state-changing transaction, and thus needs some coins to pay for fees. Make sure to send some to your wallet address before running this command.

Mint some BTC tokens using the CLI:

```
node cli/asset/mint.js --chainId 97 --asset BTC
```

Verify that you now have 1,000 Lumin testnet BTC in your wallet:

```
node cli/asset/balance.js --chainId 97
```

#### CLI command: asset / deposit

```
$ node cli/asset/deposit.js --help

Lumin Finance CLI: asset deposit

  Deposit assets on Lumin. 

Options

  -d, --database string   Local database name. The database is stored in a 
                          new directory in the current working directory,  
                          under the same name as the database name.        
  -c, --chainId number    Chain ID (e.g. 97).                              
  -a, --asset string      Asset symbol (e.g. ETH).                         
  -n, --amount string     Amount of <asset> (0.02, 1.0, 1000, ..) When     
                          withdrawing, use the value "max" to withdraw all 
                          unlocked deposits.                               
  -w, --wallet string     Wallet filename to use. (e.g. mywallet.json)     
  -h, --help              Prints this usage guide.   
```

Deposit some of your newly minted BTC tokens:

```
node cli/asset/deposit.js --chainId 97 --asset BTC --amount 12.34
```

The deposit command first approves the transaction, and then deposits it into the Lumin contracts. Check your balances again to see the changes on the platform and in your wallet:

```
node cli/asset/balance.js --chainId 97
```

You should now hold `1000 - 12.34 = 987.66 BTC`, your user deposit has `12.34 BTC` in total, none of it is locked, and your deposit has increased the total deposit on the platform.

#### CLI command: asset / withdraw

```
$ node cli/asset/withdraw.js --help      

Lumin Finance CLI: asset withdraw

  Withdraw assets from Lumin. 

Options

  -d, --database string   Local database name. The database is stored in a 
                          new directory in the current working directory,  
                          under the same name as the database name.        
  -c, --chainId number    Chain ID (e.g. 97).                              
  -a, --asset string      Asset symbol (e.g. ETH).                         
  -n, --amount string     Amount of <asset> (0.02, 1.0, 1000, ..) When     
                          withdrawing, use the value "max" to withdraw all 
                          unlocked deposits.                               
  -w, --wallet string     Wallet filename to use. (e.g. mywallet.json)     
  -h, --help              Prints this usage guide.
```

Withdraw one BTC back into your wallet.

```
node cli/asset/withdraw.js --chainId 97 --asset BTC --amount 1
```

Check your balances again. You now have 11.34 BTC remaining on Lumin. In case you want to withdraw all unlocked tokens, you can supply `max` as value for `amount`.

```
node cli/asset/withdraw.js --chainId 97 --asset BTC --amount max
```

#### CLI command: asset / info

```
$ node cli/asset/info.js --help

Lumin Finance CLI: asset info

  Display asset information. 

Options

  -d, --database string   Local database name. The database is stored in a 
                          new directory in the current working directory,  
                          under the same name as the database name.        
  -c, --chainId number    Chain ID (e.g. 97).                              
  -a, --asset string      Asset symbol (e.g. ETH).                         
  -h, --help              Prints this usage guide.
```

Use this command to find information about a specific asset supported on a chain. For example, to see information about the `BTC` asset on `BSC Testnet`:

```
node cli/asset/info.js --chainId 97 --asset BTC
```

This shows the following info taken from your local database:

```
Asset info
  - id    : 24913638989147350416888755397444558319016497336379360162583774432170883087185
  - name  : Bitcoin
  - symbol: BTC
  - chains:
    - chainId: 97
    - price feeds
      - index 0:
        - address: 0x5741306c21795FdCBb9b265Ea0255F499DFe515C
        - enabled: yes
        - price feed proxy:
          - description: Chainlink Testnet Price Feed
          - address    : 0xCa72628222C1a32AD3b285F7B4D5186B473Cd9B7
          - enabled    : yes
      - index 1:
        - address: 0x3D4BC3E12187cA4eA14705c7859cb369f92ad291
        - enabled: yes
        - price feed proxy:
          - description: Manual Lumin Testnet Price Feed
          - address    : 0x59A302D4947D9f623537D2D017B84aF5b7230d66
          - enabled    : yes
```

### Price Feeds

Lumin Finance supports multiple price feeds for listed assets. This means that assets can be listed that are not (yet) available on the bigger oracles like Chainlink. It also means that an asset can have different monetary values, depending on which oracle you check.
