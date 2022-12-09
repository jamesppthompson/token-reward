import Web3 from "web3";
import axios from "axios";

import { CONTRACT_ABI, CONTRACT_ADDRESS, NETWORK_URL } from "./constants";
const contractAddress: string = CONTRACT_ADDRESS;
const contractABI: any = CONTRACT_ABI;
const netUrl: string = NETWORK_URL;

var web3: any;
var contractInstance: any;
var account: string;

export default class ConnectWeb3 {
  constructor() {
    this.init();
    //window.ethereum.enable();
    contractInstance = new web3.eth.Contract(contractABI, contractAddress);
  }

  async init() {
    if (typeof window !== undefined && typeof web3 !== undefined) {
      web3 = new Web3(Web3.givenProvider);
    } else {
      web3 = new Web3(new Web3.providers.HttpProvider(netUrl));
    }
    var accounts = await web3.eth.getAccounts(); // must be await. if not, error
    account = accounts[0];
  }

  async sendMessage(message: string) {
    return await contractInstance.methods
      .update(message)
      .send({ from: account });
  }

  async receiveMessage() {
    return await contractInstance.methods.message().call();
  }

  async getTransaction(
    filterStartDate: string,
    filterEndDate: string,
    totalRewardAmount: number
  ) {
    let url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${contractAddress}&offset=1000`; //&apikey=TUBWTQ92D9DGGX8KQ7SVSR81JQSCWEPRZ4  &address=0x104043ac344eec5f4a6e81ac6b6a77d0e3f7110e
    let ind = 1;
    let addressesMap = new Map();
    const startDate = new Date(filterStartDate);
    const minTimestamp = startDate.setMonth(startDate.getMonth()) / 1000;

    const endDate = new Date(filterEndDate);
    const maxTimestamp = endDate.setMonth(endDate.getMonth()) / 1000;

    console.log("start timezone:", minTimestamp, "end timezone:", maxTimestamp);

    var BN = web3.utils.BN;
    while (1) {
      let res = await axios.get(url + "&page=" + ind);
      let arrayTx = res.data.result;
      if (!arrayTx.length) break;
      if (typeof arrayTx !== "object") {
        continue;
      }

      ind++;
      for (let i = arrayTx.length - 1; i >= 0; i--) {
        let timeStamp = parseInt(arrayTx[i].timeStamp);
        const fromAddress = arrayTx[i].from,
          toAddress = arrayTx[i].to;
        const value = arrayTx[i].value;
        const toInfo = addressesMap.get(toAddress);
        const fromInfo = addressesMap.get(fromAddress);

        if (fromInfo) {
          ////////// check address already registered/
          if (timeStamp >= minTimestamp && timeStamp <= maxTimestamp) {
            addressesMap.set(fromAddress, {
              curBalance: fromInfo.curBalance,
              changeBalance: fromInfo.changeBalance.add(BN(value)),
              endingChangeBalance: fromInfo.endingChangeBalance,
            });
          } else if (timeStamp > maxTimestamp) {
            addressesMap.set(fromAddress, {
              curBalance: fromInfo.curBalance,
              changeBalance: fromInfo.changeBalance,
              endingChangeBalance: fromInfo.endingChangeBalance.add(BN(value)),
            });
          }
        } else {
          let fromBalance = BN(
            await contractInstance.methods.balanceOf(fromAddress).call()
          );

          let fromChangeBalance = BN("0");
          if (timeStamp >= minTimestamp && timeStamp <= maxTimestamp) {
            fromChangeBalance = fromChangeBalance.add(BN(value));
            addressesMap.set(fromAddress, {
              curBalance: fromBalance,
              changeBalance: fromChangeBalance,
              endingChangeBalance: BN("0"),
            });
          } else if (timeStamp > maxTimestamp) {
            fromChangeBalance = fromChangeBalance.add(BN(value));
            addressesMap.set(fromAddress, {
              curBalance: fromBalance,
              changeBalance: BN("0"),
              endingChangeBalance: fromChangeBalance,
            });
          } else {
            addressesMap.set(fromAddress, {
              curBalance: fromBalance,
              changeBalance: BN("0"),
              endingChangeBalance: BN("0"),
            });
          }
        }
        if (toInfo) {
          if (timeStamp >= minTimestamp && timeStamp <= maxTimestamp)
            addressesMap.set(toAddress, {
              curBalance: toInfo.curBalance,
              changeBalance: toInfo.changeBalance.sub(BN(value)),
              endingChangeBalance: toInfo.endingChangeBalance,
            });
          if (timeStamp > maxTimestamp) {
            addressesMap.set(toAddress, {
              curBalance: toInfo.curBalance,
              changeBalance: toInfo.changeBalance,
              endingChangeBalance: toInfo.endingChangeBalance.sub(BN(value)),
            });
          }
        } else {
          let toBalance = BN(
            await contractInstance.methods.balanceOf(toAddress).call()
          );

          let toChangeBalance = BN("0");
          if (timeStamp >= minTimestamp && timeStamp <= maxTimestamp) {
            toChangeBalance = toChangeBalance.sub(BN(value));
            addressesMap.set(toAddress, {
              curBalance: toBalance,
              changeBalance: toChangeBalance,
              endingChangeBalance: BN("0"),
            });
          } else if (timeStamp > maxTimestamp) {
            toChangeBalance = toChangeBalance.sub(BN(value));
            addressesMap.set(toAddress, {
              curBalance: toBalance,
              changeBalance: BN("0"),
              endingChangeBalance: toChangeBalance,
            });
          } else {
            addressesMap.set(toAddress, {
              curBalance: toBalance,
              changeBalance: BN("0"),
              endingChangeBalance: BN("0"),
            });
          }
        }
      }
      // break;
    }

    console.log("total holder count:", addressesMap.size);
    console.log(addressesMap);
    ///?????????????
    addressesMap.forEach((value, key) => {
      if (value.curBalance.cmp(BN("0")) === 0) addressesMap.delete(key);
    });
    console.log("0 balance excluded holder count:", addressesMap.size);
    /*  Exclude from calc
      0x5abeb92120c511d68c579028c4550afdf83bc110 - Future Rewards
      0xf8246e5650ca07589ac112791308ef0802a28422 - Future LP  
      0xea9e35945e72ff9025433564ae2a6831560df52b - Marketing  
      0xf57819095efbb3f79a3ab7b2740ee4fe9b0b8d1e - Uniswap Contract
    */
    addressesMap.delete("0x5abeb92120c511d68c579028c4550afdf83bc110");
    addressesMap.delete("0xf8246e5650ca07589ac112791308ef0802a28422");
    addressesMap.delete("0xea9e35945e72ff9025433564ae2a6831560df52b");
    addressesMap.delete("0xf57819095efbb3f79a3ab7b2740ee4fe9b0b8d1e");
    addressesMap.delete("0x000000000000000000000000000000000000dead");
    /* Exclude address that have less token more than last month
      Eliminate address that one's token balance is reduced in a month
    */ console.log(
      "Exclude Future Rewards, Future LP, Marketing ,Uniswap Contract :",
      addressesMap.size
    );
    addressesMap.forEach((value, key) => {
      if (
        value.changeBalance.cmp(BN("0")) > 0 ||
        value.curBalance.add(value.endingChangeBalance).cmp(BN("0")) < 0
      )
        addressesMap.delete(key);
    });
    console.log(
      "Exclude address that have less token more than last month:",
      addressesMap.size
    );
    console.log(addressesMap);

    let totalBalance: any = BN("0");
    let arrayinfo: Array<any> = [];
    addressesMap.forEach((value, key) => {
      totalBalance = totalBalance.add(
        value.curBalance.add(value.endingChangeBalance)
      );
    });
    console.log(totalBalance);
    addressesMap.forEach((value, key) => {
      const endBalance = value.curBalance.add(value.endingChangeBalance);
      const percent =
        BN("10000000").mul(endBalance).div(totalBalance).toNumber() / 100000;
      const startBalance = value.curBalance
        .add(value.changeBalance.add(value.endingChangeBalance))
        .toString();
      arrayinfo.push({
        address: key,
        startBalance: startBalance.charAt(0) === "-" ? "0" : startBalance,
        endBalance: endBalance.toString(),
        percentage: percent,
        rewardAmount: (totalRewardAmount * percent) / 100,
      });
    });

    return arrayinfo;
  }
}
