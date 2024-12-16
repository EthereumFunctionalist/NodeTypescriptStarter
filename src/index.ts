import deployContract from "./deployContract";
import handleEthXmrContractCreation from "./handleEthXmrContractCreation";
import handleXmrEthContractCreation from "./handleXmrEthContractCreation";
import handleMoneroTransaction from "./handleMoneroTransaction";
import { WebSocketProvider, Wallet } from "ethers";
import * as dotenv from "dotenv";
import express, { Request, Response } from "express";
dotenv.config();

async function main() {
  console.log("Defining rest api listener...");
  const listener = express();
  listener.use(express.json());
  console.log(
    "Rest listener defined, proceeding to connect to ethereum blockchain.",
  );

  console.log(process.env.INFURA_MAIN_SEPOLIA_WS);
  const provider = new WebSocketProvider(process.env.INFURA_MAIN_SEPOLIA_WS!);

  console.log("deploying wallet");
  const wallet = new Wallet(process.env.PRIVATE_KEY_SEPOLIA!, provider);

  console.log("deploying contracts...");
  const contracts = await deployContract(wallet);

  console.log("contracts deployed succesfully");

  contracts[0].on(
    "EthXmrContractCreation",
    async (
      depositAddress: string,
      amount: number,
      ethXmrRate: number,
      hashedMoneroAddress: string,
    ) => {
      console.log(
        `msg: Eth Received | depositAddress: ${depositAddress} | amount ${amount} | ethXmrRate ${ethXmrRate} | hashedMoneroAddress ${hashedMoneroAddress}`,
      );
      await handleEthXmrContractCreation(
        depositAddress,
        hashedMoneroAddress,
        amount,
        wallet,
        ethXmrRate,
      );
    },
  );

  contracts[0].on(
    "XmrEthContractCreation",
    async (contractAddress: string, ethereumAddress: string) => {
      console.log(
        `msg: Monero Address Requested | ethereumAddress ${ethereumAddress} | subcontractAddress ${contractAddress}`,
      );
      await handleXmrEthContractCreation(
        contractAddress,
        ethereumAddress,
        wallet,
      );
    },
  );

  listener.post("/monero-notification", async (req: Request, res: Response) => {
    try {
      const txHash = req.body.tx_hash;
      console.log("Received Monero Transaction:", txHash);
      res.status(200).send("Ok");
      await handleMoneroTransaction(txHash, wallet);
    } catch (error) {
      console.error("Error processing notification from monero daemon", error);
      res.status(500).send("Error processing notification");
    }
  });

  const port = 4000;
  listener.listen(port, () => {
    console.log(`Monero payment listener listening on port ${port}`);
  });

  provider.on("close", () => {
    console.log("WebSocket connection closed.");
  });

  provider.on("error", (error) => {
    console.log("error: ", error);
  });

  console.log("websocket listeners on...");
}

main().catch((error) => {
  console.error("Error in main function:", error);
});
