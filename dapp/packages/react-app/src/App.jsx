import "./App.less";
// import "./App.css";
import { 
  Button, 
  Col, 
  Row, 
  Layout,
  Input,
  List,
  Card,
  Divider,
  Select,
  Modal,
} from "antd";
import "antd/dist/antd.css";
import React, { useCallback, useEffect, useState } from "react";
import {
  Account,
  Header,
  NetworkDisplay,
  NetworkSwitch,
  LoginPage,
} from "./components";
import { 
  NETWORKS, 
} from "./constants";
import externalContracts from "./contracts/external_contracts";
import deployedContracts from "./contracts/hardhat_contracts.json";
import { 
  Web3ModalSetup 
} from "./helpers";
import { useStaticJsonRPC } from "./hooks";
import { 
  FrownOutlined, 
  LeftOutlined, 
  ArrowRightOutlined,
  DownloadOutlined, 
  FilterOutlined, 
  SearchOutlined 
} from "@ant-design/icons";
import axios from "axios";
import { SiweMessage } from "siwe";
import EthCrypto from "eth-crypto";

const { ethers } = require("ethers");
const { BigNumber } = require("@ethersproject/bignumber");
const bigInt = require("big-integer");
const { Option } = Select;

// const initialNetwork = NETWORKS.polygon; // polygon
const initialNetwork = NETWORKS.mumbai;     // mumbai
const contractName = "WeatherRiskNFT";
const payoutToken = "USDC";

const networkOptions = [initialNetwork.name, "polygon", "mumbai"];
const deployedContract = deployedContracts[initialNetwork.chainId][initialNetwork.name].contracts[contractName];
const externalContract = externalContracts[initialNetwork.chainId].contracts[payoutToken];
const clientRole = ethers.utils.keccak256(Buffer.from("CLIENT_ROLE"));
const deputyRole = ethers.utils.keccak256(Buffer.from("DEPUTY_ROLE"));
const minterRole = ethers.utils.keccak256(Buffer.from("MINTER_ROLE"));
const adminRole = "0x" + "0".repeat(64);
// const defaultClient = "0x31d04A8811f12CCA552406bc0101AD6d1Fba7192";
const defaultClient = "0x930503bD1A8Eb523C23A9dECBD9e7CA371169d0F";
const decimals = 6;
const solMaxInt = BigNumber.from(2).pow(256).sub(1);
const unlimitedProxy = BigNumber.from(10).pow(16);
const contractListTypes = {
  "contractID": "Contract ID",
  "premium": "Premium",
  "limit": "Limit",
  "endDate": "End Date",
  "opt_type": "Option Type",
  "lifecycleStage": "Lifecycle Stage",
}

// const DEBUG = false;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = false; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();


