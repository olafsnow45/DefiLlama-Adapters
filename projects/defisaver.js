const env = require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const infuraURL = `https://mainnet.infura.io/v3/${env.parsed.INFURA_KEY}`;
const web3 = new Web3(new Web3.providers.HttpProvider(infuraURL));
const defisaverABIs = require('./config/defisaver/abis');
const utils = require('./helper/utils');
const Multicall = require('@makerdao/multicall');

// Configs
const coins = {
  'ETH' : 18,
  'WETH' : 18,
  'cETH' : 8,
  'DAI' : 18,
  'cDAI' : 8,
  'iDAI' : 18,
  'MKR' : 18,
  'BAT' : 18,
  'cBAT' : 8,
  'ZRX' : 18,
  'KNC' : 18,
  'cZRX' : 8,
  'REP' : 18,
  'REPv2' : 18,
  'cREP' : 8,
  'USDC' : 6,
  'cUSDC' : 8,
  'WBTC' : 8,
  'cWBTC' : 8,
  'DGD' : 9,
  'USDT' : 6,
  'cUSDT' : 8,
  'SAI' : 18,
  'COMP' : 18,
  'aETH' : 18,
  'aDAI' : 18,
  'aUSDC' : 18,
  'aSUSD' : 18,
  'SUSD' : 18,
  'aTUSD' : 18,
  'TUSD' : 18,
  'aUSDT' : 18,
  'aBUSD' : 18,
  'BUSD' : 18,
  'aBAT' : 18,
  'aKNC' : 18,
  'aLEND' : 18,
  'LEND' : 18,
  'aLINK' : 18,
  'LINK' : 18,
  'aMANA' : 18,
  'MANA' : 18,
  'aMKR' : 18,
  'aREP' : 18,
  'aSNX' : 18,
  'SNX' : 18,
  'aWBTC' : 18,
  'aZRX' : 18,
  'aENJ' : 18,
  'ENJ' : 18,
  'aREN' : 18,
  'REN' : 18,
  'CRV' : 18,
  'YFI' : 18,
  'aYFI' : 18,
  'PAXUSD' : 18,
  'DPI' : 18,
  'UNI' : 18,
  'cUNI' : 8,
  'LRC' : 18,
  'cCOMP' : 8,
  'aUNI' : 18,
  'AAVE' : 18,
  'aAave' : 18,
  'BAL' : 18,
  'GUSD' : 2,
};

const keys = [
  {
    'ETH': 'ethereum',
    'WETH': 'ethereum',
    'cETH': 'ethereum',
    'DAI': 'dai',
    'cDAI': 'cdai',
    'iDAI': 'dai',
    'MKR': 'maker',
    'BAT': 'basic-attention-token',
    'cBAT': 'compound-basic-attention-token',
    'ZRX': '0x',
    'cZRX': 'compound-0x',
    'KNC': 'kyber-network',
    'REP': 'augur',
    'REPv2': 'augur',
    'cREP': 'compound-augur',
    'USDC': 'usd-coin',
    'cUSDC': 'compound-usd-coin',
    'WBTC': 'wrapped-bitcoin',
    'cWBTC': 'compound-wrapped-btc',
    'DGD': 'digixdao',
    'USDT': 'tether',
    'cUSDT': 'compound-usdt',
    'SAI': 'sai',
    'COMP': 'compound-coin',
    'aETH': 'aave-eth',
    'aDAI': 'aave-dai',
    'aUSDC': 'aave-usdc',
    'aSUSD': 'aave-susd',
    'SUSD': 'nusd',
    'aTUSD': 'aave-tusd',
    'TUSD': 'true-usd',
    'aUSDT': 'aave-usdt',
    'aBUSD': 'aave-busd',
    'BUSD': 'binance-usd',
    'aBAT': 'aave-bat',
    'aKNC': 'aave-k',
    'aLEND': 'aave-lend',
    'LEND': 'ethlend',
    'aLINK': 'aave-link',
    'LINK': 'chainlink',
    'aMANA': 'aave-mana',
    'MANA': 'decentraland',
    'aMKR': 'aave-mkr',
    'aREP': 'aave-rep',
    'aSNX': 'aave-snx',
    'SNX': 'havven',
    'aWBTC': 'aave-wbtc',
    'aZRX': 'aave-zrx',
    'aENJ': 'aave-enj',
    'ENJ': 'enjincoin',
    'aREN': 'aave-ren',
    'REN': 'renbtc',
    'CRV': 'curve-dao-token',
    'YFI': 'yearn-finance',
    'aYFI': 'ayfi',
    'PAXUSD': 'paxos-standard',
    'DPI': 'defipulse-index',
    'UNI': 'uniswap',
    'cUNI': 'compound-uniswap',
    'LRC': 'loopring',
    'cCOMP': 'ccomp',
    'aUNI': 'uniswap',
    'AAVE': 'aave',
    'aAave': 'aave',
    'BAL': 'balancer',
    'GUSD': 'gemini-dollar',
  }
];

