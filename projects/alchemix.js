const web3 = require('./config/web3.js');

const BigNumber = require("bignumber.js");

const abis = require("./config/abis.js");
const { getTokenPriceCoinGecko } = require("./config/bella/utilities.js");

let coins = [
  "0x6b175474e89094c44da98b954eedeac495271d0f", //DAI
  "0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9", //alUSD
  "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF", //ALCX
  "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8", //Sushiswap ALCX-WETH LP Token
  "0x19D3364A399d251E894aC732651be8B0E4e85001",//yvDAI
];

let daiHolders = [
  "0xaB7A49B971AFdc7Ee26255038C82b4006D122086", //Transmuter
  "0xc21D353FF4ee73C572425697f4F5aaD2109fe35b", //Alchemist
  "0xf3cFfaEEa177Db444b68FB6f033d4a82f6D8C82d"//TransmuterB
];

let yvDaiHolders = [
  "0x491EAFC47D019B44e13Ef7cC649bbA51E15C61d7"//YearnVaultAdapterWithIndirection
]

async function weiToFloat(wei) {
  wei = await new BigNumber(wei).div(10 ** 18).toFixed(2);
  return parseFloat(wei);
}

async function getPricePerShareInFloat(contract) {
  let pricePerShare = await contract.methods.pricePerShare().call();
  pricePerShare = await weiToFloat(pricePerShare)
  return pricePerShare;
}

async function getBalInFloat(contract, user) {
  let balances = await contract.methods.balanceOf(user).call();
  balances = await weiToFloat(balances);
  return balances;
}

async function getTotalSupplyFloat(contract) {
  let supply = await contract.methods.totalSupply().call();
  supply = await weiToFloat(supply);
  return supply;
}

async function fetch() {
  const stakingPool = "0xAB8e74017a8Cc7c15FFcCd726603790d26d7DeCa";

  const daicontract = new web3.eth.Contract(abis.abis.minABI, coins[0]);
  const alusdcontract = new web3.eth.Contract(abis.abis.minABI, coins[1]);
  const alcxcontract = new web3.eth.Contract(abis.abis.minABI, coins[2]);
  const alcxlpcontract = new web3.eth.Contract(abis.abis.minABI, coins[3]);
  const yvDAIContract = new web3.eth.Contract(abis.abis.minYvV2, coins[4]);

  let pricePerShare = await getPricePerShareInFloat(yvDAIContract);

  let tvl = 0;

  // Get DAI TVL
  //Get total DAI TVL from transmuter and alchemist contracts
  for (let i = 0; i < daiHolders.length; i++) {
    let daibal = await getBalInFloat(daicontract, daiHolders[i]);
    tvl += daibal;
  }
  //Get total DAI TVL from yvDAI holders
  for (let i = 0; i < yvDaiHolders.length; i++) {
    let ydaibal = await getBalInFloat(yvDAIContract, yvDaiHolders[i]);
    tvl += ydaibal * pricePerShare;
  }

  //Get total amount of ALCX staked in staking pool
  const stakedALCX = await getBalInFloat(alcxcontract, stakingPool);
  //Convert ALCX to USD Via coingecko
  const baseTokenPriceInUsd = await getTokenPriceCoinGecko("usd")("alchemix");
  tvl += stakedALCX * baseTokenPriceInUsd;

  //Get total amount of SLP staked in staking contract
  const stakedLP = await getBalInFloat(alcxlpcontract, stakingPool);
  //Get amount of ALCX in lp shares
  const totalLP = await getTotalSupplyFloat(alcxlpcontract);
  let shareOfTotalStaked = totalLP / stakedLP; //Gets ratio of total staked
  //Get total ALCX in lp token
  const totalALCXinLP = await getBalInFloat(alcxcontract, coins[3]);
  let totalALCXShareInLP = shareOfTotalStaked * totalALCXinLP;
  //Get approx tvl from lp staking by doubling the alcx * usd price
  tvl += totalALCXShareInLP * 2 * baseTokenPriceInUsd;

  //Get alusd supply,multiply it by 2 to get total dai deposited to mint alusd
  const totalALUSDSupply = await getTotalSupplyFloat(alusdcontract);
  tvl += totalALUSDSupply * 2;


  return tvl;
}

module.exports = {
  fetch,
};