function App(props) {

  // helpers

  function displayCurrency(data, showZero=false) {
    if (data === "-") {
      return data
    }
    if (parseFloat(data) === 0) {
      if (showZero) {
        return "$0.00"
      } else {
        return "-"
      }
    } else {
      const dataSplit = parseFloat(data).toFixed(2).split(".");
      return "$" + parseInt(dataSplit[0]).toLocaleString("en-US") + "." + dataSplit[1];
    }
  }

  function setUnit(data, unit) {
    if (data === "-") {
      return data;
    }
    if (!unit) {
      return data;
    } else {
      if (unit === "%") {
        return (data * 100).toFixed(2).toString() + unit;
      } else if (unit === "$") {
        if (parseFloat(data) === 0) {
          return "-"
        }
        return (unit + data.toFixed(2).toString());
      } else if (unit === ",") {
        return data.toLocaleString("en-US");
      } else {
        return data;
      }
    }
  }

  function timestampToDate(t) {
    const date = new Date(t * 1000);
    const utcDate = date.toISOString();
    const slicedDate = utcDate.slice(0, utcDate.indexOf("T"));
    return slicedDate;
  }

  function stringifyCoordinates(coordinates) {
    // returns the first coordinate if multiple are given
    const [lat, lon] = coordinates[0];
    if (lat === "-" || lon === "-") {
      return "-"
    }
    return `Latitude ${lat + "\u00B0"}, Longitude ${lon + "\u00B0"}`
  }

  function bigIntToBase64String(x) {
    if (typeof x !== "string") {
      x = x.toString();
    }
    const tokenId = bigInt(x);
  
    let tokenIdHex = tokenId.toString(16);
    let padding = "";
    for (let i=0; i<26-tokenIdHex.length; i++) {
      // pad hex string if not 26 hex chars
      padding += "0";    
    }
    tokenIdHex = padding.concat(tokenIdHex);
    const tokenIdBytes = Buffer.from(tokenIdHex, "hex");
    const contractID = tokenIdBytes.toString("base64");
    // probably ends with padding "A=="
    return contractID
  }

  function base64StringToBigInt(s) {
    const tokenIdBytes = Buffer.from(s, "base64");
    const tokenIdHex = tokenIdBytes.toString("hex");
    let tokenId = bigInt(tokenIdHex, 16);
    tokenId = BigNumber.from(tokenId.toString());
    return tokenId;
  }

  function parseLifecycleStage(start, end, tokenUpdate) {
    const { disputed, settled, evalTimestamp, computedPayout } = tokenUpdate;
    const now = new Date();
    if (end < start) {
      return "Error: Invalid Coverage Period"
    } else {
      if (start < now) {
        return "Live Contract";
      } else if (end < now) {
        return "In Progress";
      } else if (evalTimestamp.eq(0)) {
        return "Awaiting Evaluation";
      } else if (!disputed && !settled) {
        return "Evaluated";
      } else if (disputed) {
        return "Evaluation Disputed";
      } else if (settled) {
        if (computedPayout.gt(0)) {
          return "Paid Out";
        }
        return "Settled";
      }
    }
  }

  // read only provider initialization
  
  const [contractReadInterface, setContractReadInterface] = useState();
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : initialNetwork.rpcUrl,
  ]);

  useEffect(() => {
    if (localProvider) {
      const readContract = new ethers.Contract(deployedContract.address, deployedContract.abi, localProvider);
      setContractReadInterface(readContract);
    }
  }, [localProvider])

  // user sign-in, authentication, and change response

  const [userRoles, setUserRoles] = useState({});
  const [currentPage, setCurrentPage] = useState("marketplace");
  const [previousPage, setPreviousPage] = useState("marketplace");

  useEffect(() => {
    if (userRoles.isAdmin) {
      setCurrentPage("database");
      setPreviousPage("database");
    } else {
      setCurrentPage("marketplace");
      setPreviousPage("marketplace");
    }
  }, [userRoles])

  const [injectedProvider, setInjectedProvider] = useState();

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect === "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  const [clientAuthorized, setClientAuthorized] = useState(false);
  const [unapprovedContracts, setUnapprovedContracts] = useState({});               // dict of unminted unapproved GRP tokens
  const [availableContracts, setAvailableContracts] = useState({});                 // dict of unminted approved GRP tokens
  const [mintedContracts, setMintedContracts] = useState({});                       // dict of owned GRP tokens

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    const ethersProvider = new ethers.providers.Web3Provider(provider);

    setInjectedProvider(ethersProvider);
    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setClientAuthorized(false);
      setUnapprovedContracts({});
      setAvailableContracts({});
      setMintedContracts({});
      setUserRoles({});
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);
  

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      try {
        loadWeb3Modal();
      } catch (e) {
        console.log(e);
        console.log("login failed");
        logoutOfWeb3Modal();
      }
    }
  }, [loadWeb3Modal]);

  useEffect(() => {
    if (injectedProvider) {
      setUserSigner(injectedProvider.getSigner());
    }
  }, [injectedProvider])

  // user contract interfaces

  const [userSigner, setUserSigner] = useState();
  const [address, setAddress] = useState();
  const [contractWriteInterface, setContractWriteInterface] = useState();
  const [settlementInterface, setSettlementInterface] = useState();

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();

    async function getStablecoinAddress() {
      if (userSigner) {
        const writeContract = new ethers.Contract(deployedContract.address, deployedContract.abi, userSigner);
        const stableAddress = await writeContract.STABLECOIN_ADDRESS();
        const stablecoinContract = new ethers.Contract(stableAddress, externalContract.abi, userSigner);
        setContractWriteInterface(writeContract);
        setSettlementInterface(stablecoinContract);
      }
    }
    getStablecoinAddress();
  }, [userSigner]);

  async function createSiweMessage(statement) {
    const res = await axios.get("/nonce", {credentials: "include"});
    const message = new SiweMessage({
      domain: window.location.host,
      address,
      statement,
      uri: window.location.host,
      version: 1,
      chainId: initialNetwork.chainId,
      nonce: res.data,
    });
    return message.prepareMessage();
  }

  // user authorization

  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState("");
  const [sessionInProgress, setSessionInProgress] = useState(false);
  const [reloadAuthorization, setReloadAuthorization] = useState(true);
  const [loginErrorMessage, setLoginErrorMessage] = useState("");

  async function signInWithEthereum() {
    console.log("Authenticating");
    const message = await createSiweMessage(
      `Sign in to Arbol dApp on ${initialNetwork.name.slice(0, 1).toUpperCase().concat("", initialNetwork.name.slice(1))}.`
    );
    try {
      const signature = await userSigner.signMessage(message);
      const res = await axios.post("/verify", { message, signature }, {
        credentials: "include"
      });
      const msgHash = ethers.utils.hashMessage(message);
      const msgHashBytes = ethers.utils.arrayify(msgHash);
      const recoveredPublicKey = ethers.utils.recoverPublicKey(msgHashBytes, signature);
      const compressedPublicKey = EthCrypto.publicKey.compress(Buffer.from(recoveredPublicKey.slice(2), "hex"));
      console.log("Session authenticated");
      setPublicKey(compressedPublicKey);
      if (sessionInProgress) {
        setReloadAuthorization(true);
      } else {
        setLoading(true);
        setSessionInProgress(true);
      }
    } catch (e) {
      console.log(e);
      console.log("Authentication failed");
      if (e.message.includes("500")) {
        setLoginErrorMessage("Verification failed: Invalid signature");
      } else  {
        setLoginErrorMessage(e.message);
      }
    }
  }

  useEffect(() => {
    if (address) {
      signInWithEthereum();
    }
  }, [address])

  async function authorizeClient() {
    console.log("Authorizing");
    let contract;
    if (contractReadInterface) {
      contract = contractReadInterface;
    } else if (contractWriteInterface) {
      contract = contractReadInterface;
    } else {
      contract = new ethers.Contract(deployedContract.address, deployedContract.abi, userSigner);
    }
    const isClient = await contract.hasRole(clientRole, address);
    const isAdmin = await contract.hasRole(adminRole, address);
    const isDeputy = await contract.hasRole(deputyRole, address);

    setUserRoles({
      isAdmin,
      isClient,
      isDeputy
    })

    if (isClient || isAdmin || isDeputy) {
      console.log("Session authorized");
      setClientAuthorized(true);
    } else {
      console.log("Authorization failed");
      setLoginErrorMessage("You are not authorized to use this dApp.");
    }
    setLoading(false);
    setReloadAuthorization(false);
  }

  useEffect(() => {
    if (sessionInProgress && reloadAuthorization) {
      authorizeClient();
    }
  }, [sessionInProgress, reloadAuthorization])

  // dashboards

  const [computedPayouts, setComputedPayouts] = useState({});
  const [computedPayoutsUpdate, setComputedPayoutsUpdate] = useState({});  

  useEffect(() => {
    if (computedPayoutsUpdate) {
      computedPayouts[computedPayoutsUpdate[0]] = computedPayoutsUpdate[1];
      setComputedPayouts(computedPayouts);
    }
  }, [computedPayoutsUpdate]);

  const [lifecycleStages, setLifecycleStages] = useState({});
  const [lifecycleStagesUpdate, setLifecycleStagesUpdate] = useState([]);

  useEffect(() => {
    if (lifecycleStagesUpdate) {
      lifecycleStages[lifecycleStagesUpdate[0]] = lifecycleStagesUpdate[1];
      setLifecycleStages(lifecycleStages);
    }
  }, [lifecycleStagesUpdate])

  const [fetching, setFetching] = useState(false);
  const [deputy, setDeputy] = useState();

  async function loadDashboards() {
    console.log("Loading dashboards");
    try {
      setFetching(true);
      let iterations;
      if (userRoles.isClient) {
        iterations = await contractReadInterface.balanceOf(address);
      } else if (userRoles.isAdmin || userRoles.isDeputy) {
        iterations = await contractReadInterface.totalSupply();
      }
      let mintedTokens = {};
      let availableTokens = {};
      let decryptJobs = [];
      let tokenId;
      let owner;
      for (let i=0; i<iterations; i++) {
        if (userRoles.isClient) {
          tokenId = await contractReadInterface.tokenOfOwnerByIndex(address, i);
          owner = address;
        } else {
          tokenId = await contractReadInterface.tokenByIndex(i);
          owner = await contractReadInterface.ownerOf(tokenId);
        }
        const contractID = bigIntToBase64String(tokenId);
        const uri = await contractReadInterface.tokenURI(tokenId);
        const tokenState = await contractReadInterface.tokenStates(tokenId);
        const tokenUpdate = await contractReadInterface.tokenUpdates(tokenId);
        const dappKey = tokenState.dappKey;
        const startDate = timestampToDate(tokenState.startDate);
        const endDate = timestampToDate(tokenState.endDate);
        const token = {
          key: (i+1).toString(),
          id: tokenId.toString(),
          contractID,
          uri,
          settled: tokenUpdate.settled,
          disputed: tokenUpdate.disputed,
          riskAddress: tokenUpdate.riskAddress,
          startDate,
          endDate,
          programName: tokenState.programName,
          disputed: tokenUpdate.disputed,
          evalTimestamp: tokenUpdate.evalTimestamp.toString(),
          viewerKey: tokenUpdate.viewerKey,
          nodeKey: tokenState.nodeKey,
          dappKey,
          owner
        }
        mintedTokens[contractID] = token;
        decryptJobs.push({ dappKey, uri, contractID });
        const computedPayout = tokenUpdate.computedPayout;
        const lifecycleStage = parseLifecycleStage(startDate, endDate, tokenUpdate);
        setComputedPayoutsUpdate([contractID, computedPayout]);
        setLifecycleStagesUpdate([contractID, lifecycleStage]);
      }

      const decryptions = await axios.post("/decrypt", {jobs: decryptJobs});
      for (const contractID in mintedTokens) {
        const confidential = decryptions.data[contractID];
        const updatedContract = Object.assign({}, mintedTokens[contractID], confidential);
        mintedTokens[contractID] = updatedContract;
      }
      setMintedContracts(mintedTokens);

      const unmintedContracts = await axios.post("/mongo", { isAdmin: userRoles.isAdmin });
      setDeputy(unmintedContracts.data.deputyAddress)
      delete unmintedContracts.data.deputyAddress;

      availableTokens = unmintedContracts.data;
      let unapprovedTokens = {};  
      for (const contractID in unmintedContracts.data) {
        const contractData = unmintedContracts.data[contractID];
        if (!contractData.approved) {
          unapprovedTokens[contractID] = availableTokens[contractID];
          delete availableTokens[contractID];
        }
        setLifecycleStagesUpdate([contractID, contractData.lifecycleStage]);
        setComputedPayoutsUpdate([contractID, contractData.computedPayout]);
      }
      if (userRoles.isAdmin) {
        setUnapprovedContracts(unapprovedTokens);
      }
      console.log("Dashboards loaded");
      setAvailableContracts(availableTokens);
      setFetching(false);
    } catch (e) {
      console.log(e);
      console.log("Dashboard loading failed");
      setFetching(false);
    }
  };

  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  useEffect(() => {
    if (clientAuthorized && selectedChainId) {
      if (selectedChainId !== localChainId) {
        console.log("connected to wrong network");
        setUnapprovedContracts({});
        setAvailableContracts({});
        setMintedContracts({});
      } else {
        loadDashboards();
      }
    } else {
      setUnapprovedContracts({});
      setAvailableContracts({});
      setMintedContracts({});
    }
  }, [clientAuthorized, address, selectedChainId]);

  // risk reports

  const [generatedReports, setGeneratedReports] = useState({});
  const [finishedReport, setFinishedReport] = useState("");
  const [finishedReportID, setFinishedReportID] = useState("");

  useEffect(() => {
    if (finishedReport && finishedReportID) {
      generatedReports[finishedReportID] = finishedReport;
      setGeneratedReports(generatedReports);
      setFinishedReport("");
      setFinishedReportID("");
    }
  }, [finishedReportID]);

  const [selectedReport, setSelectedReport] = useState("");
  const [riskError, setRiskError] = useState(false);

  async function generateContractPage(item) {
    console.log(`Generating risk report for ${item.contractID}`);
    let data = { filterField, filterValue, ...item };
    const reports = await axios.post("/risk", {premium: item.premium, ids: item.ids});
    if (!reports 
        || !reports.data 
        || !reports.data.result 
        || (Array.isArray(reports.data.errors) && reports.data.errors.length > 0)) {
      console.log("Error generating report");
      setRiskError(true);
    } else {
      setRiskError(false);
      data = Object.assign({}, data, reports.data.result);
      let reportSources = {contractID: item.ids.length > 1 ? item.contractID : item.ids[0]};
      let label;

      const payoutLabels = [
        "Expected Payout", 
        "Standard Deviation Payout",
        "Worst 20% Payout Average",
        "Worst 10% Payout Average",
        "Worst 5% Payout Average",
        "Worst 1% Payout Average",
        "Worst Payout",
        "Total Limit Loss",
      ];
      let payoutSource = {};
      let payout;
      for (let i = 0; i < payoutLabels.length; i++) {
        label = payoutLabels[i];
        payout = {
          simulated: displayCurrency(data["payouts"]["Simulated"][label]),
          historical: displayCurrency(data["payouts"]["Historical"][label]),
          final: displayCurrency(data["payouts"]["Final Estimate"][label]),
        };
        payoutSource[label] = payout;
      }
      reportSources["summary"] = payoutSource;

      const performanceLabels = [
        "Annualized return for full tenor",
        "Portfolio Expected Gain",
        "Tenor",
        "LC cost",
        "Collateral",
        "Capital at risk",
      ];
      let performanceSource = {};
      let unit;
      let value;
      for (let i = 0; i < performanceLabels.length; i++) {
        label = performanceLabels[i];
        unit = data["configs"]["units"][label];
        value = data["configs"]["Expected Performance"][label];
        if (unit === "$") {
          performanceSource[label] = displayCurrency(value);
        } else {
          performanceSource[label] = setUnit(value, unit);
        }
      }
      reportSources["performance"] = performanceSource;

      const premiumLabels = [
        "Unloaded",
        "Loaded",
        "Portfolio marginal"
      ];
      let premiumSource = {"premium": {}, "rate": {}};
      for (let i = 0; i < premiumLabels.length; i++) {
        label = premiumLabels[i];
        premiumSource.premium[label] = displayCurrency(data["premiums"]["Premium"][label]);
        premiumSource.rate[label] = setUnit(data["premiums"]["Rate"][label], data["premiums"]["Rate"]["units"]);
      }
      reportSources["premiums"] = premiumSource;
      const runId = Object.keys(data["contracts"])[0];

      let detailsSource = {
        "Estimated Payout": data["contracts"][runId]["expected_payout"],
        "Capital at risk": performanceSource["Capital at risk"],
        "Start Date": data.startDate,
        "End Date": data.endDate,
        "NFT URI": data.uri.length > 32 ? data.uri.substring(0, 32) + "..." : data.uri,
        "NFT ID": data.id,
        "Location": data.locations,
        "Dataset": data.dataset,
        "Program": data.programName,
        "Premium": data.premium,
        "Limit": data.limit,
        "Strike": data.strike,
        "Tick": data.tick,
        "Option Type": data.opt_type,
      };
      reportSources["details"] = detailsSource;
      if (data.filteValue) {
        reportSources["Filtering"] = `${data.filteValue} on ${data.filterField}`;
      }
      const reportData = Object.assign({}, item, reportSources);

      console.log("Report generated");
      setFinishedReport(reportData);
      setFinishedReportID(item.contractID);
    }
  }
  
  // filtering

  const [filterField, setFilterField] = useState("contractID");
  const [filterValue, setFilterValue] = useState("*");

  function filterContracts(contracts) {
    if (filterValue === "*") {
      return Object.values(contracts);
    }
    let filtered = [];
    for (const contractID in contracts) {
      if (filterField === "lifecycleStage") {
        if (lifecycleStages[contractID] === filterValue) {
          filtered.push(contracts[contractID]);
        }
      } else if (filterField in contracts[contractID]) {
        if (contracts[contractID][filterField] === filterValue) {
          filtered.push(contracts[contractID]);
        } else if (["limit", "premium"].includes(filterField)) {
          if (displayCurrency(contracts[contractID][filterField]) === filterValue) {
            filtered.push(contracts[contractID]);
          } else if (contracts[contractID][filterField].toString() === filterValue) {
            filtered.push(contracts[contractID]);
          }
        }
      }
    }
    return filtered;
  }

  function describePortfolio() {
    let portfolioID = "";
    if (currentPage === "marketplace") {
      portfolioID = "Available contracts";
    } else if (currentPage === "dashboard") {
      portfolioID = "Owned contracts";
    } else if (currentPage === "database") {
      portfolioID = "Unapproved contracts";
    }
    if (filterValue === "*") {
      portfolioID = "All " + portfolioID.toLowerCase();
    } else {
      portfolioID = portfolioID + ` filtered by "${filterValue}" ${contractListTypes[filterField]}`
    }
    return portfolioID;
  }

  // networks

  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  
  const targetNetwork = NETWORKS[selectedNetwork];
  const blockExplorer = targetNetwork.blockExplorer;
  
  // contract interactions and lifecycle

  const [liveComputedPayout, setLiveComputedPayout] = useState("");

  async function updateContractComputedPayout(contractID) {
    const tokenId = base64StringToBigInt(contractID);
    const tokenUpdate = await contractReadInterface.tokenUpdates(tokenId);
    const newComputedPayout = tokenUpdate.computedPayout;
    if (!(currentPage === "risk" && selectedReport !== contractID)) {
      setLiveComputedPayout(newComputedPayout);
    }
    console.log(`Computed payout for ${contractID} updated to ${newComputedPayout}`);
    setComputedPayoutsUpdate([contractID, newComputedPayout]);
  }

  const [liveEvaluationStatus, setLiveEvaluationStatus] = useState("");

  async function updateContractLifecyclStage(contractID) {
    const tokenId = base64StringToBigInt(contractID);
    const tokenUpdate = await contractReadInterface.tokenUpdates(tokenId);    
    const contract = mintedContracts[contractID];
    const lifecycleStage = parseLifecycleStage(contract.startDate, contract.endDate, tokenUpdate);
    if (!(currentPage === "risk" && selectedReport !== contractID)) {
      setLiveEvaluationStatus(lifecycleStage);
    }
    console.log(`Lifecycle stage for ${contractID} updated to ${lifecycleStage}`);
    setLifecycleStagesUpdate([contractID, lifecycleStage]);
  }

  const [primaryButtonLoading, setPrimaryButtonLoading] = useState(false);
  const [secondButtonLoading, setSecondButtonLoading] = useState(false);
  const [thirdButtonLoading, setThirdButtonLoading] = useState(false);

  const [approveQueue, setApproveQueue] = useState({});
  const [mintQueue, setMintQueue] = useState({});
  const [evaluateQueue, setEvaluateQueue] = useState({});
  const [disputeQueue, setDisputeQueue] = useState({});
  const [settleQueue, setSettleQueue] = useState({});

  useEffect(() => {
    if (selectedReport) {
      if (!selectedReport.includes("contract")) {
        setLiveEvaluationStatus(lifecycleStages[selectedReport]);
        setLiveComputedPayout(computedPayouts[selectedReport]);
      }
      if (previousPage === "database") {
        setPrimaryButtonLoading(selectedReport in approveQueue);
      } else if (previousPage === "marketplace") {
        setPrimaryButtonLoading(selectedReport in mintQueue);
      } else {
        setPrimaryButtonLoading(selectedReport in evaluateQueue);
        setSecondButtonLoading(selectedReport in disputeQueue);
        setThirdButtonLoading(selectedReport in settleQueue);
      }
    } else {
      setPrimaryButtonLoading(false);
    }
  }, [selectedReport]);

  function cleanupContractApproval(contractID, success) {
    if (!(currentPage === "risk" && selectedReport !== contractID)) {
      setPrimaryButtonLoading(false);
      if (success) {
        setPreviousPage("marketplace");
      }
    }
    delete approveQueue[contractID];
    setApproveQueue(approveQueue);
  }

  const [startedApproveID, setStartedApproveID] = useState("");

  useEffect(() => {
    if (startedApproveID) {
      approveQueue[startedApproveID] = true;
      setApproveQueue(approveQueue);
      setStartedApproveID("");
    }
  }, [startedApproveID]);

  const [finishedApproveID, setFinishedApproveID] = useState("");

  useEffect(() => {
    if(finishedApproveID) {
      availableContracts[finishedApproveID] = unapprovedContracts[finishedApproveID];
      delete unapprovedContracts[finishedApproveID];
      setAvailableContracts(availableContracts);
      setUnapprovedContracts(unapprovedContracts);
      cleanupContractApproval(finishedApproveID, true);
      setFinishedApproveID("");
    }
  }, [finishedApproveID]);

  const [cancelledApproveID, setCancelledApproveID] = useState("");

  useEffect(() => {
    if (cancelledApproveID) {
      cleanupContractApproval(cancelledApproveID, false);
      setCancelledApproveID("");
    };
  }, [cancelledApproveID]);

  async function approveContract() {
    setStartedApproveID(selectedReport);
    try {
      const contract = unapprovedContracts[selectedReport];
      const contractID = contract.contractID;
      let tx;
      const res = await axios.post("/approve", { deputizedMint: false, counterparty, contract });
      if ("error" in res.data) {
        console.log(res);
        console.log("Approval failed");
        setCancelledApproveID(selectedReport);
      } else {
        let formattedState = res.data.tokenState.slice(0, res.data.tokenState.length-2);
        formattedState.push(Buffer.from(res.data.tokenState[5]));
        formattedState.push(Buffer.from(res.data.tokenState[6]));

        console.log(`Initializing contract ${contractID}`);
        tx = await contractWriteInterface.preMint(contract.id, formattedState);
        await tx.wait();
        const allowanceUSDC = await settlementInterface.allowance(deployedContract.address, address);
        const premiumUSDC = BigNumber.from(formattedState[1]).mul(BigNumber.from(10).pow(decimals - 2));

        console.log(`Approving premium transfer amount ${formattedState[1] / 100}`);
        tx = await settlementInterface.approve(deployedContract.address, allowanceUSDC.add(premiumUSDC));
        await tx.wait();
        const state = await contractReadInterface.tokenStates(contract.id);
        
        console.log(`Token ${state}`);
        console.log("Approved");
        setFinishedApproveID(selectedReport);
      }
    } catch (e) {
      console.log(e);
      console.log("Approval cancelled");
      setCancelledApproveID(selectedReport);
    }
  }

  const [portfolioApproving, setPortfolioApproving] = useState(false);

  async function approvePortfolio() {
    try{
      const canApprove = await contractReadInterface.hasRole(minterRole, deputy);
      let tx;
      if (!canApprove) {
        console.log("Temporarily granting minter role to deputy");
        tx = await contractWriteInterface.grantRole(minterRole, deputy);
        await tx.wait();
      }

      const filteredUnapproved = filterContracts(unapprovedContracts);
      let totalPremium = 0;
      for (let i=0; i<filteredUnapproved.length; i++) {
        const contract = filteredUnapproved[i];
        const contractID = contract.contractID;
        setStartedApproveID(contractID);
        try {
          console.log(`Initializing ${contractID}`);
          const res = await axios.post("/approve", { deputyApprove: true, counterparty, contract });
          if (res.data.approveStatus) {
            totalPremium += contract.premium;

            console.log("Approved");
            setFinishedApproveID(contractID);
          } else {
            console.log(res);
            console.log("Approval failed");
            setCancelledApproveID(contractID);
          }
        } catch (e) {
          console.log(e);
          console.log("Approval failed");
          setCancelledApproveID(contractID);
        }
      }
      console.log(`Approving total premium transfer amount ${totalPremium}`);
      const allowanceUSDC = await settlementInterface.allowance(deployedContract.address, address);
      const premiumUSDC = BigNumber.from(parseInt(totalPremium * 100)).mul(BigNumber.from(10).pow(decimals - 2));
      tx = await settlementInterface.approve(deployedContract.address, allowanceUSDC.add(premiumUSDC));
      await tx.wait();

      console.log("Revoking minter role from deputy");
      tx = await contractWriteInterface.revokeRole(minterRole, deputy);
      await tx.wait();
      setPortfolioApproving(false);
      setPreviousPage("marketplace");
    } catch (e) {
      const hasRole = await contractReadInterface.hasRole(minterRole, deputy);
      if (hasRole) {
        console.log("Revoking minter role from deputy");
        let tx = await contractWriteInterface.revokeRole(minterRole, deputy);
        await tx.wait();
      }
      console.log(e);
      console.log("Portfolio Approval cancelled");
      setPortfolioApproving(false);
    } 
  }

  function cleanupContractMint(contractID, success) {
    if (!(currentPage === "risk" && selectedReport !== contractID)) {
      setPrimaryButtonLoading(false);
      if (success) {
        setPreviousPage("dashboard");
      }
    }
    delete mintQueue[contractID];
    setMintQueue(mintQueue);
  }

  const [startedMintID, setStartedMintID] = useState("");

  useEffect(() => {
    if (startedMintID) {
      mintQueue[startedMintID] = true;
      setMintQueue(mintQueue);
      setStartedMintID("");
    }
  }, [startedMintID]);

  const [finishedMintID, setFinishedMintID] = useState("");

  useEffect(() => {
    if (finishedMintID) {
      mintedContracts[finishedMintID] = availableContracts[finishedMintID];
      delete availableContracts[finishedMintID];
      setMintedContracts(mintedContracts);
      setAvailableContracts(availableContracts);
      cleanupContractMint(finishedMintID, true);
      setFinishedMintID("");
    };
  }, [finishedMintID]);

  const [cancelledMintID, setCancelledMintID] = useState("");

  useEffect(() => {
    if (cancelledMintID) {
      cleanupContractMint(cancelledMintID, false);
      setCancelledMintID("");
    };
  }, [cancelledMintID]);

  const [askToApproveUnlimited, setAskToApproveUnlimited] = useState(true);

  async function mintContract() {
    setStartedMintID(selectedReport);
    try {
      const contract = availableContracts[selectedReport];
      const allowanceUSDC = await settlementInterface.allowance(address, deployedContract.address);
      if (allowanceUSDC.lt(unlimitedProxy)) {
        if (askToApproveUnlimited) {
          try {
            console.log("Approving unlimited transfer amount");
            let tx = await settlementInterface.approve(deployedContract.address, solMaxInt);  
            await tx.wait();
          } catch (e) {
            console.log("Client did not approve unlimited transfer amount");
            console.log(`Approving limit transfer amount ${contract.limit}`);
            const limitUSDC = BigNumber.from(parseInt(contract.limit * 100)).mul(BigNumber.from(10).pow(decimals - 2));
            let tx = await settlementInterface.approve(deployedContract.address, allowanceUSDC.add(limitUSDC));
            await tx.wait();
          }
          setAskToApproveUnlimited(false);
        } else {
          console.log(`Approving limit transfer amount ${contract.limit}`);
          const limitUSDC = BigNumber.from(parseInt(contract.limit * 100)).mul(BigNumber.from(10).pow(decimals - 2));
          let tx = await settlementInterface.approve(deployedContract.address, allowanceUSDC.add(limitUSDC));
          await tx.wait();
        }
      }
      const res = await axios.post("/mint", { deputyMint: false, publicKey, contract })
      if ("error" in res.data) {
        console.log(res);
        console.log("Mint failed");
        setCancelledMintID(selectedReport);
      } else {
        console.log(`Minting ${selectedReport}`);
        let tx = await contractWriteInterface.mint(contract.id, res.data.uri, Buffer.from(res.data.viewerKey));
        await tx.wait();

        console.log("Minted");
        setFinishedMintID(selectedReport);
      }
    } catch (e) {
      console.log(e);
      console.log("Mint cancelled");
      setCancelledMintID(selectedReport);
    }
  }

  const [portfolioMinting, setPortfolioMinting] = useState(false);

  async function mintPortfolio() {
    try {      
      const allowanceUSDC = await settlementInterface.allowance(address, deployedContract.address);
      const filteredAvailable = filterContracts(availableContracts);
      if (allowanceUSDC.lt(unlimitedProxy)) {
        if (askToApproveUnlimited) {
          try {
            console.log("Approving unlimited transfer amount");
            let tx = await settlementInterface.approve(deployedContract.address, solMaxInt);  
            await tx.wait();
          } catch (e) {
            console.log("Client did not approve unlimited transfer amount");
            let totalLimit = 0
            for (let i=0; i<filteredAvailable.length; i++) {
              const contract = filteredAvailable[i];
              totalLimit += contract.limit;
            }
            console.log(`Approving total limit transfer amount ${totalLimit}`);
            const limitUSDC = BigNumber.from(parseInt(totalLimit * 100)).mul(BigNumber.from(10).pow(decimals - 2));
            let tx = await settlementInterface.approve(deployedContract.address, allowanceUSDC.add(limitUSDC));
            await tx.wait();
          }
          setAskToApproveUnlimited(false);
        } else {
          let totalLimit = 0
          for (let i=0; i<filteredAvailable.length; i++) {
            const contract = filteredAvailable[i];
            totalLimit += contract.limit;
          }
          console.log(`Approving total limit transfer amount ${totalLimit}`);
          const limitUSDC = BigNumber.from(parseInt(totalLimit * 100)).mul(BigNumber.from(10).pow(decimals - 2));
          let tx = await settlementInterface.approve(deployedContract.address, allowanceUSDC.add(limitUSDC));
          await tx.wait();
        }
      }

      for (let i=0; i<filteredAvailable.length; i++) {
        const contract = filteredAvailable[i];
        const contractID = contract.contractID;
        setStartedMintID(contractID);
        try {
          console.log(`Minting ${contractID}`);
          const res = await axios.post("/mint", { deputyMint: true, publicKey, contract });
          if (res.data.mintStatus) {
            console.log("Minted");
            setFinishedMintID(contractID);
          } else {
            console.log(res);
            console.log("Mint failed");
            setCancelledMintID(contractID);
          }
        } catch (e) {
          console.log(e);
          console.log("Mint failed");
          setCancelledMintID(contractID);
        }
      }
      setPortfolioMinting(false);
      setPreviousPage("dashboard");
    } catch (e) {
      console.log(e);
      console.log("Portfolio mint cancelled");
      setPortfolioMinting(false);
    }
  }

  const [portfolioPrimaryButtonLoading, setPortfolioPrimaryButtonLoading] = useState(false);

  function cleanupContractEvaluation(contractID) {
    console.log("Cleaning up contract evaluation");
    if (!(currentPage === "risk" && selectedReport !== contractID)) {
      console.log("Disabling evaluate button");
      setPrimaryButtonLoading(false);
    }
    delete evaluateQueue[contractID];
    if (Object.keys(evaluateQueue).length === 0) {
      setPortfolioPrimaryButtonLoading(false);
    }
    setEvaluateQueue(evaluateQueue);
  }

  const [startedEvaluateID, setStartedEvaluateID] = useState("");

  useEffect(() => {
    if (startedEvaluateID) {
      console.log(`Started evaluation of ${startedEvaluateID}`);
      evaluateQueue[startedEvaluateID] = true;
      setEvaluateQueue(evaluateQueue);
      setStartedMintID("");
    };
  }, [startedEvaluateID]);

  const [finishedEvaluateID, setFinishedEvaluateID] = useState("");

  useEffect(() => {
    if (finishedEvaluateID) {
      console.log(`Submitted evaluation request for ${finishedEvaluateID}`);
      setTimeout(() => {
        console.log("Checking evaluation results");
        updateContractComputedPayout(finishedEvaluateID);
        updateContractLifecyclStage(finishedEvaluateID);
        cleanupContractEvaluation(finishedEvaluateID);
      }, 60 * 1000);
      setFinishedEvaluateID("");
    };
  }, [finishedEvaluateID]);

  const [cancelledEvaluateID, setCancelledEvaluateID] = useState("");

  useEffect(() => {
    if (cancelledEvaluateID) {
      console.log(`Cancelled evaluation of ${cancelledEvaluateID}`);
      cleanupContractEvaluation(cancelledEvaluateID);
      setCancelledEvaluateID("");
    };
  }, [cancelledEvaluateID]);

  async function evaluateContract() {
    setStartedEvaluateID(selectedReport);
    try {
      const contract = mintedContracts[selectedReport];
      console.log(`Requesting evaluation of contract ${selectedReport}`);
      let tx = await contractWriteInterface.requestEvaluation(contract.id);
      await tx.wait();

      console.log("Evaluation initiated");
      setFinishedEvaluateID(selectedReport);
    } catch (e) {
      console.log(e);
      console.log("Evaluation cancelled");
      setCancelledEvaluateID(selectedReport);
    }
  }

  // TODO: restart node and fix memory requirements for IPFS (and possibly node)
  // TODO: deploy to web app and push to github

  async function evaluatePortfolio() {
    try {
      const filteredMinted = filterContracts(mintedContracts);
      let counter = 0;
      for (let i=0; i<filteredMinted.length; i++) {
        const contract = filteredMinted[i];
        const contractID = contract.contractID;
        if (["Awaiting Evaluation", "Evaluation Disputed"].includes(lifecycleStages[contractID])) {
          setStartedEvaluateID(contractID);
          try {
            console.log(`Requesting evaluation of contract ${contractID}`);
            const res = await axios.post("/evaluate", { tokenId: contract.id });
            if (res.data.evaluateStatus) {
              console.log("Evaluation initiated");
              counter += 1;
              setFinishedEvaluateID(contractID);
            } else {
              console.log(res);
              console.log("Evaluation failed");
              setCancelledEvaluateID(contractID);
            }
          } catch (e) {
            console.log(e);
            console.log("Evaluation failed");
            setCancelledEvaluateID(contractID);
          } 
        }
      }
      if (counter === 0) {
        setPortfolioPrimaryButtonLoading(false);  
      }
    } catch (e) {
      console.log(e);
      console.log("Portfolio evaluation cancelled");
      setPortfolioPrimaryButtonLoading(false);
    }
  }

  const [portfolioSecondButtonLoading, setPortfolioSecondButtonLoading] = useState(false);

  function cleanupContractDispute(contractID) {
    console.log("Cleaning up contract dispute");
    if (!(currentPage === "risk" && selectedReport !== contractID)) {
      console.log("Disabling dispute button");
      setSecondButtonLoading(false);
    }
    delete disputeQueue[contractID];
    if (Object.keys(disputeQueue).length === 0) {
      setPortfolioSecondButtonLoading(false);
    }
    setDisputeQueue(disputeQueue);
  }

  const [startedDisputeID, setStartedDisputeID] = useState("");
  
  useEffect(() => {
    if (startedDisputeID) {
      disputeQueue[startedDisputeID] = true;
      setDisputeQueue(disputeQueue);
      setStartedDisputeID("");
    };
  }, [startedDisputeID]);

  const [finishedDisputeID, setFinishedDisputeID] = useState("");
  
  useEffect(() => {
    if (finishedDisputeID) {
      updateContractLifecyclStage(finishedDisputeID);
      cleanupContractDispute(finishedDisputeID);
      setFinishedDisputeID("");
    };
  }, [finishedDisputeID]);

  const [cancelledDisputeID, setSetCancelledDisputeID] = useState("");

  useEffect(() => {
    if (cancelledDisputeID) {
      cleanupContractDispute(cancelledDisputeID);
      setSetCancelledDisputeID("");
    };
  }, [cancelledDisputeID]);

  async function disputeContract() {
    setStartedDisputeID(selectedReport);
    try {
      const contract = mintedContracts[selectedReport];
      console.log(`Disputing evaluation of contract ${contract.contractID}`);
      let tx = await contractWriteInterface.disputeEvaluation(contract.id);
      await tx.wait();

      console.log("Evaluation disputed");
      setFinishedDisputeID(selectedReport);
    } catch (e) {
      console.log(e);
      console.log("Dispute cancelled");
      setSetCancelledDisputeID(selectedReport);
    }
  }

  async function disputePortfolio() {
    try {
      const filteredMinted = filterContracts(mintedContracts);
      let counter = 0;
      for (let i=0; i<filteredMinted.length; i++) {
        const contract = filteredMinted[i];
        const contractID = contract.contractID;
        if (lifecycleStages[contractID] === "Evaluated") {
          setStartedDisputeID(contractID);
          try {
            console.log(`Disputing evaluation of contract ${contractID}`);
            const res = await axios.post("/dispute", { tokenId: contract.id });
            if (res.data.disputeStatus) {
              console.log("Evaluation disputed");
              counter += 1;
              setFinishedDisputeID(contractID);
            } else {
              console.log(res);
              console.log("Dispute failed");
              setSetCancelledDisputeID(contractID);
            }
          } catch (e) {
            console.log(e);
            console.log("Dispute failed");
            setSetCancelledDisputeID(contractID);
          }
        }
      }
      if (counter === 0) {
        setPortfolioSecondButtonLoading(false);  
      }
    } catch (e) {
      console.log(e);
      console.log("Portfolio dispute cancelled");
      setPortfolioSecondButtonLoading(false);
    }
  }

  const [portfolioThirdButtonLoading, setPortfolioThirdButtonLoading] = useState(false);

  function cleanupContractSettlement(contractID) {
    console.log("Cleaning up contract settlement");
    if (!(currentPage === "risk" && selectedReport !== contractID)) {
      console.log("Disabling settle button");
      setThirdButtonLoading(false);
    }
    delete settleQueue[contractID];
    if (Object.keys(settleQueue).length === 0) {
      setPortfolioThirdButtonLoading(false);
    }
    setSettleQueue(settleQueue);
  }

  const [startedSettleID, setStartedSettleID] = useState("");

  useEffect(() => {
    if (startedSettleID) {
      settleQueue[startedSettleID] = true;
      setSettleQueue(settleQueue);
      setStartedSettleID("");
    };
  }, [startedSettleID]);

  const [finishedSettleID, setFinishedSettleID] = useState("");

  useEffect(() => {
    if (finishedSettleID) {
      updateContractLifecyclStage(finishedSettleID);
      cleanupContractSettlement(finishedSettleID);
      setFinishedSettleID("");
    };
  }, [finishedSettleID]);

  const [cancelledSettleID, setCancelledSettleID] = useState("");

  useEffect(() => {
    if (cancelledSettleID) {
      cleanupContractSettlement(cancelledSettleID);
      setCancelledSettleID("");
    };
  }, [cancelledSettleID]);

  async function settleContract() {
    setStartedSettleID(true);
    try {
      const contract = mintedContracts[selectedReport];
      console.log(`Initiating final settlement of contract ${contract.contractID}`);
      let tx = await contractWriteInterface.settleContract(contract.id);
      await tx.wait();

      console.log("Settlement finalized");
      setFinishedSettleID(selectedReport);
    } catch (e) {
      console.log(e);
      console.log("Settlement failed");
      setCancelledSettleID(selectedReport);
    }
  }

  async function settlePortfolio() {
    try {
      const filteredMinted = filterContracts(mintedContracts);
      let counter = 0;
      for (let i=0; i<filteredMinted.length; i++) {
        const contract = filteredMinted[i];
        const contractID = contract.contractID;
        if (lifecycleStages[contractID] === "Evaluated") {
          setStartedSettleID(contractID);
          try {
            console.log(`Initiating final settlement of contract ${contractID}`);
            const res = await axios.post("/settle", { tokenId: contract.id });
            if (res.data.settlementStatus) {
              console.log("Settlement finalized");
              counter += 1;
              setFinishedSettleID(contractID);
            } else {
              console.log(res);
              console.log("Settlement failed");
              setCancelledSettleID(contractID);
            }
          } catch (e) {
            console.log(e);
            console.log("Settlement failed");
            setCancelledSettleID(contractID);
          } 
        }
      }
      if (counter === 0) {
        setPortfolioThirdButtonLoading(false);  
      }
    } catch (e) {
      console.log(e);
      console.log("Portfolio settlement cancelled");
      setPortfolioThirdButtonLoading(false);
    }
  }

  // inputs

  const [userInput, setUserInput] = useState("");
  const [modalInput, setModalInput] = useState("");
  const [counterparty, setCounterparty] = useState(defaultClient);
  const [counterpartyModalOpen, setCounterpartyModalOpen] = useState(false)

  return (
    <div className="App">
      <Layout>
        <Layout.Header 
          style={{ 
            padding: 0, 
            backgroundColor: "#FFFFFF", 
            height: 72,
            position: "fixed",
            width: "100%",
            zIndex: 1,
          }}>
          <Row>
            <Col span={4}>
            </Col>
            <Col span={16}>
              <Row justify="space-between">
                <Col span={8}>
                  <Header/>
                </Col>
                <Col span={8}>
                  <NetworkDisplay
                    NETWORKCHECK={NETWORKCHECK}
                    localChainId={localChainId}
                    selectedChainId={selectedChainId}
                    targetNetwork={targetNetwork}
                    logoutOfWeb3Modal={logoutOfWeb3Modal}
                    USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
                  />
                  <div
                    style={{ 
                      textAlign: "right", 
                    }}>
                    {USE_NETWORK_SELECTOR && (
                      <div>
                        <NetworkSwitch
                          networkOptions={networkOptions}
                          selectedNetwork={selectedNetwork}
                          setSelectedNetwork={setSelectedNetwork}
                        />
                      </div>
                    )}
                    <Account
                      transferrableIDs={Object.keys(mintedContracts)}
                      contractInterface={contractWriteInterface}
                      useBurner={USE_BURNER_WALLET}
                      address={address}
                      localProvider={localProvider}
                      userSigner={userSigner}
                      pubKey={publicKey}
                      web3Modal={web3Modal}
                      loadWeb3Modal={loadWeb3Modal}
                      logoutOfWeb3Modal={logoutOfWeb3Modal}
                      blockExplorer={blockExplorer}
                    />
                  </div>
                </Col>
              </Row>
            </Col>
            <Col span={4}>
            </Col>
          </Row>
        </Layout.Header> 
        <Layout.Content 
          style={{ 
            marginTop: 72,
            padding: 0, 
            backgroundColor: "#FAFAFA",
          }}>
          <div className="Content"
            style={{
              minHeight: "calc(100vh - 144px)"
            }}>
            <Row>
              <Col span={4}>
              </Col>
              <Col span={16}>
                {!sessionInProgress && !loginErrorMessage ? (
                 <LoginPage/>
                ) : loginErrorMessage ? (
                  <div className="Error">
                    <Row justify="center"
                      style={{
                        marginTop: 160
                      }}>
                      <FrownOutlined 
                        style={{
                          fontSize: 24,
                          marginTop: 5
                        }}/>
                      <h2 
                        style={{
                          color: "#3F5F69",
                          marginLeft: 10,
                        }}>
                        {loginErrorMessage}
                      </h2>
                    </Row>
                  </div>
                ) : (
                  <div className="Session">
                    {!clientAuthorized ? (
                      <div className="Loading">
                        {loading ? (
                          <div className="Loading">
                            <Row justify="center">
                              <div className="Spinner"
                                style={{
                                  marginTop: 160
                                }}>
                                <img
                                  width={50}
                                  src="/Spinning-Spinner.gif"
                                  alt="Spinner" 
                                />
                              </div>
                            </Row>
                          </div>
                        ) : (
                          <div className="Unauthorized" 
                            style={{
                              padding: 200, 
                            }}>
                            <h3 
                              style={{
                                textAlign: "center", 
                                color: "#8E8E8E"
                              }}>
                              Not an authorized wallet: Please connect a different wallet or speak 
                              with an Arbol Solutions representative.
                            </h3>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="Authorized">
                        {currentPage === "risk" ? (
                          <div className="Risk">
                            <Row justify="start"
                              style={{ 
                                marginTop: 16, 
                                marginBottom: 16 
                              }}>
                              <Col>
                                <Button
                                  onClick={() => {
                                    setFilterValue("*");
                                    setCurrentPage(previousPage);
                                    setSelectedReport("");
                                  }}
                                  size="medium"
                                  shape="round"
                                  type="text"
                                  style={{
                                    borderRadius: 8
                                  }}>
                                  <p 
                                    stlye={{ 
                                      color: "#3F5F69"
                                    }}>
                                    <LeftOutlined/>Contracts
                                  </p>
                                </Button>
                              </Col>
                            </Row>
                            {selectedReport ? (
                               <div className="Buttons">
                                  <Row
                                    syle={{
                                      width: "100%"
                                    }}>
                                    {previousPage === "database" ? (
                                      <div className="Approver"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          marginBottom: 20
                                        }}>
                                        {selectedReport.includes("contracts") ? (
                                          <Row justify="space-between">
                                            <Col 
                                              style={{
                                                width: "23%"
                                              }}>
                                              <Button 
                                                style={{ 
                                                  width: "100%",
                                                  textAlign: "center", 
                                                  backgroundColor: "#FFFFFF", 
                                                  color: "#232323", 
                                                  height: "100%",
                                                  borderRadius: 12, 
                                                }}
                                                onClick={() => {
                                                  console.log("Setting mint receiver");
                                                  setCounterpartyModalOpen(true);
                                                }}>
                                                <span
                                                  style={{
                                                    fontSize: 16
                                                  }}>
                                                  Receiver<br/>{"(click to change)"}
                                                </span>
                                              </Button>
                                              <Modal
                                                visible={counterpartyModalOpen}
                                                title="Set Intended Receiver Address"
                                                onCancel={() => {
                                                  setCounterpartyModalOpen(false);
                                                }}
                                                footer={[
                                                  <Button 
                                                    key="return"
                                                    style={{
                                                      border: 0
                                                    }}
                                                    onClick={() => {
                                                      setCounterpartyModalOpen(false);
                                                    }}>
                                                    Return
                                                  </Button>
                                                ]}
                                              >
                                                <Row>
                                                  <p>
                                                    receiver: {counterparty}
                                                  </p>
                                                </Row>
                                                <Row>
                                                  <Col span={20}>
                                                    <Input 
                                                      style={{
                                                        borderRadius: 12
                                                      }}
                                                      defaultValue=""
                                                      onChange={(value) => {
                                                        setModalInput(value.target.value);
                                                      }}
                                                    />
                                                  </Col>
                                                  <Col span={4}>
                                                    <Button 
                                                      style={{
                                                        borderRadius: 12, 
                                                      }}
                                                      onClick={() => {
                                                        console.log(`Setting contract counterparty ${modalInput}`);
                                                        setCounterparty(modalInput);
                                                        setCounterpartyModalOpen(false);
                                                      }}>
                                                      Submit
                                                    </Button>
                                                  </Col>
                                                </Row>
                                              </Modal>
                                            </Col>
                                            <Col 
                                              style={{
                                                width: "75%"
                                              }}>
                                              <Button 
                                                style={{ 
                                                  width: "100%",
                                                  textAlign: "center", 
                                                  backgroundColor: "#FFFFFF", 
                                                  color: "#232323", 
                                                  height: 71,
                                                  borderRadius: 12, 
                                                }}
                                                disabled={portfolioApproving}
                                                loading={portfolioApproving}
                                                onClick={() => {
                                                  setPortfolioApproving(true);
                                                  approvePortfolio();
                                                }}>
                                                <span
                                                  style={{
                                                    fontSize: 16
                                                  }}>
                                                  Approve All Contracts
                                                </span>
                                              </Button>
                                            </Col>
                                          </Row>
                                        ) : (
                                          <Row justify="space-between">
                                            <Col 
                                              style={{
                                                width: "23%"
                                              }}>
                                              <Button 
                                                style={{ 
                                                  width: "100%",
                                                  textAlign: "center", 
                                                  backgroundColor: "#FFFFFF", 
                                                  color: "#232323", 
                                                  height: "100%",
                                                  borderRadius: 12, 
                                                }}
                                                onClick={() => {
                                                  console.log("Setting mint receiver");
                                                  setCounterpartyModalOpen(true);
                                                }}>
                                                <span
                                                  style={{
                                                    fontSize: 16
                                                  }}>
                                                  Receiver<br/>{"(click to change)"}
                                                </span>
                                              </Button>
                                              <Modal
                                                visible={counterpartyModalOpen}
                                                title="Set Intended Receiver Address"
                                                onCancel={() => {
                                                  setCounterpartyModalOpen(false);
                                                }}
                                                footer={[
                                                  <Button 
                                                    key="return"
                                                    style={{
                                                      border: 0
                                                    }}
                                                    onClick={() => {
                                                      setCounterpartyModalOpen(false);
                                                    }}>
                                                    Return
                                                  </Button>
                                                ]}
                                              >
                                                <Row>
                                                  <p>
                                                    receiver: {counterparty}
                                                  </p>
                                                </Row>
                                                <Row>
                                                  <Col span={20}>
                                                    <Input 
                                                    style={{
                                                      borderRadius: 12
                                                    }}
                                                      defaultValue=""
                                                      onChange={(value) => {
                                                        setModalInput(value.target.value);
                                                      }}
                                                    />
                                                  </Col>
                                                  <Col span={4}>
                                                    <Button 
                                                      style={{
                                                        borderRadius: 12, 
                                                        marginLeft: 5
                                                      }}
                                                      onClick={() => {
                                                        console.log(`Setting contract counterparty ${modalInput}`);
                                                        setCounterparty(modalInput);
                                                        setCounterpartyModalOpen(false);
                                                      }}>
                                                      Submit
                                                    </Button>
                                                  </Col>
                                                </Row>
                                              </Modal>
                                            </Col>
                                            <Col 
                                              style={{
                                                width: "75%",
                                              }}>
                                                <Row
                                                  style={{
                                                    height: "100%"
                                                  }}>
                                                  <Button 
                                                    style={{ 
                                                      width: "100%",
                                                      textAlign: "center", 
                                                      backgroundColor: "#FFFFFF", 
                                                      color: "#232323", 
                                                      height: 71,
                                                      borderRadius: 12, 
                                                    }}
                                                    disabled={primaryButtonLoading}
                                                    loading={primaryButtonLoading}
                                                    onClick={() => {
                                                      setPrimaryButtonLoading(true);
                                                      approveContract();
                                                    }}>
                                                    <span
                                                      style={{
                                                        fontSize: 16
                                                      }}>
                                                      Approve Contract
                                                    </span>
                                                  </Button>
                                                </Row>
                                            </Col>
                                          </Row>
                                        )}
                                      </div>
                                    ) : previousPage === "marketplace" ? (
                                      <div className="Minter"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          marginBottom: 20
                                        }}>
                                        {selectedReport.includes("contracts") ? (
                                          <Button 
                                            style={{ 
                                              width: "100%",
                                              textAlign: "center", 
                                              backgroundColor: "#FFFFFF", 
                                              color: "#232323", 
                                              height: 71,
                                              borderRadius: 12, 
                                            }}
                                            disabled={!userRoles.isClient && !userRoles.isDeputy}
                                            loading={portfolioMinting}
                                            onClick={() => {
                                              setPortfolioMinting(true);
                                              mintPortfolio();
                                            }}>
                                            <span
                                              style={{
                                                fontSize: 16
                                              }}>
                                              Mint All Contracts
                                            </span>
                                          </Button>
                                        ) : (
                                          <Button 
                                            style={{ 
                                              width: "100%",
                                              textAlign: "center", 
                                              backgroundColor: "#FFFFFF", 
                                              color: "#232323", 
                                              height: 71,
                                              borderRadius: 12, 
                                            }}
                                            disabled={!userRoles.isClient && !userRoles.isDeputy}
                                            loading={primaryButtonLoading}
                                            onClick={() => {
                                              setPrimaryButtonLoading(true);
                                              mintContract();
                                            }}>
                                            <span
                                              style={{
                                                fontSize: 16
                                              }}>
                                              Mint Contract
                                            </span>
                                          </Button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="Evaluator"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          marginBottom: 10
                                        }}>
                                        {selectedReport.includes("contracts") ? (
                                          <div>
                                            <Row>
                                              <Col span={8}
                                                style={{
                                                  textAlign: "left"
                                                }}>
                                                <Button 
                                                  style={{ 
                                                    width: "95%",
                                                    textAlign: "center", 
                                                    backgroundColor: "#FFFFFF", 
                                                    color: "#232323", 
                                                    height: 71,
                                                    borderRadius: 12, 
                                                  }}
                                                  loading={portfolioPrimaryButtonLoading}
                                                  onClick={() => {
                                                    setPortfolioPrimaryButtonLoading(true);
                                                    evaluatePortfolio();
                                                  }}>
                                                  <span
                                                    style={{
                                                      fontSize: 16
                                                    }}>
                                                    Evaluate All
                                                  </span>
                                                </Button>
                                              </Col>
                                              <Col span={8}>
                                                <Button 
                                                  style={{ 
                                                    width: "95%",
                                                    textAlign: "center", 
                                                    backgroundColor: "#FFFFFF", 
                                                    color: "#232323", 
                                                    height: 71,
                                                    borderRadius: 12, 
                                                  }}
                                                  disabled={!userRoles.isClient && !userRoles.isDeputy}
                                                  loading={portfolioSecondButtonLoading}
                                                  onClick={() => {
                                                    setPortfolioSecondButtonLoading(true);
                                                    disputePortfolio();
                                                  }}>
                                                  <span
                                                    style={{
                                                      fontSize: 16
                                                    }}>
                                                    Dispute All
                                                  </span>
                                                </Button>
                                              </Col>
                                              <Col span={8}
                                                style={{
                                                  textAlign: "right"
                                                }}>
                                                <Button 
                                                  style={{ 
                                                    width: "95%",
                                                    textAlign: "center", 
                                                    backgroundColor: "#FFFFFF", 
                                                    color: "#232323", 
                                                    height: 71,
                                                    borderRadius: 12, 
                                                  }}
                                                  disabled={!userRoles.isClient && !userRoles.isDeputy}
                                                  loading={portfolioThirdButtonLoading}
                                                  onClick={() => {
                                                    setPortfolioThirdButtonLoading(true);
                                                    settlePortfolio();
                                                  }}>
                                                  <span
                                                    style={{
                                                      fontSize: 16
                                                    }}>
                                                    Settle All
                                                  </span>
                                                </Button>
                                              </Col>
                                            </Row>
                                          </div>
                                        ) : (
                                          <div>
                                            <Row justify="space-between">
                                              <Col span={8}
                                                style={{
                                                  textAlign: "left"
                                                }}>
                                                <Button 
                                                  style={{ 
                                                    width: "95%",
                                                    textAlign: "center", 
                                                    backgroundColor: "#FFFFFF", 
                                                    color: "#232323", 
                                                    height: 71,
                                                    borderRadius: 12, 
                                                  }}
                                                  disabled={
                                                    liveEvaluationStatus !== "Awaiting Evaluation" 
                                                    && liveEvaluationStatus !== "Evaluation Disputed"
                                                  }
                                                  loading={primaryButtonLoading}
                                                  onClick={() => {
                                                    setPrimaryButtonLoading(true);
                                                    evaluateContract();
                                                  }}>
                                                  <span
                                                    style={{
                                                      fontSize: 16
                                                    }}>
                                                    Evaluate
                                                  </span>
                                                </Button>
                                              </Col>
                                              <Col span={8}>
                                                <Button 
                                                  style={{ 
                                                    width: "95%",
                                                    textAlign: "center", 
                                                    backgroundColor: "#FFFFFF", 
                                                    color: "#232323", 
                                                    height: 71,
                                                    borderRadius: 12, 
                                                  }}
                                                  disabled={
                                                    !userRoles.isClient 
                                                    && !userRoles.isDeputy 
                                                    || liveEvaluationStatus !== "Evaluated"
                                                  }
                                                  loading={secondButtonLoading}
                                                  onClick={() => {
                                                    setSecondButtonLoading(true);
                                                    disputeContract();
                                                  }}>
                                                  <span
                                                    style={{
                                                      fontSize: 16
                                                    }}>
                                                    Dispute
                                                  </span>
                                                </Button>
                                              </Col>
                                              <Col span={8}
                                                style={{
                                                  textAlign: "right"
                                                }}>
                                                <Button 
                                                  style={{ 
                                                    width: "95%",
                                                    textAlign: "center", 
                                                    backgroundColor: "#FFFFFF", 
                                                    color: "#232323", 
                                                    height: 71,
                                                    borderRadius: 12, 
                                                  }}
                                                  disabled={
                                                    !userRoles.isClient 
                                                    && !userRoles.isDeputy 
                                                    || liveEvaluationStatus !== "Evaluated"
                                                  }
                                                  loading={thirdButtonLoading}
                                                  onClick={() => {
                                                    setThirdButtonLoading(true);
                                                    settleContract();
                                                  }}>
                                                  <span
                                                    style={{
                                                      fontSize: 16
                                                    }}>
                                                    Settle
                                                  </span>
                                                </Button>
                                              </Col>
                                            </Row>
                                            <Row
                                              style={{
                                                marginTop: 20,
                                                width: "100%", 
                                                textAlign: "left", 
                                              }}>
                                              <Col span={8}>
                                                <p 
                                                  style={{
                                                    color: "#3F5F69",
                                                    marginLeft: 30
                                                  }}>
                                                  Evaluation Status
                                                </p>
                                              </Col>
                                              <Col span={8}>
                                                <p 
                                                  style={{
                                                    color: "#3F5F69",
                                                    marginLeft: 30
                                                  }}>
                                                  Computed Payout
                                                </p>
                                              </Col>
                                            </Row>
                                            <Row 
                                              style={{
                                                textAlign: "left",
                                                color: "#232323"
                                              }}>
                                              <Col span={8}>
                                                <h2
                                                  style={{
                                                    marginLeft: 30
                                                  }}>
                                                  {liveEvaluationStatus}
                                                </h2>
                                              </Col>
                                              <Col span={8}>
                                                <h2
                                                  style={{
                                                    marginLeft: 30
                                                  }}>
                                                  {displayCurrency(liveComputedPayout, true)}
                                                </h2>
                                              </Col>
                                            </Row>
                                            <Row
                                              style={{
                                                paddingLeft: 24,
                                                paddingRight: 24,
                                              }}>
                                              <Divider 
                                                style={{ 
                                                  marginTop: 10, 
                                                  marginBottom: 5, 
                                                  // color: "#909090", 
                                                }}/>
                                            </Row>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </Row>
                                {selectedReport in generatedReports ? (
                                  <div className="Report">
                                    <Row 
                                      style={{
                                        marginBottom: 10
                                      }}>
                                      {selectedReport.includes("contracts") ? (
                                        <Card className="Portfolio Details"
                                          style={{
                                            textAlign: "left", 
                                            padding: 0, 
                                            width: "100%", 
                                            color: "#6F6F6F",
                                            borderRadius: 16
                                          }}>
                                          <Row>
                                            <h2 
                                              style={{
                                                color: "#232323"
                                              }}>
                                              {selectedReport}
                                            </h2>
                                          </Row>
                                          <Row 
                                            style={{ 
                                              height: 16
                                            }}>
                                            <Col span={8}>
                                              <p 
                                                style={{
                                                  color: "#909090"
                                                }}>
                                                Estimated Payout
                                              </p>
                                            </Col>
                                            <Col span={8}>
                                              <p 
                                                style={{
                                                  color: "#909090"
                                                }}>
                                                Capital at Risk
                                              </p>
                                            </Col>
                                            <Col span={8}>
                                              <p 
                                                style={{
                                                  color: "#909090"
                                                }}>
                                                Total Premium
                                              </p>
                                            </Col>
                                          </Row>
                                          <Row 
                                            style={{
                                              color: "#232323"
                                            }}>
                                            <Col span={8}>
                                              <h2>
                                                {displayCurrency(generatedReports[selectedReport].details["Estimated Payout"])}
                                              </h2>
                                            </Col>
                                            <Col span={8}>
                                              <h2>
                                                {generatedReports[selectedReport].details["Capital at risk"]}
                                              </h2>
                                            </Col>
                                            <Col span={8}>
                                              <h2>
                                                {displayCurrency(generatedReports[selectedReport].details["Premium"])}
                                              </h2>
                                            </Col>
                                          </Row>
                                        </Card>
                                      ) : (
                                        <Card className="Details"
                                          style={{
                                            textAlign: "left", 
                                            padding: 0, 
                                            width: "100%", 
                                            color: "#6F6F6F",
                                            borderRadius: 16
                                          }}>
                                          <Row>
                                            <Col span={14} 
                                              style={{
                                                paddingRight: 20
                                              }}>
                                              <Row 
                                                style={{ 
                                                  height: 16
                                                }}>
                                                <p 
                                                  style={{
                                                    color: "#909090"
                                                  }}>
                                                  Contract ID
                                                </p>
                                              </Row>
                                              <Row>
                                                <h2 
                                                  style={{
                                                    color: "#232323"
                                                  }}>
                                                  {selectedReport.slice(0, selectedReport.length-3)}
                                                </h2>
                                              </Row>
                                              <Row 
                                                style={{ 
                                                  height: 16
                                                }}>
                                                <Col span={8}>
                                                  <p 
                                                    style={{
                                                      color: "#909090"
                                                    }}>
                                                    Estimated Payout
                                                  </p>
                                                </Col>
                                                <Col span={8}>
                                                  <p 
                                                    style={{
                                                      color: "#909090"
                                                    }}>
                                                    Capital at risk
                                                  </p>
                                                </Col>
                                                <Col span={8}>
                                                </Col>
                                              </Row>
                                              <Row 
                                                style={{
                                                  color: "#232323"
                                                }}>
                                                <Col span={8}>
                                                  <h2>
                                                    {displayCurrency(generatedReports[selectedReport].details["Estimated Payout"])}
                                                  </h2>
                                                </Col>
                                                <Col span={8}>
                                                  <h2>
                                                    {generatedReports[selectedReport].details["Capital at risk"]}
                                                  </h2>
                                                </Col>
                                                <Col span={8}>
                                                </Col>
                                              </Row>
                                              <Divider 
                                                style={{
                                                  marginTop: 4, 
                                                  color: "#FDFDFD", 
                                                  backgroundColor: 
                                                  "#FFFFFF"
                                                }}/>
                                              <Row>
                                                <h3 
                                                  style={{
                                                    color: "#3F5F69"
                                                  }}>
                                                  Details
                                                </h3>
                                              </Row>
                                              <Row>
                                                <Col span={5} 
                                                  style={{
                                                    color: "#909090"
                                                  }}>
                                                  Start Date
                                                </Col>
                                                <Col span={6} 
                                                  style={{
                                                    color: "#0D2927"
                                                  }}>
                                                  {generatedReports[selectedReport].details["Start Date"]}
                                                </Col>
                                                <Col span={3}>
                                                  <ArrowRightOutlined 
                                                    style={{
                                                      fontSize: 20
                                                    }}/>
                                                </Col>
                                                <Col span={5} 
                                                  style={{
                                                    color: "#909090"
                                                  }}>
                                                  End Date
                                                </Col>
                                                <Col span={5} 
                                                  style={{
                                                    color: "#0D2927"
                                                  }}>
                                                  {generatedReports[selectedReport].details["End Date"]}
                                                </Col>
                                              </Row>
                                              <Divider 
                                                style={{ 
                                                  marginTop: 5, 
                                                  marginBottom: 10, 
                                                  borderColor: "#C1E2E2", 
                                                  backgroundColor: "#FFFFFF"
                                                }}/>
                                              <Row>
                                                <Col span={5} 
                                                  style={{
                                                    color: "#909090"
                                                  }}>
                                                  NFT ID
                                                </Col>
                                                <Col span={19} style={{color: "#0D2927"}}>
                                                  {generatedReports[selectedReport].details["NFT ID"]}
                                                </Col>
                                              </Row>
                                              <Divider 
                                                style={{ 
                                                  marginTop: 5, 
                                                  marginBottom: 10, 
                                                  borderColor: "#C1E2E2", 
                                                  backgroundColor: "#FFFFFF"
                                                }}/>
                                              <Row>
                                                <Col span={5} 
                                                  style={{
                                                    color: "#909090"
                                                  }}>
                                                  Location
                                                </Col>
                                                <Col span={19} 
                                                style={{
                                                  color: "#0D2927"
                                                }}>
                                                  {stringifyCoordinates(generatedReports[selectedReport].details["Location"])}
                                                </Col>
                                              </Row>
                                              <Divider 
                                                style={{ 
                                                  marginTop: 5, 
                                                  marginBottom: 10, 
                                                  borderColor: "#C1E2E2", 
                                                  backgroundColor: "#FFFFFF"
                                                }}/>
                                              <Row>
                                                <Col span={5} 
                                                  style={{
                                                    color: "#909090"
                                                  }}>
                                                  Dataset
                                                </Col>
                                                <Col span={19} 
                                                  style={{
                                                    color: "#0D2927"
                                                  }}>
                                                  {generatedReports[selectedReport].details["Dataset"]}
                                                </Col>
                                              </Row>
                                              <Divider 
                                                style={{ 
                                                  marginTop: 5, 
                                                  marginBottom: 10, 
                                                  borderColor: "#C1E2E2", 
                                                  backgroundColor: "#FFFFFF"
                                                }}/>
                                              <Row>
                                                <Col span={5} 
                                                  style={{
                                                    color: "#909090"
                                                  }}>
                                                  Program
                                                </Col>
                                                <Col span={19} 
                                                  style={{
                                                    color: "#0D2927"
                                                  }}>
                                                  {generatedReports[selectedReport].details["Program"]}
                                                </Col>
                                              </Row>
                                              <Divider 
                                                style={{ 
                                                  marginTop: 5, 
                                                  marginBottom: 10, 
                                                  borderColor: "#C1E2E2", 
                                                  backgroundColor: "#FFFFFF"
                                                }}/>
                                            </Col>
                                            <Col span={10} 
                                              style={{
                                                paddingLeft: 20, 
                                                borderRadius: 16, 
                                                backgroundColor: "#FDFDFD"
                                              }}>
                                                <Row>
                                                  <h2 
                                                    style={{
                                                      color: "#3F5F69", 
                                                      marginTop: 20
                                                    }}>
                                                    Parameters
                                                  </h2>
                                                </Row>
                                                <Row>
                                                  <Col span={3}>
                                                  </Col>
                                                  <Col span={18}>
                                                    <Card className="Parameters"
                                                      style={{
                                                        marginTop: 64, 
                                                        textAlign: "left", 
                                                        padding: 0, 
                                                        width: "100%", 
                                                        color: "#6F6F6F", 
                                                        borderColor: "#FFFFFF", 
                                                        borderRadius: 12, 
                                                        boxShadow: "0px 57px 80px rgba(0, 0, 0, 0.05), 0px 23.8132px 33.4221px rgba(0, 0, 0, 0.0359427), 0px 12.7317px 17.869px rgba(0, 0, 0, 0.0298054), 0px 7.13728px 10.0172px rgba(0, 0, 0, 0.025), 0px 3.79056px 5.32008px rgba(0, 0, 0, 0.0201946), 0px 1.57734px 2.21381px rgba(0, 0, 0, 0.0140573)"
                                                      }}>
                                                      <Row>
                                                        <Col span={10} 
                                                          style={{
                                                            color: "#909090"
                                                          }}>
                                                          Premium
                                                        </Col>
                                                        <Col span={14} 
                                                          style={{
                                                            color: "#0D2927", 
                                                            fontFamily: "Space Mono"
                                                          }}>
                                                          {displayCurrency(generatedReports[selectedReport].details["Premium"])}
                                                        </Col>
                                                      </Row>
                                                      <Divider 
                                                        style={{ 
                                                          marginTop: 5, 
                                                          marginBottom: 10, 
                                                          backgroundColor: "#FFFFFF"
                                                        }}/>
    
                                                      <Row>
                                                        <Col span={10} 
                                                          style={{
                                                            color: "#909090"
                                                          }}>
                                                          Limit
                                                        </Col>
                                                        <Col span={14} 
                                                          style={{
                                                            color: "#0D2927", 
                                                            fontFamily: "Space Mono"
                                                          }}>
                                                          {displayCurrency(generatedReports[selectedReport].details["Limit"])}
                                                        </Col>
                                                      </Row>
                                                      <Divider 
                                                        style={{ 
                                                          marginTop: 5, 
                                                          marginBottom: 10, 
                                                          backgroundColor: "#FFFFFF"
                                                        }}/>
    
                                                      <Row>
                                                        <Col span={10} 
                                                          style={{
                                                            color: "#909090"
                                                          }}>
                                                          Strike
                                                        </Col>
                                                        <Col span={14} 
                                                          style={{
                                                            color: "#0D2927", 
                                                            fontFamily: "Space Mono"
                                                          }}>
                                                          {generatedReports[selectedReport].details["Strike"]}
                                                        </Col>
                                                      </Row>
                                                      <Divider 
                                                        style={{ 
                                                          marginTop: 5, 
                                                          marginBottom: 10, 
                                                          backgroundColor: "#FFFFFF"
                                                        }}/>
    
                                                      <Row>
                                                        <Col span={10} 
                                                          style={{
                                                            color: "#909090"
                                                          }}>
                                                          Tick
                                                        </Col>
                                                        <Col span={14} 
                                                          style={{
                                                            color: "#0D2927", 
                                                            fontFamily: "Space Mono"
                                                          }}>
                                                          {displayCurrency(generatedReports[selectedReport].details["Tick"])}
                                                        </Col>
                                                      </Row>
                                                      <Divider 
                                                        style={{ 
                                                          marginTop: 5, 
                                                          marginBottom: 10, 
                                                          backgroundColor: "#FFFFFF"
                                                        }}/>
                                                      <Row>
                                                        <Col span={10} 
                                                          style={{
                                                            color: "#909090"
                                                          }}>
                                                          Option Type
                                                        </Col>
                                                        <Col span={14} 
                                                          style={{
                                                            color: "#0D2927", 
                                                            fontFamily: "Space Mono"
                                                          }}>
                                                          {generatedReports[selectedReport].details["Option Type"]}
                                                        </Col>
                                                      </Row>
                                                      <Divider 
                                                        style={{ 
                                                          marginTop: 5, 
                                                          marginBottom: 10, 
                                                          backgroundColor: "#FFFFFF"
                                                        }}/>
                                                    </Card>
                                                  </Col>
                                                  <Col span={3}>
                                                  </Col>
                                                </Row>
                                            </Col>
                                          </Row>
                                        </Card>
                                      )}
                                    </Row>
                                    <Row
                                      style={{
                                        marginBottom: 10
                                      }}>
                                      <Col span={12} 
                                        style={{
                                          paddingRight: 5
                                        }}>
                                        <Card className="Premiums & Rates"
                                          style={{
                                            padding: 0, 
                                            textAlign: "left", 
                                            height: "100%", 
                                            width: "100%", 
                                            color: "#6F6F6F", 
                                            borderRadius: 16
                                          }}>
                                          <Row>
                                            <h2 
                                              style={{
                                                color: "#3F5F69"
                                              }}>
                                              {"Premiums & Rates"}
                                            </h2>
                                          </Row>
                                          <Row 
                                            style={{
                                              marginBottom: 10, 
                                              textAlign: "right"
                                            }}>
                                            <Col span={8}>
                                            </Col>
                                            <Col span={4} 
                                              style={{
                                                color: "#909090"
                                              }}>
                                              Premium
                                            </Col>
                                            <Col span={8} 
                                              style={{
                                                color: "#909090"
                                              }}>
                                              Rate
                                            </Col>
                                            <Col span={4}>
                                            </Col>
                                          </Row>
                                          <Row 
                                            style={{
                                              textAlign: "right"
                                            }}>
                                            <Col span={8} 
                                              style={{
                                                color: "#909090", 
                                                textAlign: "left"
                                              }}>
                                              Unloaded
                                            </Col>
                                            <Col span={4} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].premiums["premium"]["Unloaded"]}
                                            </Col>
                                            <Col span={8} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].premiums["rate"]["Unloaded"]}
                                            </Col>
                                            <Col span={4}>
                                            </Col>
                                          </Row>
                                          <Divider 
                                            style={{ 
                                              marginTop: 5, 
                                              marginBottom: 10, 
                                              borderColor: "#C1E2E2",
                                              backgroundColor: "#FFFFFF"
                                            }}/>
                                          <Row 
                                            style={{
                                              textAlign: "right"
                                            }}> 
                                            <Col span={8} 
                                              style={{
                                                color: "#909090", 
                                                textAlign: "left"
                                              }}>
                                              Loaded
                                            </Col>
                                            <Col span={4} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].premiums["premium"]["Loaded"]}
                                            </Col>
                                            <Col span={8} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].premiums["rate"]["Loaded"]}
                                            </Col>
                                            <Col span={4}>
                                            </Col>
                                          </Row>
                                          <Divider 
                                            style={{ 
                                              marginTop: 5, 
                                              marginBottom: 10, 
                                              borderColor: "#C1E2E2", 
                                              backgroundColor: "#FFFFFF"
                                            }}/>
                                          <Row 
                                            style={{
                                              textAlign: "right"
                                            }}>
                                            <Col span={8} 
                                              style={{
                                                color: "#909090", 
                                                textAlign: "left"
                                              }}>
                                              Marginal
                                            </Col>
                                            <Col span={4} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].premiums["premium"]["Portfolio marginal"]}
                                            </Col>
                                            <Col span={8} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].premiums["rate"]["Portfolio marginal"]}
                                            </Col>
                                            <Col span={4}>
                                            </Col>
                                          </Row>
                                          <Divider 
                                            style={{ 
                                              marginTop: 5, 
                                              marginBottom: 10, 
                                              borderColor: "#C1E2E2", 
                                              backgroundColor: "#FFFFFF"
                                            }}/>
                                        </Card>
                                      </Col>
                                      <Col span={12} 
                                        style={{
                                          paddingLeft: 5
                                        }}>
                                        <Card className="Expected Performance"
                                          style={{
                                            padding: 0, 
                                            textAlign: "left", 
                                            width: "100%", 
                                            color: "#6F6F6F", 
                                            borderRadius: 16
                                          }}>
                                          <Row>
                                            <h2 
                                              style={{
                                                color: "#3F5F69", 
                                                marginBottom: 40
                                              }}>
                                              Expected Performance
                                            </h2>
                                          </Row>
                                          <Row>
                                            <Col span={10} 
                                              style={{
                                                color: "#909090"
                                              }}>
                                              Annualized Return
                                            </Col>
                                            <Col span={14} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].performance["Annualized return for full tenor"]}
                                            </Col>
                                          </Row>
                                          <Divider 
                                            style={{ 
                                              marginTop: 5, 
                                              marginBottom: 10, 
                                              borderColor: "#C1E2E2", 
                                              backgroundColor: "#FFFFFF"
                                            }}/>
                                          <Row>
                                            <Col span={10} 
                                              style={{
                                                color: "#909090"
                                              }}>
                                              Portfolio Expected Gain
                                            </Col>
                                            <Col span={14} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].performance["Portfolio Expected Gain"]}
                                            </Col>
                                          </Row>
                                          <Divider 
                                            style={{ 
                                              marginTop: 5, 
                                              marginBottom: 10, 
                                              borderColor: "#C1E2E2", 
                                              backgroundColor: "#FFFFFF"
                                            }}/>
                                          <Row>
                                            <Col span={10} 
                                              style={{
                                                color: "#909090"
                                              }}>
                                              Tenor
                                            </Col>
                                            <Col span={14} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].performance["Tenor"]}
                                            </Col>
                                          </Row>
                                          <Divider 
                                            style={{ 
                                              marginTop: 5, 
                                              marginBottom: 10, 
                                              borderColor: "#C1E2E2", 
                                              backgroundColor: "#FFFFFF"
                                            }}/>
                                          <Row>
                                            <Col span={10} 
                                              style={{
                                                color: "#909090"
                                              }}>
                                              LC Cost
                                            </Col>
                                            <Col span={14} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].performance["LC cost"]}
                                            </Col>
                                          </Row>
                                          <Divider 
                                            style={{ 
                                              marginTop: 5, 
                                              marginBottom: 10, 
                                              borderColor: "#C1E2E2", 
                                              backgroundColor: "#FFFFFF"
                                            }}/>
                                          <Row>
                                            <Col span={10} 
                                              style={{
                                                color: "#909090"
                                              }}>
                                              Collateral
                                            </Col>
                                            <Col span={14} 
                                              style={{
                                                color: "#0D2927", 
                                                fontFamily: "Space Mono"
                                              }}>
                                              {generatedReports[selectedReport].performance["Collateral"]}
                                            </Col>
                                          </Row>
                                          <Divider 
                                            style={{ 
                                              marginTop: 5, 
                                              marginBottom: 10, 
                                              borderColor: "#C1E2E2", 
                                              backgroundColor: "#FFFFFF"
                                            }}/>
                                        </Card>
                                      </Col>
                                    </Row>
                                    <Row 
                                      style={{
                                        marginBottom: 10
                                      }}>
                                      <Card className="Payout Summary"
                                        style={{
                                          padding: 0, 
                                          textAlign: "left", 
                                          width: "100%", 
                                          color: "#6F6F6F",
                                          borderRadius: 16
                                        }}>
                                        <Row>
                                          <h2 
                                            style={{
                                              color: "#3F5F69"
                                            }}>
                                            Payout Summary
                                          </h2>
                                        </Row>
                                        <Row 
                                          style={{
                                            marginBottom: 10, 
                                            textAlign: "right"
                                          }}>
                                          <Col span={6}>
                                          </Col>
                                          <Col span={4} 
                                            style={{
                                              color: "#909090"
                                            }}>
                                            Simulated
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090"
                                            }}>
                                            Historical
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090"
                                            }}>
                                            Final Estimate
                                          </Col>
                                          <Col span={2}>
                                          </Col>
                                        </Row>
                                        <Row 
                                          style={{
                                            textAlign: "right"
                                          }}>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090", 
                                              textAlign: "left"
                                            }}>
                                            Expected Payout
                                          </Col>
                                          <Col span={4} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Expected Payout"].simulated}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Expected Payout"].historical}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Expected Payout"].final}
                                          </Col>
                                          <Col span={2}>
                                          </Col>
                                        </Row>
                                        <Divider 
                                          style={{ 
                                            marginTop: 5, 
                                            marginBottom: 10, 
                                            borderColor: "#C1E2E2", 
                                            backgroundColor: "#FFFFFF"
                                          }}/>
                                        <Row 
                                          style={{
                                            textAlign: "right"
                                          }}>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090", 
                                              textAlign: "left"
                                            }}>
                                            Standard Deviation Payout
                                          </Col>
                                          <Col span={4} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Standard Deviation Payout"].simulated}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Standard Deviation Payout"].historical}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Standard Deviation Payout"].final}
                                          </Col>
                                          <Col span={2}>
                                          </Col>
                                        </Row>
                                        <Divider 
                                          style={{ 
                                            marginTop: 5, 
                                            marginBottom: 10, 
                                            borderColor: "#C1E2E2", 
                                            backgroundColor: "#FFFFFF"
                                          }}/>
                                        <Row 
                                          style={{
                                            textAlign: "right"
                                          }}>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090", 
                                              textAlign: "left"
                                            }}>
                                            Worst 20% Payout Avg.
                                          </Col>
                                          <Col span={4} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 20% Payout Average"].simulated}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 20% Payout Average"].historical}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 20% Payout Average"].final}
                                          </Col>
                                          <Col span={2}>
                                          </Col>
                                        </Row>
                                        <Divider 
                                          style={{ 
                                            marginTop: 5, 
                                            marginBottom: 10, 
                                            borderColor: "#C1E2E2", 
                                            backgroundColor: "#FFFFFF"
                                          }}/>
                                        <Row 
                                          style={{
                                            textAlign: "right"
                                          }}>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090", 
                                              textAlign: "left"
                                            }}>
                                            Worst 10% Payout Avg.
                                          </Col>
                                          <Col span={4} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 10% Payout Average"].simulated}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 10% Payout Average"].historical}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 10% Payout Average"].final}
                                          </Col>
                                          <Col span={2}>
                                          </Col>
                                        </Row>
                                        <Divider 
                                          style={{ 
                                            marginTop: 5, 
                                            marginBottom: 10, 
                                            borderColor: "#C1E2E2", 
                                            backgroundColor: "#FFFFFF"
                                          }}/>
                                        <Row 
                                          style={{
                                            textAlign: "right"
                                          }}>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090", 
                                              textAlign: "left"
                                            }}>
                                            Worst 5% Payout Avg.
                                          </Col>
                                          <Col span={4} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 5% Payout Average"].simulated}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 5% Payout Average"].historical}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 5% Payout Average"].final}
                                          </Col>
                                          <Col span={2}>
                                          </Col>
                                        </Row>
                                        <Divider 
                                          style={{ 
                                            marginTop: 5, 
                                            marginBottom: 10, 
                                            borderColor: "#C1E2E2", 
                                            backgroundColor: "#FFFFFF"
                                          }}/>
                                        <Row 
                                          style={{
                                            textAlign: "right"
                                          }}>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090", 
                                              textAlign: "left"
                                            }}>
                                            Worst 1% Payout Avg.
                                          </Col>
                                          <Col span={4} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 1% Payout Average"].simulated}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 1% Payout Average"].historical}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst 1% Payout Average"].final}
                                          </Col>
                                          <Col span={2}>
                                          </Col>
                                        </Row>
                                        <Divider 
                                          style={{ 
                                            marginTop: 5, 
                                            marginBottom: 10, 
                                            borderColor: "#C1E2E2", 
                                            backgroundColor: "#FFFFFF"
                                          }}/>
                                        <Row 
                                          style={{
                                            textAlign: "right"
                                          }}>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090", 
                                              textAlign: "left"
                                            }}>
                                            Worst Payout
                                          </Col>
                                          <Col span={4} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst Payout"].simulated}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst Payout"].historical}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Worst Payout"].final}
                                          </Col>
                                          <Col span={2}>
                                          </Col>
                                        </Row>
                                        <Divider 
                                          style={{ 
                                            marginTop: 5, 
                                            marginBottom: 10, 
                                            borderColor: "#C1E2E2", 
                                            backgroundColor: "#FFFFFF"
                                          }}/>
                                        <Row 
                                          style={{
                                            textAlign: "right"
                                          }}>
                                          <Col span={6} 
                                            style={{
                                              color: "#909090", 
                                              textAlign: "left"
                                            }}>
                                            Total Limit Loss
                                          </Col>
                                          <Col span={4} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Total Limit Loss"].simulated}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Total Limit Loss"].historical}
                                          </Col>
                                          <Col span={6} 
                                            style={{
                                              color: "#0D2927", 
                                              fontFamily: "Space Mono"
                                            }}>
                                            {generatedReports[selectedReport].summary["Total Limit Loss"].final}
                                          </Col>
                                          <Col span={2}>
                                          </Col>
                                        </Row>
                                        <Divider 
                                          style={{ 
                                            marginTop: 5, 
                                            marginBottom: 10, 
                                            borderColor: "#C1E2E2", 
                                            backgroundColor: "#FFFFFF"
                                          }}/>
                                      </Card>
                                    </Row>
                                  </div>
                                ) : riskError ? (
                                  <div className="Error">
                                    <Row justify="center"
                                      style={{
                                        marginTop: 160
                                      }}>
                                      <FrownOutlined 
                                        style={{
                                          fontSize: 24,
                                          marginTop: 5
                                        }}/>
                                      <h2 
                                        style={{
                                          color: "#3F5F69",
                                          marginLeft: 10,
                                        }}>
                                        Error generating risk report
                                      </h2>
                                    </Row>
                                    <Row justify="center">
                                      <Button 
                                        onClick={() => {
                                          let item;
                                          if (previousPage === "database") {
                                            item = unapprovedContracts[selectedReport];
                                          } else if (previousPage === "marketplace") {
                                            item = availableContracts[selectedReport];
                                          } else {
                                            item = mintedContracts[selectedReport];
                                          }
                                          const contractIDs = {ids: [item.contractID.slice(0, item.contractID.length-3)]};
                                          const data = Object.assign({}, item, contractIDs);
                                          generateContractPage(data);
                                        }} 
                                        style={{
                                          boxShadow: "none", 
                                          backgroundColor: "#FAFAFA", 
                                          borderRadius: 12,
                                          height: "100%",
                                        }}>
                                          Retry
                                      </Button>
                                    </Row>
                                  </div>
                                ) : (
                                  <div className="Loading">
                                    <Row justify="center">
                                      <h2 
                                        style={{
                                          color: "#3F5F69",
                                          marginTop: 80
                                        }}>
                                        Generating Risk Report
                                      </h2>
                                    </Row>
                                    <Row justify="center">
                                      <div className="Spinner">
                                        <img
                                          width={50}
                                          src="/Spinning-Spinner.gif"
                                          alt="Spinner" 
                                        />
                                      </div>
                                    </Row>
                                  </div>
                                )} 
                              </div>
                            ) : (
                              ""
                            )}
                          </div>
                        ) : (
                          <div className="Contract List">
                            <Row justify="space-between"
                              align="middle"
                              style={{
                                marginTop: 50, 
                                marginBottom: 32, 
                              }}>
                              <Col span={8}>
                                <h2 
                                  style={{ 
                                    textAlign: "left", 
                                    color: "#3F5F69", // TODO add info popup
                                  }}>
                                  Welcome,<br/>Here are your contracts 
                                </h2>
                              </Col>
                              <Col span={8}>
                                {userRoles.isAdmin ? (
                                  <Row justify="space-between">
                                    <Col
                                      style={{
                                        textAlign: "right",
                                      }}>
                                      <Button 
                                        onClick={() => {
                                          setCurrentPage("database");
                                        }} 
                                        style={{
                                          boxShadow: "none", 
                                          backgroundColor: "#FAFAFA", 
                                          borderRadius: 12,
                                          border: currentPage === "database" ? 0 : "",
                                          height: "100%",
                                          marginRight: 4,
                                        }}>
                                        <span
                                          style={{
                                            fontSize: 16,
                                            color: currentPage === "database" ? "#3F5F69" : "#6F8A90",
                                            margin: 0
                                          }}>
                                          Unapproved
                                        </span>
                                      </Button>
                                    </Col>
                                    <Col
                                      style={{
                                        textAlign: "right",
                                      }}>
                                      <Button 
                                        onClick={() => {
                                          setCurrentPage("marketplace");
                                        }} 
                                        style={{
                                          boxShadow: "none", 
                                          backgroundColor: "#FAFAFA", 
                                          borderRadius: 12,
                                          border: currentPage === "marketplace" ? 0 : "",
                                          // borderColor: currentPage === "marketplace" ? "#FAFAFA" : "6F8A90",
                                          height: "100%",
                                          marginLeft: 4,
                                          marginRight: 4,
                                        }}>
                                        <span
                                          style={{
                                            fontSize: 16,
                                            color: currentPage === "marketplace" ? "#3F5F69" : "#6F8A90",
                                            margin: 0
                                          }}>
                                          Available
                                        </span>
                                      </Button>
                                    </Col>
                                    <Col
                                      style={{
                                        textAlign: "left",
                                      }}>
                                      <Button 
                                        onClick={() => {
                                          setCurrentPage("dashboard");
                                        }} 
                                        style={{
                                          boxShadow: "none", 
                                          backgroundColor: "#FAFAFA", 
                                          borderRadius: 12,                                      
                                          border: currentPage === "dashboard" ? 0 : "",
                                          height: "100%",
                                          marginLeft: 4,
                                          }}>
                                        <span
                                          style={{
                                            fontSize: 16,
                                            color: currentPage === "dashboard" ? "#3F5F69" : "#6F8A90",
                                            margin: 0
                                          }}>
                                          Owned
                                        </span>
                                      </Button>
                                    </Col>
                                  </Row>
                                ) : (
                                  <Row>
                                    <Col span={11}
                                      style={{
                                        textAlign: "right",
                                      }}>
                                      <Button 
                                        onClick={() => {
                                          setCurrentPage("marketplace");
                                        }} 
                                        style={{
                                          boxShadow: "none", 
                                          backgroundColor: "#FAFAFA", 
                                          borderRadius: 12,
                                          border: currentPage === "marketplace" ? 0 : "",
                                          height: "100%"
                                        }}>
                                        <span
                                          style={{
                                            fontSize: 16,
                                            color: currentPage === "marketplace" ? "#3F5F69" : "#6F8A90",
                                            margin: 0
                                          }}>
                                          Available
                                        </span>
                                      </Button>
                                    </Col>
                                    <Col span={2}
                                      style={{
                                      }}>
                                      <Divider 
                                        type="vertical"
                                        style={{ 
                                          height: "100%",
                                          backgroundColor: "#FAFAFA",
                                          color: "#3F5F69",
                                        }}/>
                                    </Col>

                                    <Col span={11}
                                      style={{
                                        textAlign: "left",
                                      }}>
                                      <Button 
                                        onClick={() => {
                                          setCurrentPage("dashboard");
                                        }} 
                                        style={{
                                          boxShadow: "none", 
                                          backgroundColor: "#FAFAFA", 
                                          borderRadius: 12,                                      
                                          border: currentPage === "dashboard" ? 0 : "",
                                          height: "100%"
                                          }}>
                                        <span
                                          style={{
                                            fontSize: 16,
                                            color: currentPage === "dashboard" ? "#3F5F69" : "#6F8A90",
                                            margin: 0
                                          }}>
                                          Owned
                                        </span>
                                      </Button>
                                    </Col>
                                  </Row>
                                )}
                              </Col>
                              <Col span={8}
                                style={{
                                  textAlign: "right", 
                                }}>
                                <Button 
                                  onClick={() => {
                                    let available = {};
                                    let owned = {};
                                    for (const contractID in availableContracts) {
                                      if (contractID in generatedReports) {
                                        available[contractID] = generatedReports[contractID];
                                      } else {
                                        available[contractID] = availableContracts[contractID];
                                      }
                                    }
                                    for (const contractID in mintedContracts) {
                                      const lifecycleAndPayout = { computedPayout: computedPayouts[contractID].toString(), lifecycle: lifecycleStages[contractID] };
                                      if (contractID in generatedReports) {
                                        const state = Object.assign({}, generatedReports[contractID], lifecycleAndPayout);
                                        owned[contractID] = state;
                                      } else {
                                        const state = Object.assign({}, mintedContracts[contractID], lifecycleAndPayout);
                                        owned[contractID] = state;
                                      }
                                    }
                                    const downloadPackage = JSON.stringify({ available, owned });
                                    const blob = new Blob([downloadPackage], { type: "application/json" });
                                    const href = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = href;
                                    link.download = "arbol_reinsurance_contracts.json";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(href);
                                  }} 
                                  style={{
                                    color: "#232323", 
                                    backgroundColor: "#FFFFFF", 
                                    borderRadius: 12,
                                  }}>
                                  Download All <DownloadOutlined />
                                </Button>
                              </Col>
                            </Row>
                            <Row align="middle"
                              style={{
                                marginBottom: 16
                              }}>
                              <Col span={1}>
                                <SearchOutlined 
                                  style={{ 
                                    color: "#ABB4B3", 
                                    fontSize: 24
                                  }}/>
                              </Col>
                              <Col span={23}>
                                <Input
                                  addonBefore={
                                    <div className="Filter">
                                      <Select 
                                        onChange={(value) => {
                                          setFilterField(value)
                                        }} 
                                        defaultValue={filterField} 
                                        style={{
                                          boxShadow: "none", 
                                          backgroundColor: "FAFAFA"
                                        }}>
                                        <Option value="contractID">{contractListTypes["contractID"]}</Option>
                                        <Option value="premium">{contractListTypes["premium"]}</Option>
                                        <Option value="limit">{contractListTypes["limit"]}</Option>
                                        <Option value="endDate">{contractListTypes["endDate"]}</Option>
                                        <Option value="opt_type">{contractListTypes["opt_type"]}</Option>
                                        <Option value="lifecycleStage">{contractListTypes["lifecycleStage"]}</Option>
                                      </Select>
                                    </div>
                                  }
                                  addonAfter={
                                    <Button 
                                      onClick={() => {
                                        let value = "*";
                                        if (userInput !== "") {
                                          value = userInput;
                                          if (filterField === "contractID") {
                                            value = value + "A=="; // add padding during filter search
                                          }
                                        }
                                        console.log(`Filter ${filterField} on ${value}`);
                                        setFilterValue(value);
                                      }} 
                                      style={{
                                        color: "#232323", 
                                        backgroundColor: "#FAFAFA", 
                                        border: "none"
                                      }}>
                                      Filter <FilterOutlined />
                                    </Button>
                                  }
                                  placeholder={userInput === "" ? "Search" : userInput}
                                  allowClear 
                                  size="large"
                                  onChange={(value) => {
                                    setUserInput(value.target.value);
                                  }}
                                />
                              </Col>
                            </Row>
                            {currentPage === "dashboard" ? (
                              <div className="Dashboard">
                                <Button 
                                  style={{ 
                                    width: "100%",
                                    textAlign: "center", 
                                    color: "#232323", 
                                    height: 71,
                                    padding: 24, 
                                    borderRadius: 12,                                   
                                  }}
                                  disabled={filterContracts(mintedContracts).length === 0}
                                  onClick={() => {
                                    const portfolioID = describePortfolio();
                                    if (portfolioID in generatedReports) {
                                      setPreviousPage(currentPage);
                                      setSelectedReport(portfolioID);
                                      setCurrentPage("risk")
                                    } else {
                                      let ids = [];
                                      let premium = 0;
                                      const filteredMinted = filterContracts(mintedContracts);
                                      for (let i=0; i<filteredMinted.length; i++) {
                                        const contract = filteredMinted[i];
                                        const contractID = contract.contractID;
                                        ids.push(contractID.slice(0, contractID.length-3));
                                        premium += contract.premium;
                                      }
                                      const data = {
                                        contractID:  portfolioID,
                                        premium,
                                        ids,
                                        startDate: "-",
                                        endDate: "-",
                                        uri: "-",
                                        id: "-",
                                        locations: [["-", "-"]],
                                        dataset: "-",
                                        programName: "-",
                                        limit: "-",
                                        strike: "-",
                                        tick: "-",
                                        opt_type: "-",
                                      }
                                      setPreviousPage(currentPage);
                                      setSelectedReport(portfolioID);
                                      setCurrentPage("risk")
                                      generateContractPage(data);
                                    }
                                  }}>
                                  <span
                                    style={{
                                      fontSize: 16,
                                    }}>
                                    Portfolio Summary
                                  </span>
                                </Button>
                                <Row 
                                  style={{
                                    color: "#6F8A90", 
                                    textAlign: "left", 
                                    paddingLeft: 25, 
                                    paddingRight: 25,
                                    marginTop: 25,
                                  }}>
                                  <Col span={6}>
                                    <p>
                                      Contract ID
                                    </p>
                                  </Col>
                                  <Col span={4}>
                                    <p>
                                      Premium
                                    </p>
                                  </Col>
                                  <Col span={4}>
                                    <p>
                                      Limit
                                    </p>
                                  </Col>
                                  <Col span={3}>
                                    <p>
                                      End Date
                                    </p>
                                  </Col>
                                  <Col span={3}>
                                    <p>
                                      Option Type
                                    </p>
                                  </Col>
                                  <Col span={4}>
                                    <p>
                                      Lifecycle Stage
                                    </p>
                                  </Col>
                                </Row>
                                <List 
                                  className="Contracts"
                                  dataSource={filterContracts(mintedContracts)}
                                  locale={{
                                    emptyText: 
                                    <div>
                                      {fetching ? (
                                        <div>
                                          <Row justify="center">
                                            <h2 
                                              style={{
                                                color: "#3F5F69",
                                                marginTop: 80
                                              }}>
                                              Checking Owned Tokens
                                            </h2>
                                          </Row>
                                          <Row justify="center">
                                            <div className="Spinner">
                                              <img
                                                width={50}
                                                src="/Spinning-Spinner.gif"
                                                alt="Spinner" 
                                              />
                                            </div>
                                          </Row>
                                        </div>
                                      ) : (
                                        <h3 
                                          style={{
                                            color: "rgba(0, 0, 0, 0.25)", 
                                            marginTop: 80,
                                          }}>
                                          No Contracts Found
                                        </h3>
                                      )}
                                    </div>
                                  }}
                                  pagination={{
                                    style: {
                                      textAlign: "center", 
                                      paddingTop: 20,
                                      paddingBottom: 20
                                    },
                                    size: "small",
                                    onChange: (page => {
                                      console.log(page);
                                      }
                                    ),
                                  }}
                                  grid={{
                                    column: 1
                                  }}
                                  renderItem={item => (
                                    <div className="Contract">
                                      <List.Item 
                                        style={{
                                          marginTop: 0, 
                                          marginBottom: 8
                                        }}>
                                        <Button 
                                          style={{ 
                                            width: "100%",
                                            textAlign: "left", 
                                            padding: 24, 
                                            backgroundColor: "#FFFFFF", 
                                            color: "#232323", 
                                            height: 71,
                                            border: "1px solid #F3F3F3",
                                            borderRadius: 12, 
                                          }}
                                          onClick={() => {
                                            if (item.contractID in generatedReports) {
                                              setPreviousPage(currentPage);
                                              setSelectedReport(item.contractID);
                                              setCurrentPage("risk")
                                            } else {
                                              const contractIDs = {ids: [item.contractID.slice(0, item.contractID.length-3)]};
                                              const data = Object.assign({}, item, contractIDs);
                                              setPreviousPage(currentPage);
                                              setSelectedReport(item.contractID);
                                              setCurrentPage("risk")
                                              generateContractPage(data);
                                            }
                                          }}>
                                          <Row>
                                            <Col span={6}>
                                              <b>
                                                {item.contractID.toUpperCase().substring(0, item.contractID.length-3)}
                                              </b>
                                            </Col>
                                            <Col span={4}>
                                              <p 
                                                style={{
                                                  fontFamily: "Space Mono"
                                                }}
                                                >
                                                {displayCurrency(item.premium)}
                                              </p>
                                            </Col>
                                            <Col span={4}>
                                              <p 
                                                style={{
                                                  fontFamily: "Space Mono"
                                                }}
                                                >
                                                {displayCurrency(item.limit)}
                                              </p>
                                            </Col>
                                            <Col span={3}>
                                              <p 
                                                style={{
                                                  color: "#8E8E8E"
                                                }}>
                                                {item.endDate}
                                              </p>
                                            </Col>
                                            <Col span={3}>
                                              <p 
                                                style={{
                                                  color: "#8E8E8E"
                                                }}
                                                >
                                                {item.opt_type}
                                              </p>
                                            </Col>
                                            <Col span={4}>
                                              <p 
                                                style={{
                                                  color: "#8E8E8E"
                                                }}
                                                >
                                                {lifecycleStages[item.contractID]}
                                              </p>
                                            </Col>
                                          </Row>
                                        </Button>
                                      </List.Item>
                                    </div>
                                  )}
                                />
                              </div>
                            ) : currentPage === "marketplace" ? (
                              <div className="Marketplace">
                                <Button 
                                  style={{ 
                                    width: "100%",
                                    textAlign: "center", 
                                    color: "#232323", 
                                    height: 71,
                                    padding: 24, 
                                    borderRadius: 12,       
                                  }}
                                  disabled={filterContracts(availableContracts).length === 0}
                                  onClick={() => {
                                    const portfolioID = describePortfolio();
                                    if (portfolioID in generatedReports) {
                                      setPreviousPage(currentPage);
                                      setSelectedReport(portfolioID);
                                      setCurrentPage("risk")
                                    } else {
                                      let ids = [];
                                      let premium = 0;
                                      const filteredAvailable = filterContracts(availableContracts);
                                      for (let i=0; i<filteredAvailable.length; i++) {
                                        const contract = filteredAvailable[i];
                                        const contractID = contract.contractID;
                                        ids.push(contractID.slice(0, contractID.length-3));
                                        premium += contract.premium;
                                      }
                                      const data = {
                                        contractID:  portfolioID,
                                        premium,
                                        ids,
                                        startDate: "-",
                                        endDate: "-",
                                        uri: "-",
                                        id: "-",
                                        locations: [["-", "-"]],
                                        dataset: "-",
                                        programName: "-",
                                        limit: "-",
                                        strike: "-",
                                        tick: "-",
                                        opt_type: "-",
                                      }
                                      setPreviousPage(currentPage);
                                      setSelectedReport(portfolioID);
                                      setCurrentPage("risk")
                                      generateContractPage(data);
                                    }
                                  }}>
                                  <span
                                    style={{
                                      fontSize: 16,
                                    }}>
                                    Portfolio Summary
                                  </span>
                                </Button>
                                <Row 
                                  style={{
                                    color: "#6F8A90", 
                                    textAlign: "left", 
                                    paddingLeft: 25, 
                                    paddingRight: 25,
                                    marginTop: 25,
                                  }}>
                                  <Col span={6}>
                                    <p>
                                      Contract ID
                                    </p>
                                  </Col>
                                  <Col span={4}>
                                    <p>
                                      Premium
                                    </p>
                                  </Col>
                                  <Col span={4}>
                                    <p>
                                      Limit
                                    </p>
                                  </Col>
                                  <Col span={3}>
                                    <p>
                                      End Date
                                    </p>
                                  </Col>
                                  <Col span={3}>
                                    <p>
                                      Option Type
                                    </p>
                                  </Col>
                                  <Col span={4}>
                                    <p>
                                      Lifecycle Stage
                                    </p>
                                  </Col>
                                </Row>
                                <List 
                                  dataSource={filterContracts(availableContracts)}
                                  locale={{
                                    emptyText: 
                                    <div>
                                      {fetching ? (
                                        <div>
                                          <Row justify="center">
                                            <h2 
                                              style={{
                                                color: "#3F5F69",
                                                marginTop: 80
                                              }}>
                                              Fetching Approved Contracts
                                            </h2>
                                          </Row>
                                          <Row justify="center">
                                            <div className="Spinner">
                                              <img
                                                width={50}
                                                src="/Spinning-Spinner.gif"
                                                alt="Spinner" 
                                              />
                                            </div>
                                          </Row>
                                        </div>
                                      ) : (
                                        <h3 
                                          style={{
                                            color: "rgba(0, 0, 0, 0.25)", 
                                            marginTop: 80
                                          }}>
                                          No Contracts Found
                                        </h3>
                                      )}
                                    </div>
                                  }}
                                  pagination={{
                                    style: {
                                      textAlign: "center", 
                                      paddingTop: 20,
                                      paddingBottom: 20
                                    },
                                    size: "small",
                                    onChange: (page => {
                                      console.log(page);
                                      }
                                    ),
                                  }}
                                  grid={{
                                    column: 1
                                  }}
                                  renderItem={item => (
                                    <div className="Contract">
                                      <List.Item 
                                        style={{
                                          marginTop: 0, 
                                          marginBottom: 8
                                        }}>
                                        <Button 
                                          style={{ 
                                            width: "100%",
                                            textAlign: "left", 
                                            padding: 24, 
                                            backgroundColor: "#FFFFFF", 
                                            color: "#232323", 
                                            height: 71,
                                            border: "1px solid #F3F3F3",
                                            borderRadius: 12, 
                                          }}
                                          onClick={() => {
                                            if (item.contractID in generatedReports) {
                                              setPreviousPage(currentPage);
                                              setSelectedReport(item.contractID);
                                              setCurrentPage("risk");
                                            } else {
                                              const contractIDs = {ids: [item.contractID.slice(0, item.contractID.length-3)]};
                                              const data = Object.assign({}, item, contractIDs);
                                              setPreviousPage(currentPage);
                                              setSelectedReport(item.contractID);
                                              setCurrentPage("risk");
                                              generateContractPage(data);
                                            }
                                          }}>
                                          <Row>
                                            <Col span={6}>
                                              <b>
                                                {item.contractID.toUpperCase().substring(0, item.contractID.length-3)}
                                              </b>
                                            </Col>
                                            <Col span={4}>
                                              <p 
                                                style={{
                                                  fontFamily: "Space Mono"
                                                }}
                                                >
                                                {displayCurrency(item.premium)}
                                              </p>
                                            </Col>
                                            <Col span={4}>
                                              <p 
                                                style={{
                                                  fontFamily: "Space Mono"
                                                }}
                                                >
                                                {displayCurrency(item.limit)}
                                              </p>
                                            </Col>
                                            <Col span={3}>
                                              <p 
                                                style={{
                                                  color: "#8E8E8E"
                                                }}>
                                                {item.endDate}
                                              </p>
                                            </Col>
                                            <Col span={3}>
                                              <p 
                                                style={{
                                                  color: "#8E8E8E"
                                                }}
                                                >
                                                {item.opt_type}
                                              </p>
                                            </Col>
                                            <Col span={4}>
                                              <p 
                                                style={{
                                                  color: "#8E8E8E"
                                                }}
                                                >
                                                {lifecycleStages[item.contractID]}
                                              </p>
                                            </Col>
                                          </Row>
                                        </Button>
                                      </List.Item>
                                    </div>
                                  )}
                                />
                              </div>
                            ) : (
                              <div className="Database">
                                <Button 
                                  style={{ 
                                    width: "100%",
                                    textAlign: "center", 
                                    color: "#232323", 
                                    height: 71,
                                    padding: 24, 
                                    borderRadius: 12,       
                                  }}
                                  disabled={filterContracts(unapprovedContracts).length === 0}
                                  onClick={() => {
                                    const portfolioID = describePortfolio();
                                    if (portfolioID in generatedReports) {
                                      setPreviousPage(currentPage);
                                      setSelectedReport(portfolioID);
                                      setCurrentPage("risk");
                                    } else {
                                      let ids = [];
                                      let premium = 0;
                                      const filteredUnapproved = filterContracts(unapprovedContracts);
                                      for (let i=0; i<filteredUnapproved.length; i++) {
                                        const contract = filteredUnapproved[i];
                                        const contractID = contract.contractID;
                                        ids.push(contractID.slice(0, contractID.length-3));
                                        premium += contract.premium;
                                      }
                                      const data = {
                                        contractID:  portfolioID,
                                        premium,
                                        ids,
                                        startDate: "-",
                                        endDate: "-",
                                        uri: "-",
                                        id: "-",
                                        locations: [["-", "-"]],
                                        dataset: "-",
                                        programName: "-",
                                        limit: "-",
                                        strike: "-",
                                        tick: "-",
                                        opt_type: "-",
                                      }
                                      setPreviousPage(currentPage);
                                      setSelectedReport(portfolioID);
                                      setCurrentPage("risk")
                                      generateContractPage(data);
                                    }
                                  }}>
                                  <span
                                    style={{
                                      fontSize: 16,
                                    }}>
                                    Portfolio Summary
                                  </span>
                                </Button>
                                <Row 
                                  style={{
                                    color: "#6F8A90", 
                                    textAlign: "left", 
                                    paddingLeft: 25, 
                                    paddingRight: 25,
                                    marginTop: 25,
                                  }}>
                                  <Col span={6}>
                                    <p>
                                      Contract ID
                                    </p>
                                  </Col>
                                  <Col span={4}>
                                    <p>
                                      Premium
                                    </p>
                                  </Col>
                                  <Col span={4}>
                                    <p>
                                      Limit
                                    </p>
                                  </Col>
                                  <Col span={3}>
                                    <p>
                                      End Date
                                    </p>
                                  </Col>
                                  <Col span={3}>
                                    <p>
                                      Option Type
                                    </p>
                                  </Col>
                                  <Col span={4}>
                                    <p>
                                      Lifecycle Stage
                                    </p>
                                  </Col>
                                </Row>
                                <List 
                                  dataSource={filterContracts(unapprovedContracts)}
                                  locale={{
                                    emptyText: 
                                      <div>
                                        {fetching ? (
                                          <div>
                                            <Row justify="center">
                                              <h2 
                                                style={{
                                                  color: "#3F5F69",
                                                  marginTop: 80
                                                }}>
                                                Fetching Contracts Needing Approval
                                              </h2>
                                            </Row>
                                            <Row justify="center">
                                              <div className="Spinner">
                                                <img
                                                  width={50}
                                                  src="/Spinning-Spinner.gif"
                                                  alt="Spinner" 
                                                />
                                              </div>
                                            </Row>
                                          </div>
                                        ) : (
                                          <h3 
                                            style={{
                                              color: "rgba(0, 0, 0, 0.25)", 
                                              marginTop: 80
                                            }}>
                                            No Contracts Found
                                          </h3>
                                        )}
                                      </div>
                                  }}
                                  pagination={{
                                    style: {
                                      textAlign: "center", 
                                      paddingTop: 20,
                                      paddingBottom: 20
                                    },
                                    size: "small",
                                    onChange: (page => {
                                      console.log(page);
                                      }
                                    ),
                                  }}
                                  grid={{
                                    column: 1
                                  }}
                                  renderItem={item => (
                                    <div className="Contract">
                                      <List.Item 
                                        style={{
                                          marginTop: 0, 
                                          marginBottom: 8
                                        }}>
                                        <Button 
                                          style={{ 
                                            width: "100%",
                                            textAlign: "left", 
                                            padding: 24, 
                                            backgroundColor: "#FFFFFF", 
                                            color: "#232323", 
                                            height: 71,
                                            border: "1px solid #F3F3F3",
                                            borderRadius: 12, 
                                          }}
                                          disabled={selectedReport in approveQueue}
                                          onClick={() => {
                                            if (item.contractID in generatedReports) {
                                              setPreviousPage(currentPage);
                                              setSelectedReport(item.contractID);
                                              setCurrentPage("risk");
                                            } else {
                                              const contractIDs = {ids: [item.contractID.slice(0, item.contractID.length-3)]};
                                              const data = Object.assign({}, item, contractIDs);
                                              setPreviousPage(currentPage);
                                              setSelectedReport(item.contractID);
                                              setCurrentPage("risk")
                                              generateContractPage(data);
                                            }
                                          }}>
                                          <Row>
                                            <Col span={6}>
                                              <b>
                                                {item.contractID.toUpperCase().substring(0, item.contractID.length-3)}
                                              </b>
                                            </Col>
                                            <Col span={4}>
                                              <p 
                                                style={{
                                                  fontFamily: "Space Mono"
                                                }}
                                                >
                                                {displayCurrency(item.premium)}
                                              </p>
                                            </Col>
                                            <Col span={4}>
                                              <p 
                                                style={{
                                                  fontFamily: "Space Mono"
                                                }}
                                                >
                                                {displayCurrency(item.limit)}
                                              </p>
                                            </Col>
                                            <Col span={3}>
                                              <p 
                                                style={{
                                                  color: "#8E8E8E"
                                                }}>
                                                {item.endDate}
                                              </p>
                                            </Col>
                                            <Col span={3}>
                                              <p 
                                                style={{
                                                  color: "#8E8E8E"
                                                }}
                                                >
                                                {item.opt_type}
                                              </p>
                                            </Col>
                                            <Col span={4}>
                                              <p 
                                                style={{
                                                  color: "#8E8E8E"
                                                }}
                                                >
                                                {lifecycleStages[item.contractID]}
                                              </p>
                                            </Col>
                                          </Row>
                                        </Button>
                                      </List.Item>
                                    </div>
                                  )}
                                />
                              </div>
                            )} 
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Col>
              <Col span={4}>
              </Col>
            </Row>
          </div>  
        </Layout.Content>
        <Layout.Footer 
          style={{ 
            height: 72,
            padding: 0, 
            backgroundColor: "#FAFAFA",
          }}>
          <Divider 
            style={{ 
              marginTop: 16, 
              marginBottom: 16, 
              color: "#FDFDFD", 
            }}/>
          <Row>
            <Col span={4}>
            </Col>
            <Col span={16}>
              <Row justify="space-between">
                <Col span={8} 
                  style={{
                    textAlign: "start"
                  }}>
                  <p 
                    style={{
                      color: "#797979",
                      margin: 0
                    }}>
                    Arbol Solutions ©2022
                  </p>
                </Col>
                <Col span={8} 
                  style={{
                    textAlign: "end"
                  }}>
                  <a href="https://www.arbolmarket.com/terms-of-use" target="_blank" rel="noopener noreferrer" 
                    style={{
                      color: "#797979",
                    }}> 
                    Privacy Policy
                  </a>
                </Col>
              </Row>
            </Col>
            <Col span={4}>
            </Col>
          </Row>
        </Layout.Footer>
      </Layout>
    </div>
  );
}

export default App;