// Utils
const aggregate = (calls) => Multicall.aggregate(
  calls, { multicallAddress: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441', rpcUrl: infuraURL, }
);

const bytesToString = (hex) => Buffer.from(hex.replace(/^0x/, ''), 'hex')
  .toString()
  .replace(/\x00/g, '');

const ilkToAsset = ilk => (ilk.substr(0, 2) === '0x' ? bytesToString(ilk) : ilk).replace(/-.*/, '');

const assetAmountInEth = (amount, asset = 'ETH') => {
  let decimals;
  if (asset.substr(0, 4) === 'MCD-') decimals = 18;
  else if (asset === 'USD') decimals = 18;
  else decimals = coins[asset];
  return new BigNumber(amount && amount.toString() || 0).div(10 ** decimals).toString();
};

const initContracts = (web3) => {
  const network = 1;
  const getContract = (_contract) => ({
    abi: _contract.abi,
    address:  _contract.networks[network].address,
  });

  const {
    AaveSubscriptions, AaveLoanInfo, CompoundSubscriptions,
    CompoundLoanInfo, McdSubscriptions, MCDSaverProxy,
  } = defisaverABIs;

  const aaveSubs = getContract(AaveSubscriptions);
  const aaveLoans = getContract(AaveLoanInfo);
  const compoundSubs = getContract(CompoundSubscriptions);
  const compoundLoans = getContract(CompoundLoanInfo);
  const mcdSubs = getContract(McdSubscriptions);
  const mcdSaverProxy = getContract(MCDSaverProxy);
  return {
    aaveSubscriptions: new web3.eth.Contract(aaveSubs.abi, aaveSubs.address),
    aaveLoanInfo: new web3.eth.Contract(aaveLoans.abi, aaveLoans.address),
    compoundSubscriptions: new web3.eth.Contract(compoundSubs.abi, compoundSubs.address),
    compoundLoanInfo: new web3.eth.Contract(compoundLoans.abi, compoundLoans.address),
    mcdSubscriptions: new web3.eth.Contract(mcdSubs.abi, mcdSubs.address),
    mcdSaverProxy: new web3.eth.Contract(mcdSaverProxy.abi, mcdSaverProxy.address),
  };
};

// Volume data getters
const getMakerData = async (contracts, prices) => {
  let makerSubs = await contracts.mcdSubscriptions.methods.getSubscribers().call();
  const calls = [];
  for (const cdp of makerSubs) {
    calls.push({
      target: contracts.mcdSaverProxy.options.address,
      call: ['getCdpDetailedInfo(uint256)(uint256,uint256,uint256,bytes32)', cdp.cdpId],
      returns: [
        [`cdp-${cdp.cdpId}-collateral`],
        [`cdp-${cdp.cdpId}-debt`],
        [`cdp-${cdp.cdpId}-price`],
        [`cdp-${cdp.cdpId}-ilk`],
      ],
    });
  }
  const cdpsDetailed = await aggregate(calls);
  let data = [];
  makerSubs.forEach((cdp, i) => {
    const asset = ilkToAsset(cdpsDetailed.results.original[`cdp-${cdp.cdpId}-ilk`]);
    const debt = assetAmountInEth(cdpsDetailed.results.original[`cdp-${cdp.cdpId}-debt`], 'DAI');
    const collateral = assetAmountInEth(cdpsDetailed.results.original[`cdp-${cdp.cdpId}-collateral`], `MCD-${asset}`);
    data = [...data, { debt, collateralUsd: parseFloat(collateral) * parseFloat(prices[keys[0][asset]].usd) }];
  });
  const activeSubs = data.filter(({ debt }) => parseFloat(debt));

  return Math.floor(activeSubs.reduce((sum, cdp) => sum + parseFloat(cdp.collateralUsd), 0));
};

const getCompoundData = async (contracts) => {
  let compoundSubs = await contracts.compoundSubscriptions.methods.getSubscribers().call();
  let subData = await contracts.compoundLoanInfo.methods.getLoanDataArr(compoundSubs.map(s => s.user)).call();
  const activeSubs = subData.map((sub) => {
    let sumBorrowUsd = 0;
    let sumCollUsd = 0;

    sub.borrowAmounts.forEach((amount, i) => {
      if (sub.borrowAddr[i] === '0x0000000000000000000000000000000000000000') return;
      const borrowUsd = assetAmountInEth(amount);
      sumBorrowUsd += parseFloat(borrowUsd);
    });

    sub.collAmounts.forEach((amount, i) => {
      if (sub.collAddr[i] === '0x0000000000000000000000000000000000000000') return;
      const collUsd = assetAmountInEth(amount);
      sumCollUsd += parseFloat(collUsd);
    });

    return { sumBorrowUsd, sumCollUsd };
  }).filter(({ sumBorrowUsd }) => sumBorrowUsd);

  return Math.floor(activeSubs.reduce((sum, sub) => sum + parseFloat(sub.sumCollUsd), 0));
};

const getAaveData = async (contracts, prices) => {
  let aaveSubs = await contracts.aaveSubscriptions.methods.getSubscribers().call();
  let subData = await contracts.aaveLoanInfo.methods.getLoanDataArr(aaveSubs.map(s => s.user)).call();
  const activeSubs = subData.map((sub) => {
    let sumBorrowUsd = 0;
    let sumCollUsd = 0;

    sub.borrowAmounts.forEach((amount, i) => {
      if (sub.borrowAddr[i] === '0x0000000000000000000000000000000000000000') return;
      const borrowUsd = assetAmountInEth(amount) * prices.ethereum.usd;
      sumBorrowUsd += borrowUsd;
    });

    sub.collAmounts.forEach((amount, i) => {
      if (sub.collAddr[i] === '0x0000000000000000000000000000000000000000') return;
      const collUsd = assetAmountInEth(amount) * prices.ethereum.usd;
      sumCollUsd += collUsd;
    });

    return { sumBorrowUsd, sumCollUsd };
  }).filter(({ sumBorrowUsd }) => sumBorrowUsd);

  return Math.floor(activeSubs.reduce((sum, sub) => sum + parseFloat(sub.sumCollUsd), 0));
};

async function fetch() {
  const prices = (await utils.getPrices(keys)).data;
  const contracts = initContracts(web3);

  const makerColl = await getMakerData(contracts, prices);
  const compoundColl = await getCompoundData(contracts, prices);
  const aaveColl = await getAaveData(contracts, prices);

  return makerColl + compoundColl + aaveColl;
}

module.exports = {
  fetch
};
