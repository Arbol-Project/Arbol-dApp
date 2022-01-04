import { Contract } from "@ethersproject/contracts";
import React, { useEffect, useState } from "react";

import { Body, Header, Image, Link, Title, Text, Col, themeOptions } from "./components";
import logo from "./Arbol_logo.png";
import useWeb3Modal from "./hooks/useWeb3Modal";
import { addresses, abis } from "@project/contracts";

import { Button } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
export const theme = createTheme(themeOptions);


const configs = {
  "0xbf417C41F3ab1e01BD6867fB540dA7b734EaeA95": {
    "type": "provider",
    "due": 250000
  },
  "0xa679c6154b8d4619Af9F83f0bF9a13A680e01eCf": {
    "type": "purchaser",
    "due": 10000
  },
  "0x69640770407A09B166AED26B778699045B304768": {
    "type": "admin",
    "due": 0
  }
}


async function depositUSDC(provider) {
  const defaultSigner = provider.getSigner();
  const defaultAddress = defaultSigner.getAddress();
  if (defaultAddress in configs) {
    var amount = configs[defaultAddress].due;
    const linkToken = new Contract(addresses.LinkTokenInterface, abis.erc20, defaultSigner);

    var tx = await linkToken.approve(addresses.CubanBlizzardDerivativeProvider, amount);
    await tx.wait();

    var allowance = await linkToken.allowance(defaultAddress, addresses.CubanBlizzardDerivativeProvider);
    console.log("Contract USDC allowance:", allowance);

    const CubanMainContract = new Contract(addresses.CubanBlizzardDerivativeProvider, abis.CubanBlizzardDerivativeProvider, defaultSigner);

    if (configs[defaultAddress].type === "provider") {
      tx = await CubanMainContract.depositCollateral();
      await tx.wait();
    } else if (configs[defaultAddress].type === "purchaser") {
      tx = await CubanMainContract.depositPremium();
      await tx.wait();
    }

    var balance = await CubanMainContract.getUSDCBalance();
    console.log("Contract USDC balance:", balance);
  } else {
    console.log('address not recognized');
  }
}








// async function approveTransferUSDC(provider, ammount) {
//   // Should replace with the end-user wallet, e.g. Metamask
//   const defaultSigner = provider.getSigner();
//   // Create an instance of an ethers.js Contract
//   // Read more about ethers.js on https://docs.ethers.io/v5/api/contract/contract/

//   const linkToken = new Contract(addresses.LinkTokenInterface, abis.erc20, defaultSigner);

//   const accounts = await provider.listAccounts();
//   // var linkBalance = await linkToken.balanceOf(accounts[0]);

//   // console.log("LINK Balance:", linkBalance);
  
//   var tx = await linkToken.approve(addresses.CubanBlizzardDerivativeProvider, ammount);
//   await tx.wait();

//   var allowance = await linkToken.allowance(accounts[0], addresses.CubanBlizzardDerivativeProvider);
//   console.log("Contract USDC allowance:", allowance);
// }

// async function depositCollateral(provider) {
//   // Should replace with the end-user wallet, e.g. Metamask
//   const defaultSigner = provider.getSigner();
//   // Create an instance of an ethers.js Contract
//   // Read more about ethers.js on https://docs.ethers.io/v5/api/contract/contract/

//   const CubanMainContract = new Contract(addresses.CubanBlizzardDerivativeProvider, abis.CubanBlizzardDerivativeProvider, defaultSigner);

//   var tx = await CubanMainContract.depositCollateral();
//   await tx.wait();

//   var balance = await CubanMainContract.getUSDCBalance();
//   console.log("Contract USDC balance:", balance);
// }

// async function purchaseContract(provider) {
//   // Should replace with the end-user wallet, e.g. Metamask
//   const defaultSigner = provider.getSigner();
//   // Create an instance of an ethers.js Contract
//   // Read more about ethers.js on https://docs.ethers.io/v5/api/contract/contract/

