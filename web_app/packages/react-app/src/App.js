import { Contract } from "@ethersproject/contracts";
import React, { useEffect, useState } from "react";

import { Body, Image, Text, Link, Col, themeOptions } from "./components";
import logo from "./Arbol_logo.png";
import useWeb3Modal from "./hooks/useWeb3Modal";
import { addresses, abis } from "@project/contracts";

import { Grid, Button, AppBar, Box, Toolbar } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';

export const theme = createTheme(themeOptions);


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
  // const { loading, error, data } = useQuery(GET_TRANSFERS);
  const [provider, loadWeb3Modal, logoutOfWeb3Modal] = useWeb3Modal();
  const [rows, setRows] = useState([]);
  const columns = [
    { field: 'id', headerName: 'Tx Hash', width: 280 },
    { field: 'from', headerName: 'Caller', width: 280 },
    // { field: 'action', headerName: 'Action', width: 120 },
    // { field: 'explorer', headerName: 'Tx Link', width: 320 },
    { field: 'timeStamp', headerName: 'Time', width: 120 },
  ];

  useEffect(() => {




    fetch("https://api-kovan.etherscan.io/api?module=account&action=txlist&address="+addresses.BlizzardDerivativeProvider+"&startblock=0&endblock=99999999&sort=asc&apikey="+process.env.REACT_APP_ETHERSCAN_KEY)
    .then(resp => resp.json())
    .then(data => {
      // console.log(data)
      dataSetter(data.result)})
  
  
  
  
    }, []);

  async function dataSetter(data) {
    var new_rows = []
    for (const row of data) {
      row["id"] = row["hash"];
      delete row["hash"];
      new_rows.push(row);
    }

    setRows(new_rows);
  }

  async function depositUSDC(_provider) {
    const defaultSigner = _provider.getSigner();
    const defaultAddress = await defaultSigner.getAddress();
    const MainContract = new Contract(addresses.BlizzardDerivativeProvider, abis.BlizzardDerivativeProvider, defaultSigner);
    const usdc = new Contract(addresses.USDC, abis.erc20, defaultSigner);

    var oracleBank = await MainContract.ORACLE_BANK();
    var collateralAddress = await MainContract.COLLATERAL_ADDRESS();
    var premiumAddress = await MainContract.PREMIUM_ADDRESS();
    var collateralAmount = await MainContract.COLLATERAL_PAYMENT();
    var premiumAmount = await MainContract.PREMIUM_PAYMENT();

    if (defaultAddress === collateralAddress) {

      var tx = await usdc.approve(addresses.BlizzardDerivativeProvider, collateralAmount);
      await tx.wait();

      tx = await MainContract.depositCollateral();
      await tx.wait();
    } else if (defaultAddress === premiumAddress) {

      tx = await usdc.approve(addresses.BlizzardDerivativeProvider, premiumAmount);
      await tx.wait();

      tx = await MainContract.depositPremium();
      await tx.wait();

      const deployedAddress = await MainContract.blizzardContract();
      console.log(deployedAddress);
    } else if (defaultAddress === oracleBank) {

      tx = await usdc.approve(addresses.BlizzardDerivativeProvider, collateralAmount + premiumAmount);
      await tx.wait();

      tx = await MainContract.depositCollateral();
      await tx.wait();
      tx = await MainContract.depositPremium();
      await tx.wait();

      const deployedAddress = await MainContract.blizzardContract();
      console.log(deployedAddress);
    }
  }

  // React.useEffect(() => {
  //   if (!loading && !error && data && data.transfers) {
  //     console.log({ transfers: data.transfers });
  //   }
  // }, [loading, error, data]);

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
                  <Text> 
                    The Arbol-dApp Portal provides an endpoint for interacting with Arbol's deployed Weather Derivative Provider smart contracts. 
                  </Text>
                  <Text>
                    The Escrow Collateral option approves the Derivative Provider smart contract to transfer the collateral cost in USDC from the caller's wallet, then executes the actual transfer. Collateral must be deposited before contract purchase.
                  </Text><Text>
                    The Purchase Contract option approves the smart contract to transfer the premium cost in USDC from the caller's wallet, then executes the actual transfer and instantiates a new Option contract.
                    Derivative Provider transaction history is logged below, refresh to see updates.
                    </Text>
                </Col>
            </Grid>
            <Grid item xs={6}>
              <Col>
                <Text> 
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
                </Button>
                <Text> 
                  Purchaser
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
                  PURCHASE CONTRACT
                </Button>
                <div style={{ height: 300, width: '100%', marginTop: "50px", marginBottom: "20px"}}>
                  <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSize={8}
                    rowsPerPageOptions={[8]}
                  />
                </div>
                <Link href={"https://kovan.etherscan.io/address/" + addresses.BlizzardDerivativeProvider + "#code#F1#L1"} style={{ marginTop: "8px" }}> etherscan </Link>
                <Link href="https://github.com/Arbol-Project/Arbol-dApp" style={{ marginTop: "8px" }}> github </Link>
              </Col>
            </Grid>
          </Grid>
          </Body>
        </ThemeProvider>
      </div>
  );
}

export default App;