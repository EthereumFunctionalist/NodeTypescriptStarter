import crypto from "crypto";
import AxiosDigestAuth from "@mhoc/axios-digest-auth";
import XMR_ETH from "./contracts/XMR_ETH.json";
import { Contract, Wallet } from "ethers";

interface CreateAddressResult {
  address: string;
  address_index: number;
}

interface RpcResponse {
  id: string;
  jsonrpc: string;
  result: CreateAddressResult;
}

const abi = XMR_ETH.abi;

export default async function handleXmrEthContractCreation(
  contractAddress: string,
  ethereumAddress: string,
  wallet: Wallet,
) {
  const CONTRACT = new Contract(contractAddress, abi, wallet);

  try {
    const generateAddressResponse = (await generateAddress(
      contractAddress,
    )) as RpcResponse;
    const moneroAddress = generateAddressResponse.result["address"];

    const hashedMoneroAddress = encrypt(moneroAddress);

    if (moneroAddress != "error") {
      await CONTRACT.AddressGenerationSuccesss(hashedMoneroAddress);
    }
  } catch (error) {
    console.log("Error generating monero deposit address");
    await CONTRACT.AddressGenerationFailure();
  }
}

async function generateAddress(
  contractAddress: string,
): Promise<RpcResponse | Error> {
  const digestAuth = new AxiosDigestAuth({
    username: process.env.WALLET_RPC_USERNAME!,
    password: process.env.WALLET_RPC_PASSWORD!,
  });

  const body = {
    jsonrpc: "2.0",
    id: "0",
    method: "create_address",
    params: {
      account_index: 1,
      label: contractAddress,
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
    console.log("Error in monero wallet rpc call for create address: ", error);
  }

  return new Error("Error in generate address rpc call");
}

function encrypt(moneroAddress: string): string {
  const secretKey = Buffer.from(process.env.SECRET_KEY!, "utf8");
  const iv = Buffer.from(process.env.SECRET_IV!, "utf8");

  console.log(secretKey, " ", iv);
  const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);
  let encrypted = cipher.update(moneroAddress, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}
