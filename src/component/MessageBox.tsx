import React, { useEffect, useState } from "react";
import { JsxEmit } from "typescript";
import ConnectWeb3 from "../web3/web3";

const connect = new ConnectWeb3();

function MessageBox() {
  const [startDate, setStartDate] = useState("");
  const [totalReward, setTotalReward] = useState("");
  const [endDate, setEndDate] = useState("");
  const [addressInfo, setAddressInfo] = useState<any>([]);
  const [isComplete, setComplete] = useState(false);
  const [isStarted, setStart] = useState(false);

  const getAddress = async () => {
    if (isStarted) return;
    setStart(true);
    setComplete(false);
    const arrayinfo: Array<any> = await connect.getTransaction(
      startDate,
      endDate,
      Number(totalReward)
    );

    setAddressInfo(arrayinfo);
    // setTotalToken(totalBalance);
    setComplete(true);
    setStart(false);
  };
  return (
    <div className="App">
      <header className="App-header">
        <br />
        Start Date:
        <input
          className="dateClass"
          type="date"
          onChange={(e) => {
            setStartDate(e.target.value);
          }}
          defaultValue={startDate}
        ></input>
        End Date:
        <input
          className="dateClass"
          type="date"
          onChange={(e) => {
            setEndDate(e.target.value);
          }}
          defaultValue={endDate}
        ></input>
        Total Reward Amount:
        <input
          className="dateClass"
          type="text"
          onChange={(e) => {
            setTotalReward(e.target.value);
          }}
          defaultValue={totalReward}
        ></input>
        <button onClick={getAddress}>click Me</button>
        {!isStarted ? (
          <h4>Please click button</h4>
        ) : !isComplete ? (
          <h4>Loading...</h4>
        ) : (
          ""
        )}
        <h2> Address , Reward Amount</h2>
        {isComplete &&
          addressInfo.map((value: any, id: number) => (
            <p>
              {value?.address}
              {","}
              {value?.rewardAmount.toFixed(4)}
            </p>
          ))}
      </header>
    </div>
  );
}

export default MessageBox;
