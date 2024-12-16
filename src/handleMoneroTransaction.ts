import AxiosDigestAuth from "@mhoc/axios-digest-auth";
import XMR_ETH from "./contracts/MASTER.json";
import { Wallet, Contract } from "ethers";

interface RpcResponse {
  id: string;
  jsonrpc: string;
  result: any;
}

const abi = XMR_ETH.abi;

export default async function handleMoneroTransaction(
  txHash: string,
  wallet: Wallet,
) {
  const transferResponse: RpcResponse = (await get_transfer_by_id(
    txHash,
  )) as RpcResponse;
  const amount = JSON.parse(transferResponse.result)["amount"] as number;
  const major = JSON.parse(transferResponse.result)["subaddr_index"][
    "major"
  ] as number;
  const minor = JSON.parse(transferResponse.result)["subaddr_index"][
    "minor"
  ] as number;
  const subaddr_index: [number, number] = [major, minor];

  const getAddressResponse = (await get_address(subaddr_index)) as RpcResponse;
  const moneroAddress = JSON.parse(getAddressResponse.result)["addresses"][
    "address"
  ];
  const contractAddress = JSON.parse(getAddressResponse.result)["addresses"][
    "label"
  ];

  const CONTRACT = new Contract(contractAddress, abi, wallet);

  await CONTRACT.MoneroReceived(amount);
}

async function get_transfer_by_id(
  txHash: string,
): Promise<RpcResponse | Error> {
  const digestAuth = new AxiosDigestAuth({
    username: process.env.WALLET_RPC_USERNAME!,
    password: process.env.WALLET_RPC_PASSWORD!,
  });

  const body = {
    jsonrpc: "2.0",
    id: "0",
    method: "get_transfer_by_id",
    params: {
      txid: txHash,
      account_index: 1,
    },
  };

  try {
    const response = await digestAuth.request({
      headers: { Accept: "application/json" },
      method: "POST",
      url: "http://monero-wallet-rpc:18081/json_rpc",
      data: body,
    });

    const rpcResponse = response.data as RpcResponse;
    return rpcResponse;
  } catch (error) {
    return new Error("Error in get transfer rpc call");
  }
}

async function get_address(
  subaddr_index: [number, number],
): Promise<RpcResponse | Error> {
  const digestAuth = new AxiosDigestAuth({
    username: process.env.WALLET_RPC_USERNAME!,
    password: process.env.WALLET_RPC_PASSWORD!,
  });

  const body = {
    jsonrpc: "2.0",
    id: "0",
    method: "get_transfer_by_id",
    params: {
      account_index: subaddr_index[0],
      address_index: subaddr_index[1],
    },
  };

  try {
    const response = await digestAuth.request({
      headers: { Accept: "application/json" },
      method: "POST",
      url: "http://monero-wallet-rpc:18081/json_rpc",
      data: body,
    });

    const rpcResponse = response.data as RpcResponse;
    return rpcResponse;
  } catch (error) {
    return new Error("Error in get address rpc call");
  }
}