//   const CubanMainContract = new Contract(addresses.CubanBlizzardDerivativeProvider, abis.CubanBlizzardDerivativeProvider, defaultSigner);

//   var tx = await CubanMainContract.depositPremium();
//   await tx.wait();

//   var balance = await CubanMainContract.getUSDCBalance();
//   console.log("Contract USDC balance:", balance);
// }

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
      variant="Text"
      sx={{
        "margin": "8px 4px",
        'background': 'linear-gradient(45deg, #FFC400 30%, #FFCF33 90%)',
        'border': 0,
        'borderRadius': 3,
        'boxShadow': '0 3px 5px 2px rgba(255, 105, 135, .3)',
        'color': 'white',
      }}
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
        <ThemeProvider theme={theme}>
          <Header>
            <Title>
              ARBOL dAPP PORTAL
            </Title>
            <WalletButton provider={provider} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
          </Header>
          <Body>
          {/* <Button variant="contained"> Get Started </Button> */}
          <Col>
              <Text>
              Arbol
              </Text>
              <Button variant="contained" sx={{
    "margin": "8px 4px",
    'background': 'linear-gradient(45deg, #EF5350 30%, #EA6A6A 90%)',
    'border': 0,
    'borderRadius': 3,
    'boxShadow': '0 3px 5px 2px rgba(255, 105, 135, .3)',
    'color': 'white',
  }} onClick={() => depositUSDC(provider, 10000*10**6)}>
                ESCROW COLLATERAL
              </Button>
            </Col>
            <Col>
            <Image src={logo} alt="react-logo" />
            <Link href="https://kovan.etherscan.io/address/0xffB2F37940ef05168ee40113B1fccA541E957A42#code#F1#L1" style={{ marginTop: "8px" }}> etherscan </Link>
            <Link href="https://github.com/Arbol-Project/Arbol-dApp" style={{ marginTop: "8px" }}> github </Link>
            </Col>
            <Col>
              <Text>
              Mr. Cuban
              </Text>
              <Button variant="contained" sx={{
    "margin": "8px 4px",
    'background': 'linear-gradient(45deg, #EF5350 30%, #EA6A6A 90%)',
    'border': 0,
    'borderRadius': 3,
    'boxShadow': '0 3px 5px 2px rgba(255, 105, 135, .3)',
    'color': 'white',
  }} onClick={() => depositUSDC(provider, 10000*10**6)}>
                PURCHASE CONTRACT
              {/* </Button>
              <Button variant="contained" sx={{
    "margin": "8px 4px",
    'background': 'linear-gradient(45deg, #EF5350 30%, #EA6A6A 90%)',
    'border': 0,
    'borderRadius': 3,
    'boxShadow': '0 3px 5px 2px rgba(255, 105, 135, .3)',
    'color': 'white',
  }} onClick={() => purchaseContract(provider)}>
                PURCHASE CONTRACT
              </Button>
            </Col>
            <Col>
              <Text>
              Provider
              </Text>
              <Button variant="contained" sx={{
    "margin": "8px 4px",
    'background': 'linear-gradient(45deg, #EF5350 30%, #EA6A6A 90%)',
    'border': 0,
    'borderRadius': 3,
    'boxShadow': '0 3px 5px 2px rgba(255, 105, 135, .3)',
    'color': 'white',
  }} onClick={() => approveTransferUSDC(provider, 250000*10**6)}>
                APPROVE USDC TRANSFER
              </Button>
              <Button variant="contained" sx={{
    "margin": "8px 4px",
    'background': 'linear-gradient(45deg, #EF5350 30%, #EA6A6A 90%)',
    'border': 0,
    'borderRadius': 3,
    'boxShadow': '0 3px 5px 2px rgba(255, 105, 135, .3)',
    'color': 'white',
  }} onClick={() => depositCollateral(provider)}>
                ESCROW COLLATERAL */}
              </Button>
            </Col>
          </Body>
        </ThemeProvider>
      </div>
  );
}

export default App;
