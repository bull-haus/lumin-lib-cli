export const abi_erc20 = [
    // Read-Only Functions
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',

    // Mock ERC20 contracts
    'function mint()',

    // Authenticated Functions
    'function transfer(address to, uint amount) returns (bool)',
    'function approve(address spender, uint amount) public returns (bool success)',

    // Events
    'event Transfer(address indexed from, address indexed to, uint amount)'
];
