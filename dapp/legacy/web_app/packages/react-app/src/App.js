import { Contract } from "@ethersproject/contracts";
import { getAddress } from "@ethersproject/address";
import React, { useEffect, useState } from "react";

import { Body, Image, Text, Link, Col, themeOptions } from "./components";
import logo from "./Arbol_logo.png";
import useWeb3Modal from "./hooks/useWeb3Modal";
import { addresses, abis } from "@project/contracts";

import { Grid, Button, AppBar, Box, Toolbar } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';

export const theme = createTheme(themeOptions);

const addressBook = {
  "0xa679c6154b8d4619Af9F83f0bF9a13A680e01eCf": "Purchaser",
  "0xbf417C41F3ab1e01BD6867fB540dA7b734EaeA95": "Provider",
  [addresses.BlizzardDerivativeProvider]: "Contract"
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
        'boxShadow': '0 3px 5px 2px rgba(0, 0, 0, .3)',
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

  const [provider, loadWeb3Modal, logoutOfWeb3Modal] = useWeb3Modal();

  const [internalRows, setInternalRows] = useState([]);
  const [tokenRows, setTokenRows] = useState([]);
  const [depositBlock, setDepositBlock] = useState(24000000);

  const tokenColumns = [
    { field: 'id', headerName: '#', width: 10 },

    { field: 'time', headerName: 'Time', width: 200 },
    { field: 'hash', headerName: 'Tx Hash', width: 120 },
    { field: 'from', headerName: 'Caller', width: 120 },
    { field: 'action', headerName: 'Action', width: 160 },
    { field: 'value', headerName: 'Amount', width: 120 },
  ];

  const internalColumns = [
    { field: 'id', headerName: '#', width: 10 },

    { field: 'time', headerName: 'Time', width: 200 },
    { field: 'hash', headerName: 'Tx Hash', width: 120 },
    { field: 'action', headerName: 'Action', width: 200 },
  ];

  async function tokenDataSetter(data) {
    var new_rows = []
    for (var i = 0; i < data.length; i++) {
      let row = data[i];
      if (row["tokenName"] === "USD Coin (PoS)") {
        row["value"] = row["value"].slice(0, row["value"].length-6);
        row["id"] = i;      
        var date = new Date(parseInt(row["timeStamp"]) * 1000);
        row["time"] = date.toISOString();
        if (row["value"].startsWith("25")) {
          row["action"] = "Escrow Collateral";
        } else if (row["value"].startsWith("10")) {
          row["action"] = "Deposit Premium";
          setDepositBlock(row["blockNumber"]);
        } else {
          row["action"] = "Payout Funds";
        }
        if (getAddress(row["from"]) in addressBook) {
          row["from"] = addressBook[getAddress(row["from"])];
          new_rows.push(row);
        } 
      }
    }
    setTokenRows(new_rows.reverse());
  }

  useEffect(() => {
    fetch("https://api.polygonscan.com/api?module=account&action=tokentx&address="+addresses.BlizzardDerivativeProvider+"&startblock=0&endblock=999999999&sort=asc&apikey="+process.env.REACT_APP_POLYGONSCAN_KEY)
    .then(resp => resp.json())
    .then(data => {
      console.log(data);
      tokenDataSetter(data.result)})
    }, []);

  async function internalDataSetter(data) {
    var new_rows = [];
    var deploy_hashes = [];
    for (var i = 0; i < data.length; i++) {
      const row = data[i];
      row["id"] = i;
      var date = new Date(parseInt(row["timeStamp"]) * 1000);
      row["time"] = date.toISOString();
      if (row["type"] !== "create") {
        deploy_hashes.push(row["hash"]);
      }
      if (row["type"] === "staticcall") {
        row["action"] = "Get Parameters";
      } else if (row["type"] === "call") {
        row["action"] = "Authorize Transfer";
      }
      if (getAddress(row["from"]) in addressBook) {
        row["from"] = addressBook[getAddress(row["from"])];
      }
      new_rows.push(row);
    }
    for (var j = 0; j < new_rows.length; j++) {
      const row = new_rows[j];
      if (row["type"] === "create") {
        if (parseInt(row["blockNumber"]) > parseInt(depositBlock)) {
          console.log(row["blockNumber"], depositBlock);
          row["action"] = "Deploy Contract";
        } else {
          row["action"] = "Deploy Verification Proxy";
        }
      }
    }
    setInternalRows(new_rows.reverse());
  }

  useEffect(() => {
    fetch("https://api.polygonscan.com/api?module=account&action=txlistinternal&address="+addresses.BlizzardDerivativeProvider+"&startblock=0&endblock=999999999&sort=asc&apikey="+process.env.REACT_APP_POLYGONSCAN_KEY)
    .then(resp => resp.json())
    .then(data => {
      console.log(data);
      internalDataSetter(data.result)})
    }, []);


  async function depositUSDC(_provider) {
    const defaultSigner = _provider.getSigner();
    const defaultAddress = await defaultSigner.getAddress();
    const MainContract = new Contract(addresses.BlizzardDerivativeProvider, abis.BlizzardDerivativeProvider, defaultSigner);
    const usdc = new Contract(addresses.USDC, abis.erc20, defaultSigner);

    var collateralAddress = await MainContract.COLLATERAL_ADDRESS();
    var premiumAddress = await MainContract.PREMIUM_ADDRESS();
    var collateralAmount = await MainContract.COLLATERAL_PAYMENT();
    var premiumAmount = await MainContract.PREMIUM_PAYMENT();
    var oracleOperator = await MainContract.ORACLE_BANK();

    if (defaultAddress === collateralAddress) {

      // var tx = await usdc.approve(addresses.BlizzardDerivativeProvider, collateralAmount);
      // await tx.wait();

      // tx = await MainContract.depositCollateral();
      // await tx.wait();
      var tx = await usdc.approve(addresses.BlizzardDerivativeProvider, premiumAmount);
      await tx.wait();

      tx = await MainContract.depositPremium();
      await tx.wait();

      const deployedAddress = await MainContract.blizzardContract();
      console.log(deployedAddress);
    } else if (defaultAddress === premiumAddress) {

      tx = await usdc.approve(addresses.BlizzardDerivativeProvider, premiumAmount);
      await tx.wait();

      tx = await MainContract.depositPremium();
      await tx.wait();

      const deployedAddress = await MainContract.blizzardContract();
      console.log(deployedAddress);
    } else if (defaultAddress == oracleOperator) {
      console.log("this is me");
    } else {
      // console.log(premiumAddress);
      // console.log(oracleOperator);
      // console.log(collateralAddress);
      console.log(defaultAddress);
    }
  }


  return (
      <div>
        <ThemeProvider theme={theme}>
          <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
              <Toolbar sx={{"justifyContent": "space-between", 'boxShadow': '0 3px 5px 2px rgba(0, 0, 0, .3)'}}>
                <Link href="https://www.arbolmarket.com/" style={{ textDecoration: 'none', marginTop: "8px", fontSize: "calc(12px + 2vmin)" }}> {'ARBOL-dAPP PORTAL'} </Link>
                  <WalletButton provider={provider} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
              </Toolbar>
            </AppBar>
          </Box>
          <Body>
            <Grid
              container
              direction="row"
              justifyContent="space-around"
              alignItems='stretch'
            >
              <Grid item xs={6}>
                <Col>
                  <Image src={logo} alt="react-logo" />
                      {/* <Text> 
                        Provider
                      </Text>
                      <Button 
                        variant="contained" 
                        sx={{
                          "margin": "8px 4px",
                          'background': 'linear-gradient(45deg, #EF5350 30%, #EA6A6A 90%)',
                          'border': 0,
                          'borderRadius': 3,
                          'boxShadow': '0 3px 5px 2px rgba(255, 255, 255, .3)',
                          'color': 'white',
                        }} 
                        onClick={() => depositUSDC(provider)}>
                        ESCROW COLLATERAL
                      </Button> */}
                      <Text> 
                        {/* Purchaser */}
                      </Text>
                      <Button 
                        variant="contained" 
                        sx={{
                          "margin": "8px 4px",
                          'background': 'linear-gradient(45deg, #EF5350 30%, #EA6A6A 90%)',
                          'border': 0,
                          'borderRadius': 3,
                          'boxShadow': '0 3px 5px 2px rgba(120, 120, 120, .3)',
                          'color': 'white',
                        }} 
                        onClick={() => depositUSDC(provider)}>
                        PURCHASE CONTRACT
                      </Button>
                  <Text> 
                    The Arbol-dApp Portal provides an endpoint for interacting with Arbol's Blizzard Derivative Provider smart contract deployed on Polygon Mainnet
                    and permits a pre-approved buyer to purchase a $250,000 Blizzard Protection contract at a premium of $10,000.
                  </Text>
                  <Text>
                  The contract automatically pays out to the buyer if the threshold of 3 inches of snow is met or exceeded in Dallas on any of the covered dates. 
                  The coverage period begins 15 days after contract purchase and ends on April 10, 2022. The data source for weather observations is GHCND:USW00003927 (GHCND records for Dallas Fort Worth airport weather station).
                  </Text>
                  {/* <Text>
                    The Escrow Collateral option approves the Derivative Provider smart contract to transfer the collateral cost in USDC from the caller's wallet, then executes the actual transfer. Collateral must be deposited before contract purchase.
                  </Text> */}
                  <Text>
                    The Purchase Contract button approves the smart contract to transfer the premium cost in USDC from the caller's wallet, then executes the actual transfer and deploys a new protection contract.
                    Internal transactions and token transfers associated with the Derivative Provider smart contract are updated on refresh.
                  </Text>
                </Col>
              </Grid>
            <Grid item xs={6}>
              <Col>
              {/* <View>
                <
              </View> */}
                <Text>
                    Token Transfers
                  </Text>
                <div style={{ height: 200, width: '90%', marginTop: "10px", marginBottom: "40px"}}>
                  <DataGrid
                    rows={tokenRows}
                    columns={tokenColumns}
                    pageSize={8}
                    rowsPerPageOptions={[8]}
                  />
                </div>
                  <Text>
                    Internal Transactions
                  </Text>
                <div style={{ height: 320, width: '90%', marginTop: "10px", marginBottom: "20px"}}>
                  <DataGrid
                    rows={internalRows}
                    columns={internalColumns}
                    pageSize={8}
                    rowsPerPageOptions={[8]}
                  />
                </div>
                <Link href={"https://polygonscan.com/address/" + addresses.BlizzardDerivativeProvider} style={{ marginTop: "8px" }}> polygonscan </Link>
                <Link href="https://market.link/adapters/15310064-34c6-4300-9a0b-5642a51e1613" style={{ marginTop: "8px" }}> market.link </Link>
                <Link href="https://github.com/Arbol-Project/Arbol-dApp" style={{ marginTop: "8px" }}> source </Link>
              </Col>
            </Grid>
          </Grid>
          </Body>
        </ThemeProvider>
      </div>
  );
}

export default App;