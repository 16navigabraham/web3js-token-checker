// Token configurations for different networks
const TOKEN_CONFIGS = {
    ethereum: {
        USDT: {
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            decimals: 6
        },
        USDC: {
            address: '0xA0b86a33E6441f8bd88425Cdc8efEf9B9b5D6fE1',
            decimals: 6
        },
        DAI: {
            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            decimals: 18
        }
    },
    polygon: {
        USDT: {
            address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            decimals: 6
        },
        USDC: {
            address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            decimals: 6
        }
    },
    base: {
        USDC: {
            address: '0x833589fcd6eDb6E08f4c7C32D4f71b54bdA02913',
            decimals: 6
        }
    }
};

const NETWORKS = {
    ethereum: {
        name: 'Ethereum Mainnet',
        rpc: 'https://mainnet.infura.io/v3/c7646448da474d328123576232a8c192',
        currency: 'ETH'
    },
    polygon: {
        name: 'Polygon',
        rpc: 'https://polygon-mainnet.infura.io/v3/c7646448da474d328123576232a8c192',
        currency: 'MATIC'
    },
    base: {
        name: 'Base',
        rpc: 'https://base-mainnet.infura.io/v3/c7646448da474d328123576232a8c192',
        currency: 'ETH'
    }
};

// ERC-20 ABI (Application Binary Interface) - defines how to interact with token contracts
const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    }
];

// Global variables
let web3;
let currentNetwork = 'ethereum';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Web3.js Token Checker Ready!');
    updateNetwork();
});

// Update network function
function updateNetwork() {
    const networkSelect = document.getElementById('network');
    currentNetwork = networkSelect.value;
    
    console.log(`🔄 Switching to ${NETWORKS[currentNetwork].name}`);
    
    // ✅ Key Difference: Web3.js instantiation
    web3 = new Web3(NETWORKS[currentNetwork].rpc);
    
    hideResults();
    hideError();
}

// Main function to check all balances
async function checkAllBalances() {
    const address = document.getElementById('address').value.trim();
    
    if (!address) {
        showError('Please enter a wallet address');
        return;
    }
    
    // ✅ Web3.js address validation
    if (!web3.utils.isAddress(address)) {
        showError('Invalid Ethereum address format');
        return;
    }
    
    showLoading();
    hideError();
    hideResults();
    
    const balances = [];
    
    try {
        // Check Native Token (ETH/MATIC)
        if (document.getElementById('eth').checked) {
            const nativeBalance = await getNativeBalance(address);
            balances.push({
                symbol: NETWORKS[currentNetwork].currency,
                balance: nativeBalance,
                type: 'native'
            });
        }
        
        // Check selected ERC-20 tokens
        const tokens = ['usdt', 'usdc', 'dai'];
        for (const tokenId of tokens) {
            const checkbox = document.getElementById(tokenId);
            if (checkbox && checkbox.checked) {
                const tokenSymbol = tokenId.toUpperCase();
                if (TOKEN_CONFIGS[currentNetwork][tokenSymbol]) {
                    const tokenBalance = await getTokenBalance(address, tokenSymbol);
                    balances.push({
                        symbol: tokenSymbol,
                        balance: tokenBalance,
                        type: 'erc20'
                    });
                }
            }
        }
        
        // Check custom token
        const customTokenAddress = document.getElementById('custom-token').value.trim();
        const customSymbol = document.getElementById('custom-symbol').value.trim();
        
        if (customTokenAddress && customSymbol) {
            try {
                const customBalance = await getCustomTokenBalance(address, customTokenAddress, customSymbol);
                balances.push({
                    symbol: customSymbol,
                    balance: customBalance,
                    type: 'custom'
                });
            } catch (error) {
                console.warn('Custom token error:', error);
                balances.push({
                    symbol: customSymbol,
                    balance: 'Error fetching',
                    type: 'error'
                });
            }
        }
        
        showResults(balances, address);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError('Failed to fetch balances. Please try again.');
    } finally {
        hideLoading();
    }
}

// Get native token balance (ETH/MATIC)
async function getNativeBalance(address) {
    try {
        // ✅ Web3.js syntax for getting balance
        const balanceWei = await web3.eth.getBalance(address);
        
        // ✅ Web3.js unit conversion
        const balanceEther = web3.utils.fromWei(balanceWei, 'ether');
        
        return parseFloat(balanceEther).toFixed(6);
    } catch (error) {
        console.error('Native balance error:', error);
        return 'Error';
    }
}

// Get ERC-20 token balance
async function getTokenBalance(address, tokenSymbol) {
    try {
        const tokenConfig = TOKEN_CONFIGS[currentNetwork][tokenSymbol];
        if (!tokenConfig) {
            return 'Not available';
        }
        
        // ✅ Web3.js contract creation
        const contract = new web3.eth.Contract(ERC20_ABI, tokenConfig.address);
        
        // ✅ Web3.js contract method call
        const balanceWei = await contract.methods.balanceOf(address).call();
        
        // Convert from smallest unit to readable format
        const divisor = Math.pow(10, tokenConfig.decimals);
        const balance = parseFloat(balanceWei) / divisor;
        
        return balance.toFixed(6);
    } catch (error) {
        console.error(`${tokenSymbol} balance error:`, error);
        return 'Error';
    }
}

// Get custom token balance
async function getCustomTokenBalance(address, tokenAddress, symbol) {
    // ✅ Web3.js address validation for token contract
    if (!web3.utils.isAddress(tokenAddress)) {
        throw new Error('Invalid token contract address');
    }
    
    const contract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    
    // Get balance and decimals
    const [balanceWei, decimals] = await Promise.all([
        contract.methods.balanceOf(address).call(),
        contract.methods.decimals().call()
    ]);
    
    const divisor = Math.pow(10, parseInt(decimals));
    const balance = parseFloat(balanceWei) / divisor;
    
    return balance.toFixed(6);
}

// Display results
function showResults(balances, address) {
    const resultsDiv = document.getElementById('results');
    const balanceList = document.getElementById('balance-list');
    
    let html = `<div class="address-info">Address: ${address}</div>`;
    
    balances.forEach(token => {
        const statusClass = token.type === 'error' ? 'error-token' : 'success-token';
        html += `
            <div class="balance-item ${statusClass}">
                <span class="token-symbol">${token.symbol}</span>
                <span class="token-balance">${token.balance}</span>
                <span class="token-type">(${token.type})</span>
            </div>
        `;
    });
    
    balanceList.innerHTML = html;
    resultsDiv.classList.remove('hidden');
}

// Helper functions (same as before)
function showError(message) {
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = `❌ ${message}`;
    errorDiv.classList.remove('hidden');
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideResults() {
    document.getElementById('results').classList.add('hidden');
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}