import { Contract } from "@ethersproject/contracts";
import React, { useEffect, useState } from "react";

import { Body, Image, Text, Link, Title, Col, themeOptions } from "./components";
import logo from "./Arbol_logo.png";
import useWeb3Modal from "./hooks/useWeb3Modal";
import { addresses, abis } from "@project/contracts";

import { Grid, Paper, Button, AppBar, Box, Toolbar } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';

export const theme = createTheme(themeOptions);

const configs = {
  "0xbf417C41F3ab1e01BD6867fB540dA7b734EaeA95": {
    "type": "provider",
    "due": 250000, 
  },
  "0xa679c6154b8d4619Af9F83f0bF9a13A680e01eCf": {
    "type": "purchaser",
    "due": 10000,
  },
  "0x69640770407A09B166AED26B778699045B304768": {
    "type": "admin",
    "due": 10000000000000,
  }
}


async function depositUSDC(provider, rows, setRows) {
  const defaultSigner = provider.getSigner();
  const defaultAddress = await defaultSigner.getAddress();
  console.log(defaultAddress);
  if (defaultAddress in configs) {
    var transactions = [];

    var amount = configs[defaultAddress].due;
    const usdc = new Contract(addresses.USDC, abis.erc20, defaultSigner);

    var tx = await usdc.approve(addresses.CubanBlizzardDerivativeProvider, amount);
    await tx.wait();
    transactions.push([{"time": Date.now() / 1000, "action": "Approve USDC spender", "tx_hash": tx}]);

    var allowance = await usdc.allowance(defaultAddress, addresses.CubanBlizzardDerivativeProvider);
    console.log("Contract USDC allowance:", allowance);

    const CubanMainContract = new Contract(addresses.CubanBlizzardDerivativeProvider, abis.CubanBlizzardDerivativeProvider, defaultSigner);

    if (configs[defaultAddress].type === "provider") {
      tx = await CubanMainContract.depositCollateral();
      await tx.wait();
      console.log("Collateral deposited");
      transactions.push([{"time": Date.now() / 1000, "action": "Deposit Collateral", "tx_hash": tx}]);
    } else if (configs[defaultAddress].type === "purchaser") {
      tx = await CubanMainContract.depositPremium();
      await tx.wait();
      console.log("Contract purchased");
      transactions.push([{"time": Date.now() / 1000, "action": "Purchase Contract", "tx_hash": tx}]);
    } else if (configs[defaultAddress].type === "admin") {
      tx = await CubanMainContract.depositCollateral();
      await tx.wait();
      console.log("Collateral deposited");
      transactions.push([{"time": Date.now() / 1000, "action": "Deposit Collateral", "tx_hash": tx}]);
      tx = await CubanMainContract.depositPremium();
      await tx.wait();
      console.log("Contract purchased");
      transactions.push([{"time": Date.now() / 1000, "action": "Purchase Contract", "tx_hash": tx}]);

      // const deployedAddress = await CubanMainContract.getContractAddress();
    }
    console.log(transactions);
    setRows(rows.concat(transactions));

    var balance = await CubanMainContract.getUSDCBalance();
    console.log("Contract USDC balance:", balance);
  } else {
    console.log('address not recognized');
  }
}


const columns = [
  { field: 'time', headerName: 'Time', width: 80 },
  { field: 'action', headerName: 'Action', width: 80 },
  { field: 'tx_hash', headerName: 'Tx Hash', width: 80 },
];


function DataTable() {
  const rowState = useState([]);
  const rows = rowState[0];
  return (
    <div style={{ height: 200, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5]}
      />
    </div>
  );
}

function ButtonAppBar({ provider, loadWeb3Modal, logoutOfWeb3Modal}) {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar sx={{"justifyContent": "space-between", 'boxShadow': '0 3px 5px 2px rgba(0, 0, 0, .3)'}}>
          <Title sx={{ flexGrow: 1 }}>
              ARBOL-dAPP PORTAL
            </Title>
            <WalletButton provider={provider} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
        </Toolbar>
      </AppBar>
    </Box>
  );
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

  // React.useEffect(() => {
  //   if (!loading && !error && data && data.transfers) {
  //     console.log({ transfers: data.transfers });
  //   }
  // }, [loading, error, data]);

  return (
      <div>
        <ThemeProvider theme={theme}>
        <ButtonAppBar provider={provider} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
          <Body>
          <Grid
            container
            direction="row"
            justifyContent="space-around"
            alignItems="stretch"
          >
            <Grid item xs={4}>
              <Paper elevation={3} sx={{"background": themeOptions.palette.primary.main, "margin": "18px 18px"}}> 
                <Col>
                  <Title>
                    ABOUT
                  </Title>
                  <Text> 
                    The Arbol-dApp Portal provides an endpoint for interacting with Arbol's deployed Weather Derivative Provider smart contracts. 
                    Selecting an action first executes a transaction to approve the Derivative Provider smart contract to move the user's funds.
                    Deployment transaction details are logged as they are confirmed on chain.
                  </Text>
                </Col>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper elevation={3} sx={{ "background": themeOptions.palette.primary.main, "margin": "18px 18px" }}> 
                <Col>
                  <Image src={logo} alt="react-logo" />
                  <Link href="https://kovan.etherscan.io/address/0xe76be1733285165169aBe9193C4924803e0F1beB#code#F1#L1" style={{ marginTop: "8px" }}> etherscan </Link>
                  <Link href="https://github.com/Arbol-Project/Arbol-dApp" style={{ marginTop: "8px" }}> github </Link>
                </Col>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper elevation={3} sx={{ "background": themeOptions.palette.primary.main, "margin": "18px 18px" }}> 
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
                      'boxShadow': '0 3px 5px 2px rgba(0, 0, 0, .3)',
                      'color': 'white',
                    }} 
                    onClick={() => depositUSDC(provider, rows, setRows)}>
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
                      'boxShadow': '0 3px 5px 2px rgba(0, 0, 0, .3)',
                      'color': 'white',
                    }} 
                    onClick={() => depositUSDC(provider, rows, setRows)}>
                    PURCHASE CONTRACT
                  </Button>
                  <Text> 
                    Transactions
                    </Text>
                  <DataTable />
                </Col>
              </Paper>
            </Grid>
          </Grid>
          </Body>
        </ThemeProvider>
      </div>
  );
}

export default App;
