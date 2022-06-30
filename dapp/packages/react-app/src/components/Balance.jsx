import React, { useState } from "react";
import { useBalance } from "eth-hooks";

const { utils } = require("ethers");

/** 
  ~ What it does? ~

  Displays a balance of given address in ether & dollar

  ~ How can I use? ~

  <Balance
    address={address}
    provider={mainnetProvider}
    price={price}
  />

  ~ If you already have the balance as a bignumber ~
  <Balance
    balance={balance}
    price={price}
  />

  ~ Features ~

  - Provide address={address} and get balance corresponding to given address
  - Provide provider={mainnetProvider} to access balance on mainnet or any other network (ex. localProvider)
  - Provide price={price} of ether and get your balance converted to dollars
**/

export default function Balance(props) {
  // const [dollarMode, setDollarMode] = useState(false);

  const balance = useBalance(props.provider, props.address);
  let floatBalance = parseFloat("0.00");
  let usingBalance = balance;

  if (typeof props.balance !== "undefined") usingBalance = props.balance;
  if (typeof props.value !== "undefined") usingBalance = props.value;

  if (usingBalance) {
    const etherBalance = utils.formatEther(usingBalance);
    parseFloat(etherBalance).toFixed(2);
    floatBalance = parseFloat(etherBalance);
  }

  let displayBalance = floatBalance.toFixed(4);

  // const price = props.price || props.dollarMultiplier || 1;
  const price = 1;

  // if (dollarMode) {
    // const dataSplit = (floatBalance * price).toFixed(2).split(".");
    // displayBalance = "$" + parseInt(dataSplit[0]).toLocaleString("en-US") + "." + dataSplit[1];
  // }

  return (
    <span
      style={{
        color: props.color,
        // "fontFamily": 'Roobert TRIAL',
        // fontStyle: "normal",
        fontWeight: 400,
        // fontSize: "12px",
        // lineHeight: "%",
        verticalAlign: "middle",
        fontSize: props.size ? props.size : 20,
        padding: 4,
        cursor: "pointer",
      }}
      onClick={() => {
        // setDollarMode(!dollarMode);
      }}
    >
      {displayBalance}
    </span>
  );
}
