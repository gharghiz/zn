import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const zenChainConfig = {
  chainId: '0x20D8',
  chainName: 'ZenChain Testnet',
  nativeCurrency: { name: 'ZTC', symbol: 'ZTC', decimals: 18 },
  rpcUrls: ['https://zenchain-testnet.api.onfinality.io/public'],
  blockExplorerUrls: ['https://explorer.zenchain.io'],
};

const tokens = [
  { symbol: 'ZTC', logo: '/assets/ztc-logo.png', address: '0x...' }, // استبدل بالعناوين الحقيقية
  { symbol: 'BTC', logo: '/assets/btc-logo.png', address: '0x...' },
  { symbol: 'ETH', logo: '/assets/eth-logo.png', address: '0x...' },
  { symbol: 'USDT', logo: '/assets/usdt-logo.png', address: '0x...' },
  { symbol: 'USDC', logo: '/assets/usdc-logo.png', address: '0x...' },
  { symbol: 'POL', logo: '/assets/pol-logo.png', address: '0x...' },
];

const Swap = () => {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState(0);
  const [fromToken, setFromToken] = useState('ZTC');
  const [toToken, setToToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [simulation, setSimulation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState(JSON.parse(localStorage.getItem('transactions')) || []);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (window.ethereum) {
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(ethersProvider);
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      updateBalance(accounts[0]);
    }
  };

  const updateBalance = async (acc) => {
    if (provider) {
      const bal = await provider.getBalance(acc);
      setBalance(ethers.utils.formatEther(bal));
    }
  };

  const connectWallet = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [zenChainConfig] });
      checkConnection();
      toast.success('تم الاتصال بالمحفظة!');
    } catch (err) {
      setError('فشل في الاتصال بالمحفظة: ' + err.message);
      toast.error('فشل في الاتصال!');
    }
  };

  const checkPhishing = async (address) => {
    try {
      const response = await axios.get(`https://api.chainalysis.com/risk/${address}`); // استبدل بـAPI حقيقي
      return response.data.risk < 0.5;
    } catch {
      return true; // افتراضي
    }
  };

  const simulateTransaction = async () => {
    if (!amount) return setError('أدخل المبلغ');
    setLoading(true);
    try {
      const response = await axios.get(`https://api.1inch.io/v5.0/1/quote?fromTokenAddress=${tokens.find(t => t.symbol === fromToken).address}&toTokenAddress=${tokens.find(t => t.symbol === toToken).address}&amount=${amount * 1e18}`);
      const data = response.data;
      setSimulation({
        priceImpact: `${(data.estimatedPriceImpact * 100).toFixed(2)}%`,
        minReceived: (data.toTokenAmount / 1e18 * (1 - slippage / 100)).toFixed(4),
        gasCost: `${data.estimatedGas / 1e9} Gwei`,
        route: data.protocols[0][0][0].name,
      });
      toast.success('تم المحاكاة بنجاح!');
    } catch (err) {
      setError('فشل في المحاكاة: ' + err.message);
      toast.error('فشل في المحاكاة!');
    }
    setLoading(false);
  };

  const executeSwap = async () => {
    if (!simulation) return;
    const isSafe = await checkPhishing(account);
    if (!isSafe) return toast.error('عنوان محفظتك مشبوه!');
    setShowConfirm(true);
  };

  const confirmSwap = async () => {
    try {
      const signer = provider.getSigner();
      const contractAddress = '0x...'; // عنوان العقد بعد النشر
      const abi = [...]; // ABI من العقد
      const contract = new ethers.Contract(contractAddress, abi, signer);
      const tx = await contract.swapTokens(ethers.utils.parseEther(amount), [tokens.find(t => t.symbol === fromToken).address, tokens.find(t => t.symbol === toToken).address], account, Date.now() + 1000 * 60 * 10);
      await tx.wait();
      toast.success('تم تنفيذ السواب بنجاح!');
      const newTx = { from: fromToken, to: toToken, amount, date: new Date().toISOString() };
      const updatedHistory = [...transactionHistory, newTx];
      setTransactionHistory(updatedHistory);
      localStorage.setItem('transactions', JSON.stringify(updatedHistory));
      updateBalance(account);
      setShowConfirm(false);
    } catch (err) {
      toast.error('فشل في التنفيذ!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">سواب العملات</h2>
      <p className="text-center mb-4">رصيدك: {balance} ETH</p>
      {!account && (
        <button onClick={connectWallet} className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
          اتصل بـMetaMask/Rabby
        </button>
      )}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-4 rounded-lg mb-4 flex items-center">
          <ExclamationTriangleIcon className="w-6 h-6 mr-2" />
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">من:</label>
          <select value={fromToken} onChange={(e) => setFromToken(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition">
            {tokens.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                <img src={token.logo} alt={token.symbol} className="inline w-6 h-6 mr-2" /> {token.symbol}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">إلى:</label>
          <select value={toToken} onChange={(e) => setToToken(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition">
            {tokens.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                <img src={token.logo} alt={token.symbol} className="inline w-6 h-6 mr-2" /> {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <input type="number" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition" />
      <input type="number" placeholder="نسبة الانزلاق (%)" value={slippage} onChange={(e) => setSlippage(e.target.value)} className="w-full p-3 mb-6 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition" />
      
      <div className="flex space-x-4 mb-6">
        <button onClick={simulateTransaction} disabled={loading} class
