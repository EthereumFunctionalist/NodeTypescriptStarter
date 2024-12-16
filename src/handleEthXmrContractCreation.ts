import crypto from "crypto";
import AxiosDigestAuth from "@mhoc/axios-digest-auth";
import ETH_XMR from "./contracts/ETH_XMR.json";
import { Contract, Wallet } from "ethers";

interface TransferResult {
  tx_hash: string;
  tx_key: string;
  amount: number;
  fee: number;
  tx_blob?: string;
  tx_metadata?: string;
}

interface RpcResponse {
  id: string;
  jsonrpc: string;
  result: TransferResult;
}

const abi = ETH_XMR.abi;

export default async function handleEthReceived(
  contractAddress: string,
  hashedMoneroAddress: string,
  amount: number,
  wallet: Wallet,
  ethXmrRate: number,
) {
  const CONTRACT = new Contract(contractAddress, abi, wallet);

  try {
    const TxID: string = await eth2Xmr(amount, ethXmrRate, hashedMoneroAddress);

    if (TxID) {
      console.log(`Swap successful, TxID: ${TxID}`);
      await CONTRACT.SwapSuccess(TxID);
    } else {
      console.log("Swap failed, initiating refund.");
      await CONTRACT.SwapFailure();
    }
  } catch (err) {
    console.error("Error processing ETH-to-XMR swap:", err);
    await CONTRACT.SwapFailure();
  }
}

async function eth2Xmr(
  amountEth: number,
  ethXmrRate: number,
  hashedMoneroAddress: string | bigint,
) {
  const decryptedAddress = await decrypt(hashedMoneroAddress.toString());

  console.log("decrypted monero address: ", decryptedAddress);

  const rateAfterFee = ethXmrRate * 0.985;

  const amountXmr = Math.floor(amountEth * rateAfterFee * 1e12);

  const digestAuth = new AxiosDigestAuth({
    username: process.env.WALLET_RPC_USERNAME!,
    password: process.env.WALLET_RPC_PASSWORD!,
  });

  const dataBody = {
    jsonrpc: "2.0",
    id: "0",
    method: "transfer",
    params: {
      destinations: [{ address: decryptedAddress, amount: amountXmr }],
    },
  };

  try {
    const response = await digestAuth.request({
      headers: { Accept: "application/json" },
      method: "POST",
      url: "http://monero-wallet-rpc:18081/json_rpc",
      data: dataBody,
    });

    const rpcResponse = response.data as RpcResponse;
    return rpcResponse.result.tx_hash;
  } catch (err) {
    console.error("Error in Monero wallet RPC transfer:", err);
    throw new Error("Monero transfer failed.");
  }
}

async function decrypt(encryptedAddress: string) {
  const secretKey = Buffer.from(process.env.SECRET_KEY!, "utf8");
  const iv = Buffer.from(process.env.SECRET_IV!, "utf8");

  const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, iv);
  let decrypted = decipher.update(encryptedAddress, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
