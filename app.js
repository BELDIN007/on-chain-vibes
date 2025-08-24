document.addEventListener('DOMContentLoaded', () => {
    console.log('On-Chain Vibes dApp frontend loaded.');

    // --- Configuration (UPDATE THESE AFTER DEPLOYING YOUR CONTRACT TO SEPOLIA) ---
    // PASTE YOUR SEPOLIA DEPLOYED CONTRACT ADDRESS HERE
    const CONTRACT_ADDRESS = "0xdf8DcBBD19C955bAe4c6E9001BfF3ECFf8B85a4E";
    // PASTE YOUR SEPOLIA DEPLOYED CONTRACT ABI HERE
    const CONTRACT_ABI = [
        {
            "inputs": [
                { "internalType": "string", "name": "_message", "type": "string" }
            ],
            "name": "postVibe",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getAllVibes",
            "outputs": [
                {
                    "components": [
                        { "internalType": "string", "name": "message", "type": "string" },
                        { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
                        { "internalType": "address", "name": "poster", "type": "address" }
                    ],
                    "internalType": "struct OnChainVibes.Vibe[]",
                    "name": "",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [
                { "indexed": true, "internalType": "address", "name": "poster", "type": "address" },
                { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
                { "indexed": false, "internalType": "string", "name": "message", "type": "string" }
            ],
            "name": "NewVibe",
            "type": "event"
        },
        {
            "inputs": [],
            "name": "allVibes",
            "outputs": [
                {
                    "components": [
                        { "internalType": "string", "name": "message", "type": "string" },
                        { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
                        { "internalType": "address", "name": "poster", "type": "address" }
                    ],
                    "internalType": "struct OnChainVibes.Vibe[]",
                    "name": "",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                { "internalType": "uint256", "name": "", "type": "uint256" }
            ],
            "name": "allVibes",
            "outputs": [
                { "internalType": "string", "name": "message", "type": "string" },
                { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
                { "internalType": "address", "name": "poster", "type": "address" }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getTotalVibes",
            "outputs": [
                { "internalType": "uint256", "name": "", "type": "uint256" }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    // --- Global Variables ---
    let signer = null;
    let provider = null;
    let contract = null;
    let userAddress = null;

    // --- DOM Elements ---
    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    const postVibeBtn = document.getElementById('post-vibe-btn');
    const vibeMessageTextarea = document.getElementById('vibe-message');
    const charCountSpan = document.getElementById('char-count');
    const vibesContainer = document.getElementById('vibes-container');
    const loadingMessage = document.getElementById('loading-message');
    const networkStatusSpan = document.getElementById('network-status');

    // New filter elements
    const filterInput = document.getElementById('filter-input');
    const applyFilterBtn = document.getElementById('apply-filter-btn');
    const clearFilterBtn = document.getElementById('clear-filter-btn');


    // --- Helper Functions ---

    /**
     * @dev Shortens an Ethereum address for display purposes.
     * @param {string} address The full Ethereum address.
     * @returns {string} The shortened address.
     */
    function shortenAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    /**
     * @dev Displays a user-friendly message as a floating notification.
     * @param {string} message The message to display.
     * @param {'info' | 'success' | 'error'} type The type of message (determines color).
     */
    function showUserMessage(message, type = 'info') {
        const messageContainer = document.createElement('div');
        messageContainer.className = `fixed top-4 right-4 p-3 rounded-lg shadow-lg text-sm z-50
            ${type === 'success' ? 'bg-green-500 text-white' : ''}
            ${type === 'error' ? 'bg-red-500 text-white' : ''}
            ${type === 'info' ? 'bg-blue-500 text-white' : ''}`;
        messageContainer.textContent = message;
        document.body.appendChild(messageContainer);
        setTimeout(() => messageContainer.remove(), 3000); // Remove after 3 seconds
    }

    /**
     * @dev Updates the displayed network status.
     * @param {string} networkName The name of the connected network.
     * @param {string} statusColor Tailwind class for the status color.
     */
    function updateNetworkStatus(networkName, statusColor = 'text-subtle-gray') {
        networkStatusSpan.textContent = `Network: ${networkName}`;
        networkStatusSpan.className = `text-sm ${statusColor} ml-2`;
        networkStatusSpan.classList.remove('hidden');
    }

    // --- Web3 Interaction Functions ---

    /**
     * @dev Connects the user's MetaMask/Web3 wallet and initializes ethers provider/signer/contract.
     */
    async function connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request accounts from the wallet (triggers MetaMask popup)
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                userAddress = accounts[0];

                // Initialize provider and signer
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();

                // Get current network and check if it's Sepolia
                const network = await provider.getNetwork();
                const expectedChainId = 11155111; // Sepolia Chain ID
                if (network.chainId !== expectedChainId) {
                    showUserMessage(`Please switch your MetaMask to the Sepolia network. Current: ${network.name} (ChainID: ${network.chainId})`, 'error');
                    updateNetworkStatus(`Wrong Network: ${network.name}`, 'text-red-400');
                    postVibeBtn.disabled = true; // Disable post button if on wrong network
                    return; // Stop execution if on wrong network
                }

                // Initialize the contract instance with the signer for transactions
                contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

                // Update UI to show connected state
                const walletInfo = document.getElementById('wallet-info');
                walletInfo.innerHTML = `
                    <div class="flex items-center space-x-2 bg-card-dark px-4 py-2 rounded-lg shadow-md">
                        <span class="relative flex h-3 w-3">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span class="text-sm font-semibold text-text-light">${shortenAddress(userAddress)}</span>
                    </div>
                `;
                connectWalletBtn.style.display = 'none'; // Hide connect button

                // Update network status to green
                updateNetworkStatus(`${network.name}`, 'text-green-400');

                // Enable post vibe button if message is not empty and wallet is connected
                postVibeBtn.disabled = vibeMessageTextarea.value.length === 0;

                showUserMessage("Wallet connected!", 'success');
                fetchVibes(); // Fetch and display vibes after successful connection

                // Add event listener for account changes in MetaMask
                window.ethereum.on('accountsChanged', (newAccounts) => {
                    if (newAccounts.length === 0) {
                        showUserMessage("Wallet disconnected. Please reconnect.", 'info');
                        location.reload(); // Simple reload for now, or more complex state reset
                    } else {
                        userAddress = newAccounts[0];
                        showUserMessage("Account changed. Updating...", 'info');
                        connectWallet(); // Re-initialize with new account
                    }
                });

                // Add event listener for network changes
                window.ethereum.on('chainChanged', (chainId) => {
                    const newChainId = parseInt(chainId, 16);
                    if (newChainId === expectedChainId) {
                         showUserMessage("Switched to Sepolia network. Reloading...", 'success');
                    } else {
                         showUserMessage(`Switched to unsupported network (ChainID: ${newChainId}). Please switch to Sepolia. Reloading...`, 'error');
                    }
                    location.reload(); // Reload to ensure correct contract instance and network
                });

            } catch (error) {
                console.error("Wallet connection failed:", error);
                if (error.code === 4001) {
                    showUserMessage("Wallet connection rejected by user.", 'info');
                } else {
                    showUserMessage("Failed to connect wallet. Please try again.", 'error');
                }
                updateNetworkStatus("Disconnected", 'text-red-400');
            }
        } else {
            showUserMessage("MetaMask or another Web3 wallet is not detected. Please install one.", 'info');
            connectWalletBtn.innerHTML = `
                <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer"
                   class="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    Install MetaMask
                </a>
            `;
            updateNetworkStatus("Wallet not detected", 'text-red-400');
        }
    }

    /**
     * @dev Posts a new vibe message to the blockchain via the smart contract.
     */
    async function postVibe() {
        const message = vibeMessageTextarea.value.trim();
        if (!message || !contract) {
            showUserMessage("Please connect your wallet and enter a message.", 'info');
            return;
        }

        postVibeBtn.disabled = true;
        const originalBtnText = postVibeBtn.textContent;
        postVibeBtn.textContent = "Posting...";

        try {
            const transaction = await contract.postVibe(message);
            showUserMessage("Transaction sent! Waiting for confirmation...", 'info');
            await transaction.wait();
            showUserMessage("Vibe posted successfully!", 'success');

            vibeMessageTextarea.value = "";
            charCountSpan.textContent = "0/140";
            postVibeBtn.disabled = true;
            fetchVibes(); // Refresh the feed after a new post

        } catch (error) {
            console.error("Failed to post vibe:", error);
            if (error.code === 4001) {
                showUserMessage("Transaction rejected by user.", 'info');
            } else if (error.data && error.data.message) {
                showUserMessage(`Post failed: ${error.data.message.split('execution reverted: ')[1] || error.data.message}`, 'error');
            } else {
                showUserMessage("Failed to post vibe. See console for details.", 'error');
            }
        } finally {
            postVibeBtn.textContent = originalBtnText;
            postVibeBtn.disabled = vibeMessageTextarea.value.length === 0 || !signer;
        }
    }

    /**
     * @dev Fetches all vibe messages from the blockchain and dynamically displays them in the UI.
     * @param {string} [filterTerm] Optional term to filter vibes by (address or text).
     */
    async function fetchVibes(filterTerm = '') {
        if (!contract) {
            loadingMessage.textContent = "Connect your wallet to load vibes.";
            loadingMessage.style.display = 'block';
            return;
        }

        loadingMessage.textContent = "Loading vibes...";
        loadingMessage.style.display = 'block';
        vibesContainer.innerHTML = '';

        try {
            const allVibes = await contract.getAllVibes();
            let filteredVibes = allVibes;

            // Apply filter if a filter term is provided
            if (filterTerm.trim() !== '') {
                const lowerCaseFilter = filterTerm.trim().toLowerCase();
                filteredVibes = allVibes.filter(vibe => {
                    // Filter by poster address or message content
                    const vibeMessage = vibe.message.toLowerCase();
                    const vibePoster = vibe.poster.toLowerCase();

                    return vibeMessage.includes(lowerCaseFilter) ||
                           vibePoster.includes(lowerCaseFilter);
                });
            }

            if (filteredVibes.length === 0) {
                loadingMessage.textContent = filterTerm ? "No vibes found matching your filter." : "No vibes posted yet. Be the first to share!";
                loadingMessage.style.display = 'block';
                return;
            }

            loadingMessage.style.display = 'none';

            // Create and append a card for each filtered vibe
            filteredVibes.reverse().forEach(vibe => {
                const vibeCard = document.createElement('div');
                vibeCard.className = 'vibe-card bg-bg-dark p-4 rounded-lg border border-subtle-gray shadow-sm cursor-pointer';

                const message = vibe.message;
                const timestamp = vibe.timestamp.toNumber();
                const poster = vibe.poster;

                const senderAddress = shortenAddress(poster);
                const formattedDate = new Date(timestamp * 1000).toLocaleString();

                vibeCard.innerHTML = `
                    <p class="text-text-light text-lg mb-2 break-words">${message}</p>
                    <div class="flex justify-between text-sm text-subtle-gray">
                        <span>By: <span class="font-mono">${senderAddress}</span></span>
                        <span>${formattedDate}</span>
                    </div>
                `;
                vibesContainer.appendChild(vibeCard);
            });
        } catch (error) {
            console.error("Failed to fetch vibes:", error);
            loadingMessage.style.display = 'block';
            loadingMessage.textContent = "Error loading vibes. Please ensure your wallet is connected to Sepolia and try again.";
        }
    }

    // --- Event Listeners ---

    connectWalletBtn.addEventListener('click', connectWallet);
    postVibeBtn.addEventListener('click', postVibe);

    vibeMessageTextarea.addEventListener('input', () => {
        const charCount = vibeMessageTextarea.value.length;
        charCountSpan.textContent = `${charCount}/140`;
        postVibeBtn.disabled = charCount === 0 || !signer;
    });

    // Event listeners for filter functionality
    applyFilterBtn.addEventListener('click', () => {
        const filterTerm = filterInput.value;
        fetchVibes(filterTerm);
    });

    clearFilterBtn.addEventListener('click', () => {
        filterInput.value = ''; // Clear the input field
        fetchVibes(); // Refetch all vibes without any filter
    });

    filterInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            applyFilterBtn.click(); // Trigger filter on Enter key press
        }
    });


    // --- Initial Load Logic ---
    async function initializeDApp() {
        if (typeof window.ethereum !== 'undefined' && window.ethereum.selectedAddress) {
            await connectWallet();
        } else {
            loadingMessage.textContent = "Please connect your wallet to view and post vibes.";
            loadingMessage.style.display = 'block';
            updateNetworkStatus("Not Connected", 'text-red-400');
        }
    }

    initializeDApp();
});
