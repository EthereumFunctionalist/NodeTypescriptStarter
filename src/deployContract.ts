import { Wallet, ContractFactory } from "ethers";
import * as dotenv from "dotenv";
import MASTER from "./contracts/MASTER.json";
import ETH_XMR from "./contracts/ETH_XMR.json";
import XMR_ETH from "./contracts/XMR_ETH.json";
dotenv.config();

const master_abi = MASTER.abi;
const master_bytecode = MASTER.bytecode;

const eth_xmr_abi = ETH_XMR.abi;
const eth_xmr_bytecode = ETH_XMR.bytecode;

const xmr_eth_abi = XMR_ETH.abi;
const xmr_eth_bytecode = XMR_ETH.bytecode;

const ethUsdPriceFeed = process.env.ETH_USD_MAIN_SEPOLIA!;
const xmrUsdPriceFeed = process.env.XMR_USD_OPTIMISM!;

export default async function deployContract(wallet: Wallet) {
  const eth_xmr_factory = new ContractFactory(
    eth_xmr_abi,
    eth_xmr_bytecode,
    wallet,
  );
  const eth_xmr_implementation = await eth_xmr_factory.deploy();
  await eth_xmr_implementation.waitForDeployment();

  const eth_xmr_implementation_address = eth_xmr_implementation.target;

  console.log(
    "1. ETH/XMR implementation contract deployed at",
    eth_xmr_implementation_address,
  );

  const xmr_eth_factory = new ContractFactory(
    xmr_eth_abi,
    xmr_eth_bytecode,
    wallet,
  );
  const xmr_eth_implementation = await xmr_eth_factory.deploy();
  await xmr_eth_implementation.waitForDeployment();

  const xmr_eth_implementation_address = xmr_eth_implementation.target;

  console.log(
    "2. XMR/ETH implementation contract deployed at",
    eth_xmr_implementation_address,
  );

  const main_factory = new ContractFactory(master_abi, master_bytecode, wallet);

  const master = await main_factory.deploy(
    eth_xmr_implementation_address,
    xmr_eth_implementation_address,
    ethUsdPriceFeed,
  );
  await master.waitForDeployment();

  const master_address = master.target;

  console.log("Master deployed at ", master_address);

  return [master, eth_xmr_implementation, xmr_eth_implementation];
}
