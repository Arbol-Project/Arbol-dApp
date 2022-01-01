// import { useQuery } from "@apollo/react-hooks";
import { Contract } from "@ethersproject/contracts";
// import { getDefaultProvider } from "@ethersproject/providers";
import React, { useEffect, useState } from "react";

import { Body, Button, Header, Image, Link, Text, Col, Title } from "./components";
import logo from "./Arbol_logo.png";
import useWeb3Modal from "./hooks/useWeb3Modal";

import { addresses, abis } from "@project/contracts";
// import GET_TRANSFERS from "./graphql/subgraph";

async function approveTransferUSDC(provider, ammount) {
  // Should replace with the end-user wallet, e.g. Metamask
  const defaultSigner = provider.getSigner();
  // Create an instance of an ethers.js Contract
  // Read more about ethers.js on https://docs.ethers.io/v5/api/contract/contract/

  const linkToken = new Contract(addresses.LinkTokenInterface, abis.erc20, defaultSigner);

  const accounts = await provider.listAccounts();
  // var linkBalance = await linkToken.balanceOf(accounts[0]);

  // console.log("LINK Balance:", linkBalance);
  
  var tx = await linkToken.approve(addresses.CubanBlizzardDerivativeProvider, ammount);
  await tx.wait();

  var allowance = await linkToken.allowance(accounts[0], addresses.CubanBlizzardDerivativeProvider);
  console.log("Contract USDC allowance:", allowance);
}

async function depositCollateral(provider) {
  // Should replace with the end-user wallet, e.g. Metamask
  const defaultSigner = provider.getSigner();
  // Create an instance of an ethers.js Contract
  // Read more about ethers.js on https://docs.ethers.io/v5/api/contract/contract/

  const CubanMainContract = new Contract(addresses.CubanBlizzardDerivativeProvider, abis.CubanBlizzardDerivativeProvider, defaultSigner);

  var tx = await CubanMainContract.depositCollateral();
  await tx.wait();

  var balance = await CubanMainContract.getUSDCBalance();
  console.log("Contract USDC balance:", balance);
}

async function purchaseContract(provider) {
  // Should replace with the end-user wallet, e.g. Metamask
  const defaultSigner = provider.getSigner();
  // Create an instance of an ethers.js Contract
  // Read more about ethers.js on https://docs.ethers.io/v5/api/contract/contract/

  const CubanMainContract = new Contract(addresses.CubanBlizzardDerivativeProvider, abis.CubanBlizzardDerivativeProvider, defaultSigner);

  var tx = await CubanMainContract.depositPremium();
  await tx.wait();

  var balance = await CubanMainContract.getUSDCBalance();
  console.log("Contract USDC balance:", balance);
}

function WalletButton({ provider, loadWeb3Modal, logoutOfWeb3Modal }) {
  const [account, setAccount] = useState("");
  const [rendered, setRendered] = useState("");

  useEffect(() => {
    async function fetchAccount() {
      try {
        if (!provider) {
          return;
        }

        // Load the user's accounts.
        const accounts = await provider.listAccounts();
        setAccount(accounts[0]);

        console.log("account signed in:", accounts[0]);

        // disabled for testing (not on Mainnet)
        // // Resolve the ENS name for the first account.
        // const name = await provider.lookupAddress(accounts[0]);

        // Render either the ENS name or the shortened account address.
        // if (name) {
        //   setRendered(name);
        // } else {
        setRendered(account.substring(0, 6) + "..." + account.substring(36));
        // }
      } catch (err) {
        setAccount("");
        setRendered("");
        console.error(err);
      }
    }
    fetchAccount();
  }, [account, provider, setAccount, setRendered]);

  return (
    <Button
      onClick={() => {
        if (!provider) {
          loadWeb3Modal();
        } else {
          logoutOfWeb3Modal();
        }
      }}
    >
      {rendered === "" && "Connect Wallet"}
      {rendered !== "" && rendered}
    </Button>
  );
}
 
function App() {
  // const { loading, error, data } = useQuery(GET_TRANSFERS);
  const [provider, loadWeb3Modal, logoutOfWeb3Modal] = useWeb3Modal();

  // React.useEffect(() => {
  //   if (!loading && !error && data && data.transfers) {
  //     console.log({ transfers: data.transfers });
  //   }
  // }, [loading, error, data]);

  return (
    <div>
      <Header>
        <Title>
          Arbol dApp Portal
        </Title>
        <WalletButton provider={provider} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
      </Header>
      <Body>
        <Col>
        <Image src={logo} alt="react-logo" />
        {/* Remove the "hidden" prop and open the JavaScript console in the browser to see what this function does */}
        <Link href="https://kovan.etherscan.io/address/0xffB2F37940ef05168ee40113B1fccA541E957A42#code#F1#L1" style={{ marginTop: "8px" }}> etherscan </Link>
        <Link href="https://github.com/dmp267/Arbol-dApp/tree/master/web_app" style={{ marginTop: "8px" }}> github </Link>
        </Col>
        <Col>
          <Text>
          Purchaser
          </Text>
          <Button onClick={() => approveTransferUSDC(provider, 10000*10**6)}>
            APPROVE USDC TRANSFER
          </Button>
          <Button onClick={() => purchaseContract(provider)}>
            PURCHASE CONTRACT
          </Button>
        </Col>
        <Col>
          <Text>
          Provider
          </Text>
          <Button onClick={() => approveTransferUSDC(provider, 250000*10**6)}>
            APPROVE USDC TRANSFER
          </Button>
          <Button onClick={() => depositCollateral(provider)}>
            ESCROW COLLATERAL
          </Button>
        </Col>
      </Body>
    </div>
  );
}

export default App;
