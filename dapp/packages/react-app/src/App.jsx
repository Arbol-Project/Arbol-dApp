import './App.less';
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
  Select
} from "antd";
import "antd/dist/antd.css";
import {
  // useBalance,
  // useContractLoader,
  // useContractReader,
  useUserProviderAndSigner,
} from "eth-hooks";
// import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
// import { 
//   useLocation 
// } from "react-router-dom";
import {
  Account,
  // Contract,
  Header,
  NetworkDisplay,
  NetworkSwitch,
} from "./components";
import { 
  NETWORKS, 
  // ALCHEMY_KEY,
  // INFURA_ID
} from "./constants";
// import externalContracts from "./contracts/external_contracts";
import deployedContracts from "./contracts/hardhat_contracts.json";
import serializationOrder from "./contracts/serialization_order.json";
import { 
  Web3ModalSetup 
} from "./helpers";
import { useStaticJsonRPC } from "./hooks";
import { LeftOutlined, ArrowRightOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';

import { Contract as ethersContract } from "@ethersproject/contracts";
import Web3 from "web3";

const { ethers } = require("ethers");
const pako = require("pako");
const bigInt = require("big-integer");
const { Option } = Select;


/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.rinkeby; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)
// const initialNetwork = NETWORKS.mainnet;

// 😬 Sorry for all the console logging
// const DEBUG = false;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = false; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "polygon", "rinkeby", "mumbai"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  // const location = useLocation();

  const targetNetwork = NETWORKS[selectedNetwork];
  // console.log(selectedNetwork);

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : initialNetwork.rpcUrl,
  ]);

  const mainnetProvider = null;


  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;
  // const userSigner = injectedProvider.getSigner();

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;


  // const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };


  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));
    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);





  // helpers

  // predefine unit mappings to save on URI space
  const units = serializationOrder.units;
  const order = serializationOrder.reportOrder.concat(serializationOrder.termsOrder);

  function displayCurrency(data) {
    if (data === "-") {
      return data
    }
    if (parseFloat(data) === 0) {
      return "-"
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
    const endDate = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate();
    return endDate;
  }

  function base64StringToBigInt(s) {
    const tokenIdBytes = Buffer.from(s, "base64");
    const tokenIdHex = tokenIdBytes.toString("hex");
    console.log(tokenIdHex);
    const tokenId = bigInt(tokenIdHex, 16);
    return tokenId;
  }

  function bigIntToBase64String(x) {
    const tokenId = bigInt(x.toString());

    let tokenIdHex = tokenId.toString(16);
    if (tokenIdHex.length % 2 !== 0) {
      // pad hex string if not even length
      tokenIdHex = "0" + tokenIdHex;
    }
    const tokenIdBytes = Buffer.from(tokenIdHex, "hex");
    const contractID = tokenIdBytes.toString("base64");
    return contractID
  }

  async function decipherData(account, clientEncryption, tokenId) {
    // Reconstructing the original object outputed by encryption
    console.log("deciphering");
    // rebuild payload with version for Metamask to decrypt
    const payload = {
      version: 'x25519-xsalsa20-poly1305', 
      nonce: clientEncryption[0], 
      ephemPublicKey: clientEncryption[1], 
      ciphertext: clientEncryption[2]
    };
    const decompressedDecryption = await window.ethereum.request({
      method: 'eth_decrypt',
      params: [JSON.stringify(payload), account],
    });
    
    const decryptedData = JSON.parse(decompressedDecryption);
    const runIDIndex = order.indexOf("runID");
    const runID = decryptedData[runIDIndex];
    const data = {"_id": tokenId.toString(64)};

    let tag;
    for (let i=0; i<serializationOrder.reportOrder.length; i++) {
      tag = serializationOrder.reportOrder[i];
      if (tag.includes("{id}")) {
        tag = tag.replace("{id}", runID);
      }
      data[tag] = decryptedData[i];
    }

    let term;
    let value;
    for (let i=0; i<serializationOrder.termsOrder.length; i++) {
      term = serializationOrder.termsOrder[i];
      value = decryptedData[serializationOrder.reportOrder.length + 2 * i + 1];
      data[term] = value;
    }

    return data;
  }


  function refreshViewState(isOwned, isDecrypted, viewer, account, provider) { 
    let status;
    if (viewer === account) {
      if (isDecrypted) {
        status = "Read";
      } else {
        status = "Decrypt";
      }
    } else {
      status = "Re-encrypt";
    }
    if (isOwned) {
      return status;
    } else if (account === provider) {
      if (isDecrypted) {
        status = "Read";
      } else {
        status = "Decrypt";
      }
      status = "Issuer: " + status;
    }
    return status;
  }


  // migrate to netlify/organize github
  // create transfer and reencryption Queues with explicit (and single) update functions
  // put function calls inside trys so they dont crash when they fail (instead display error message)
  // figure out how to get block number on reencryption receipt

  // home dashboard


  const [contractPageActive, setContractPageActive] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  
  const [contractInterface, setContractInterface] = useState();
  const [arbolProvider, setArbolProvider] = useState();

  const [dashboard, setDashboard] = useState();
  const [reportData, setReportData] = useState({});
  const [ownedContracts, setOwnedContracts] = useState([]);

  const [viewStates, setViewStates] = useState({});
  const [decryptedReports, setDecryptedReports] = useState({});
  const [reencryptionQueue, setReencryptionQueue] = useState([]);
  const [blockCounter, setBlockCounter] = useState(0);
  


  useEffect(() => {
    async function getContract() {
      if (selectedChainId == localChainId && userSigner) {
        const deployedContract = deployedContracts[selectedChainId][initialNetwork.name].contracts["WeatherRiskNFT"];
        const contract = new ethersContract(deployedContract.address, deployedContract.abi, userSigner);
        const provider = await contract.ArbolViewer();
        setContractInterface(contract);
        setArbolProvider(provider);
      }
    }
    getContract();
  }, [selectedChainId, injectedProvider, userSigner]);

  const loadDashboard = useCallback(async (contract, injectedProvider, provider) => {
    try {
      const web3 = new Web3(injectedProvider.provider);
      const accounts = await web3.eth.getAccounts();
      const address = accounts[0];
      let isSubscribed = true;
      let tokenIds;
      let owned;
      if (!publicKey) {
        let pubKey = await contract.getPubKey();
        if (Buffer.from(pubKey).length === 0) {
          pubKey = await window.ethereum.request({
            method: 'eth_getEncryptionPublicKey',
            params: [address],
          });
          console.log("storing");
          let tx = await contract.setPubKey(pubKey);
          await tx.wait(); 
        }
        setPublicKey(pubKey);
      }
      if (address === provider) {
        console.log("admin logged in");

        tokenIds =  await contract.enumerateTokenIDs();
        owned = await contract.tokenIDs();
      } else {
        tokenIds = await contract.tokenIDs();
        owned = tokenIds;
      }

      let dataSource = {};
      let views = {...viewStates};
      for (let i = 0; i < tokenIds.length; i++) {
        const endTimestamp = await contract.tokenEndDate(tokenIds[i]);
        const endDate = timestampToDate(endTimestamp);
        const tokenURI = await contract.tokenURI(tokenIds[i]);
        const contractID = bigIntToBase64String(tokenIds[i]);
        const viewer = await contract.tokenViewer(tokenIds[i]);
        
        views[contractID] = refreshViewState(owned.map(x => x.toString()).includes(tokenIds[i].toString()), tokenIds[i] in decryptedReports, viewer, address, provider);
        dataSource[contractID] = {
          key: (i+1).toString(),
          contractID: contractID,
          endDate: endDate,
          uri: tokenURI,
        }
      }

      if (isSubscribed) {
        setViewStates(views);
        setOwnedContracts(owned);
        setDashboard(dataSource);
      };
    } catch (e) {
      console.log(e);
      console.log("Something Went Wrong");
    }
  }, [setDashboard]);

  useEffect(() => {
    if (contractInterface && injectedProvider && arbolProvider) {
      loadDashboard(contractInterface, injectedProvider, arbolProvider);
    }
  }, [contractInterface, injectedProvider, arbolProvider]);



  // risk reports

  async function reencryptContractURI(item, contract) {
    let queue = [...reencryptionQueue];
    queue.push(item.contractID);
    setReencryptionQueue(queue);

    const tokenId = base64StringToBigInt(item.contractID);
    console.log("reencrypting");
    let tx = await contract.requestReencryption(tokenId.value);

    let views = {...viewStates};
    views[item.contractID] = "Re-encrypting";
    setViewStates(views);

    await tx.wait();
};


useEffect(() => {
  async function loadBlock() {
    let views = {...viewStates};
    let queue = [];
    for (let i=0; i<reencryptionQueue.length; i++) {
      const contractID = reencryptionQueue[i];
      if (views[contractID] === "Re-encrypting") {
        const tokenId = base64StringToBigInt(contractID);
        const viewer = await contractInterface.tokenViewer(tokenId.value);
        if (viewer === address) {
          // views[contractID] = refreshViewState(true, false, viewer, address, arbolProvider);
          console.log("would refresh ", contractID);
        }
      } else {
        queue.push(contractID);
      }
    }
    // setViewStates(views);
    // setReencryptionQueue(queue);
  }
  loadBlock();
}, [blockCounter]);


if (contractInterface && injectedProvider && arbolProvider) {
  contractInterface.on("ContractReencrypted", (id, viewer) => {
    let isSubscribed = true;
    const contractID = bigIntToBase64String(id);

    let views = {...viewStates};
    views[contractID] = refreshViewState(true, false, viewer, address, arbolProvider);

    let getBlock = false;
    const contracts = Object.keys(viewStates);
    for (let i=0; i<contracts.length; i++) {
      if (views[contracts[i]] === "Re-encrypting" && contracts[i] !== contractID) {
        getBlock = true;
      }
    }

    if (isSubscribed) {
      setViewStates(views);
      if (getBlock) {
        setBlockCounter(blockCounter + 1);
      }
    }

  });

  contractInterface.on("Transfer", (from, to, id) => {
    const contractID = bigIntToBase64String(id);
    if (from === address) {
      if (address !== arbolProvider) {
        
        let dash = {...dashboard};
        delete dash[contractID];
        setDashboard(dash);
    
        let views = {...viewStates};
        delete views[contractID];
        setViewStates(views);

        let owned = [...ownedContracts].filter(elt => elt !== contractID);
        setOwnedContracts(owned);
      } else {
        if (to !== arbolProvider) {
          let owned = [...ownedContracts].filter(elt => elt !== contractID);
          setOwnedContracts(owned);

          let views = {...viewStates};
          views[contractID] = refreshViewState(false, false, to, address, arbolProvider);
          setViewStates(views);
        }
      }
    }
  });
}



  async function decryptContractPage(item, address, contract) {   
    const tokenId = base64StringToBigInt(item.contractID);
    const viewer = await contract.tokenViewer(tokenId.value);
    let sliceStart;
    let sliceEnd;
    if (address === arbolProvider) {
      sliceStart = (d) => d.length / 3;
      sliceEnd = (d) => 2 * d.length / 3;
    } else {
      sliceStart = (d) => 0;
      sliceEnd = (d) => d.length / 3;
    }
    const tokenURI = await contract.tokenURI(tokenId.value);
    const buf = Buffer.from(tokenURI, 'base64');
    const decompressedEncryption = pako.inflate(buf, { to: 'string' });
    const encryptedJSON = JSON.parse(decompressedEncryption);
    const idx1 = sliceStart(encryptedJSON)
    const idx2 = sliceEnd(encryptedJSON)
    const clientEncryption = encryptedJSON.slice(idx1, idx2);
    // decrypt the URI
    let data = await decipherData(address, clientEncryption, tokenId);
    let reportSources = {contractID: item.contractID};
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
        simulated: displayCurrency(data["payouts.Simulated." + label]),
        historical: displayCurrency(data["payouts.Historical." + label]),
        final: displayCurrency(data["payouts.Final Estimate." + label]),
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
      unit = units["configs.units." + label];
      value = data["configs.Expected Performance." + label];
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
      "Marginal"
    ];
    let premiumSource = {"premium": {}, "rate": {}};
    for (let i = 0; i < premiumLabels.length; i++) {
      label = premiumLabels[i];
      premiumSource.premium[label] = displayCurrency(data["premiums.Premium." + label]);
      premiumSource.rate[label] = setUnit(data["premiums.Rate." + label], units["premiums.Rate.units"]);
    }
    reportSources["premiums"] = premiumSource;
    const runId = data['runID'];

    let detailsSource = {
      "Estimated Payout": displayCurrency(data["contracts." + runId + ".expected_payout"]),
      "Capital at risk": performanceSource["Capital at risk"],
      "Start Date": data.start,
      "End Date": item.endDate,
      "Trade Date": data.tradeDate,
      "NFT URI": item.uri.substring(0, 32) + "...",
      "Client ID": data.clientID,
      "Location": data.locationName,
      "Dataset": data.dataset,
      "Program": data.programName,
      "Premium": displayCurrency(data.premium),
      "Limit": displayCurrency(data.limit),
      "Strike": data.strike,
      "Tick": displayCurrency(data.tick),
      "Option Type": data.opt_type,
    };
    reportSources["details"] = detailsSource;

    setReportData(reportSources);
    setContractPageActive(true);

    let views = {...viewStates};
    views[item.contractID] = refreshViewState(ownedContracts.map(x => x.toString()).includes(tokenId.toString()), true, viewer, address, arbolProvider);
    setViewStates(views);

    let reports = {...decryptedReports};
    reports[item.contractID] = reportSources;
    setDecryptedReports(reports);
  }


  const [filterField, setFilterField] = useState("contractID");
  const [filterValue, setFilterValue] = useState("*");
  const [userInput, setUserInput] = useState("*");

  return (
    <div className="App" style={{ backgroundColor: "#FAFAFA" }} >
      <Layout >
        <Layout.Header style={{ 
          padding: 0, 
          verticalAlign: "middle", 
          backgroundColor: "#FFFFFF", 
          height: "71px",
          position: "fixed",
          width: "100%",
          zIndex: 1,
          borderRadius: "8px",
          }}>
          <Row>
            <Col span={4}>
            </Col>
            <Col span={16}>
              <Row justify="space-between" >
                <Col span={8}>
                  <Header />
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
                  <div style={{ textAlign: "right", verticalAlign: "middle" }}>
                    {USE_NETWORK_SELECTOR && (
                      <div style={{ marginRight: 20 }}>
                        <NetworkSwitch
                          networkOptions={networkOptions}
                          selectedNetwork={selectedNetwork}
                          setSelectedNetwork={setSelectedNetwork}
                        />
                      </div>
                    )}
                    <Account
                      // setReencryptionCounter={setReencryptionCounter}
                      transferrableIDs={ownedContracts}
                      contractInterface={contractInterface}
                      useBurner={USE_BURNER_WALLET}
                      address={address}
                      localProvider={localProvider}
                      mainnetProvider={mainnetProvider}
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
        <Layout.Content style={{ padding: 0, backgroundColor: "#FAFAFA"}}>
          <div>
            {!contractPageActive ? (
              <Row>
                <Col span={4}>
                </Col>
                <Col span={16}>
                    <div>
                      {!dashboard ? (
                        <div style={{height: "782.1px"}}>
                          <Col>
                            <Row>
                              <h2 style={{textAlign: "left", marginTop: 32 + 71, color: "#3F5F69"}}>
                                Arbol dApp NFT Portal
                              </h2>
                            </Row>
                            <Row>
                              <h3 style={{textAlign: "left", color: "#8E8E8E"}}>
                                Connect your Metamask wallet to enter
                              </h3>
                            </Row>
                          </Col>
                          {!injectedProvider ? (
                              ""
                            ) : (
                              <Row
                                justify="center"
                                style={{marginTop: "71px"}}
                                >
                                <div>
                                  <img
                                    width={50}
                                    src="/Spinning-Spinner.gif"
                                    alt="Spinner" 
                                  />
                                </div>
                              </Row>
                            )}
                        </div>
                      ) : (
                        <div>
                      {Object.values(dashboard).length > 0 ? (
                        <div>
                          <h2 style={{ textAlign: "left", marginTop: 32 + 71, marginBottom: 32, color: "#3F5F69" }}>
                            Welcome,<br/>Here are your contracts
                          </h2>
                          <Row>
                            <Col span={1} style={{verticalAlign: "middle"}}>
                              <SearchOutlined style={{ marginTop: "7px", color: "#ABB4B3", fontSize: "24px"}}/>
                            </Col>
                            <Col span={23}>
                              <Input
                                addonBefore={
                                  <div>
                                    <Select 
                                      onChange={(value) => {
                                        setFilterField(value)
                                      }} 
                                      defaultValue="contractID" style={{boxShadow: "none", backgroundColor: "FAFAFA"}}>
                                      <Option value="contractID">Contract ID</Option>
                                      <Option value="endDate">End Date</Option>
                                      <Option value="uri">Token URI</Option>
                                      <Option value="encryption">View Action</Option>
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
                                      setFilterValue(value);
                                    }} 
                                    style={{color: "#232323", backgroundColor: "#FAFAFA", border: "none"}}>
                                    Filter <FilterOutlined />
                                  </Button>
                                }
                                placeholder="Search" 
                                allowClear 
                                size="large"
                                className="dashboardSearch"
                                style={{ marginBottom: 16 }} 
                                onChange={(value) => {
                                  setUserInput(value.target.value);
                                }}
                              />
                            </Col>
                          </Row>

                          <Row style={{
                            color: "#6F8A90", 
                            textAlign: "left", 
                            paddingLeft: 25, 
                            paddingRight: 25,
                            marginTop: 25,
                            // marginBottom: 25
                            }}>
                            <Col span={7}>
                              <p>
                                Contract ID
                              </p>
                            </Col>
                            <Col span={4}>
                              <p>
                                End Date
                              </p>
                            </Col>
                            <Col span={7}>
                              <p>
                                Token URI
                              </p>
                            </Col>
                            <Col span={6}>
                              <p>
                                View Action
                              </p>
                            </Col>
                          </Row>



                          <List 
                            style={{height: "463.96px"}}
                            dataSource={Object.values(dashboard)} 
                            pagination={{
                              style: {"textAlign": "center", paddingTop: 20},
                              size: "small",
                              onChange: (page => {
                                console.log(page);
                                }
                              ),
                              pageSize: 5,
                            }}
                            grid={{
                              column: 1
                            }}
                            renderItem={item => (
                            <div>
                              {item[filterField] === filterValue || filterValue === "*" ? (
                                <List.Item style={{marginTop: 0, marginBottom: 8}}>
                                  <Button style={{ 
                                    width: "100%",
                                    textAlign: "left", 
                                    verticalAlign: "middle", 
                                    padding: 24, 
                                    backgroundColor: "#FFFFFF", 
                                    color: "#232323", 
                                    height: "71px",
                                    border: "1px solid #F3F3F3",
                                    borderRadius: "12px", 
                                  }}
                                    disabled={viewStates[item.contractID] ? viewStates[item.contractID].includes("Re-encrypting") : false}
                                    onClick={() => {
                                      if (viewStates[item.contractID].includes("Read")) {
                                        setReportData(decryptedReports[item.contractID]);
                                        setContractPageActive(true);
                                      } else if (viewStates[item.contractID].includes("Decrypt")) {
                                        decryptContractPage(item, address, contractInterface);
                                      } else if (viewStates[item.contractID] === "Re-encrypt") {
                                        reencryptContractURI(item, contractInterface);
                                      }
                                    }}>
                                    <Row>
                                      <Col span={7}>
                                        <b>
                                          {item.contractID.toUpperCase().substring(0, item.contractID.length-3)}
                                        </b>
                                      </Col>
                                      <Col span={4}>
                                        <p style={{color: "#8E8E8E"}}>
                                          {item.endDate}
                                        </p>
                                      </Col>
                                      <Col span={7}>
                                        <p 
                                          style={{
                                            // color: "#8E8E8E", 
                                          fontFamily: "Space Mono"
                                        }}
                                          >
                                          {item.uri.substring(0, 16) + '...'}
                                        </p>
                                      </Col>
                                      <Col span={6}>
                                        {viewStates[item.contractID] === "Re-encrypting" ? (
                                            <Row
                                            justify="space-between">
                                              <Col span={16}>
                                                <p
                                                style={{
                                                  fontFamily: "Space Mono",
                                                }}>
                                                  {viewStates[item.contractID]}
                                                </p>
                                              </Col>
                                              <Col span={8}
                                                style={{textAlign: "right"}}>
                                                <img
                                                  width={25}
                                                  height={25}
                                                  src="/Spinning-Spinner.gif"
                                                  alt="Spinner" 
                                                />
                                              </Col>
                                            </Row>
                                        ) : (
                                          <p
                                          style={{
                                              fontFamily: "Space Mono",
                                          }}>
                                              {viewStates[item.contractID]}
                                          </p>
                                        )}
                                      </Col>
                                    </Row>
                                  </Button>
                                </List.Item>
                              ) : (
                                ""
                              )}
                            </div>
                            )}
                          />
                        </div>
                      ) : (
                        <div style={{padding: 200, height: "782.1px" }}>
                          <h3 style={{textAlign: "center", color: "#8E8E8E"}}>
                            Not A Contract Holder: Please connect a different wallet or speak with an Arbol Solutions representative.
                          </h3>
                          
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                </Col>
                <Col span={4}>
                </Col>
              </Row>
            ) : (
              <div>
                <Row style={{ marginTop: 16 + 71, marginBottom: 16 }}>
                  <Col span={4}>
                  </Col>
                  <Col span={16}>
                    <Row justify="start">
                      <Col>
                        <Button
                          onClick={() => {
                            setContractPageActive(false);
                          }}
                          size="medium"
                          shape="round"
                          type="text"
                          style={{borderRadius: "8px" }}
                        >
                          <p stlye={{ color: "#3F5F69"}}><LeftOutlined />Contracts</p>
                        </Button>
                      </Col>
                    </Row>
                  </Col>
                  <Col span={4}>
                  </Col>
                </Row>
                    <Row style={{marginBottom: 10}}>
                      <Col span={4}>
                      </Col>
                      <Col span={16}>
                        <Card style={{textAlign: "left", padding: 0, width: "100%", color: "#6F6F6F", borderRadius: "16px"}}>
                          <Row>
                            <Col span={14} style={{paddingRight: 20}}>
                              <Row style={{ height: "16px" }}>
                                <p style={{color: "#909090"}}>
                                  Contract ID
                                </p>
                              </Row>
                              <Row>
                                <h2 style={{color: "#232323"}}>
                                  {reportData.contractID.substring(0, reportData.contractID.length-3)}
                                </h2>
                              </Row>
                              <Row style={{ height: "16px" }}>
                                <Col span={8}>
                                  <p style={{color: "#909090"}}>
                                    Estimated Payout
                                  </p>
                                </Col>
                                <Col span={8}>
                                  <p style={{color: "#909090"}}>
                                    Capital at risk
                                  </p>
                                </Col>
                                <Col span={8}>
                                </Col>
                              </Row>
                              <Row style={{color: "#232323"}}>
                                <Col span={8}>
                                  <h2>
                                    {reportData.details["Estimated Payout"]}
                                  </h2>
                                </Col>
                                <Col span={8}>
                                  <h2>
                                    {reportData.details["Capital at risk"]}
                                  </h2>
                                </Col>
                                <Col span={8}>
                                </Col>
                              </Row>
                              <Divider style={{marginTop: "4px", color: "#FDFDFD", backgroundColor: "#FFFFFF"}}/>
                              
                              <Row>
                                <h3 style={{color: "#3F5F69"}}>
                                  Details
                                </h3>
                              </Row>
                              <Row>
                                <Col span={5} style={{color: "#909090"}}>
                                  Start Date
                                </Col>
                                <Col span={6} style={{color: "#0D2927"}}>
                                  {reportData.details["Start Date"]}
                                </Col>
                                <Col span={3}>
                                  <ArrowRightOutlined style={{fontSize: '20px'}}/>
                                </Col>
                                <Col span={5} style={{color: "#909090"}}>
                                  End Date
                                </Col>
                                <Col span={5} style={{color: "#0D2927"}}>
                                  {reportData.details["End Date"]}
                                </Col>
                              </Row>
                              <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>
                              
                              <Row>
                                <Col span={5} style={{color: "#909090"}}>
                                  Trade Date
                                </Col>
                                <Col span={19} style={{color: "#0D2927"}}>
                                  {reportData.details["Trade Date"]}
                                </Col>
                              </Row>
                              <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                              <Row>
                                <Col span={5} style={{color: "#909090"}}>
                                  NFT URI
                                </Col>
                                <Col span={19} style={{color: "#0D2927"}}>
                                  {reportData.details["NFT URI"]}
                                </Col>
                              </Row>
                              <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                              <Row>
                                <Col span={5} style={{color: "#909090"}}>
                                Client ID
                                </Col>
                                <Col span={19} style={{color: "#0D2927"}}>
                                  {reportData.details["Client ID"]}
                                </Col>
                              </Row>
                              <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                              <Row>
                                <Col span={5} style={{color: "#909090"}}>
                                  Location
                                </Col>
                                <Col span={19} style={{color: "#0D2927"}}>
                                  {reportData.details["Location"]}
                                </Col>
                              </Row>
                              <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                              <Row>
                                <Col span={5} style={{color: "#909090"}}>
                                  Dataset
                                </Col>
                                <Col span={19} style={{color: "#0D2927"}}>
                                  {reportData.details["Dataset"]}
                                </Col>
                              </Row>
                              <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                              <Row>
                                <Col span={5} style={{color: "#909090"}}>
                                  Program
                                </Col>
                                <Col span={19} style={{color: "#0D2927"}}>
                                  {reportData.details["Program"]}
                                </Col>
                              </Row>
                              <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                            </Col>
                            <Col span={10} style={{paddingLeft: 20, borderRadius: "16px", backgroundColor: "#FDFDFD"}}>
                                <Row>
                                  <h2 style={{color: "#3F5F69", marginTop: 20}}>
                                    Parameters
                                  </h2>
                                </Row>

                                <Row>
                                  <Col span={3}>
                                  </Col>
                                  <Col span={18}>
                                    <Card style={{marginTop: "64px", textAlign: "left", padding: 0, width: "100%", color: "#6F6F6F", borderColor: "#FFFFFF", borderRadius: "12px", boxShadow: "0px 57px 80px rgba(0, 0, 0, 0.05), 0px 23.8132px 33.4221px rgba(0, 0, 0, 0.0359427), 0px 12.7317px 17.869px rgba(0, 0, 0, 0.0298054), 0px 7.13728px 10.0172px rgba(0, 0, 0, 0.025), 0px 3.79056px 5.32008px rgba(0, 0, 0, 0.0201946), 0px 1.57734px 2.21381px rgba(0, 0, 0, 0.0140573)"}}>
                                      <Row>
                                        <Col span={10} style={{color: "#909090"}}>
                                          Premium
                                        </Col>
                                        <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                                          {reportData.details["Premium"]}
                                        </Col>
                                      </Row>
                                      <Divider style={{ marginTop: "5px", marginBottom: "10px", backgroundColor: "#FFFFFF"}}/>

                                      <Row>
                                        <Col span={10} style={{color: "#909090"}}>
                                          Limit
                                        </Col>
                                        <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                                          {reportData.details["Limit"]}
                                        </Col>
                                      </Row>
                                      <Divider style={{ marginTop: "5px", marginBottom: "10px", backgroundColor: "#FFFFFF"}}/>

                                      <Row>
                                        <Col span={10} style={{color: "#909090"}}>
                                          Strike
                                        </Col>
                                        <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                                          {reportData.details["Strike"]}
                                        </Col>
                                      </Row>
                                      <Divider style={{ marginTop: "5px", marginBottom: "10px", backgroundColor: "#FFFFFF"}}/>

                                      <Row>
                                        <Col span={10} style={{color: "#909090"}}>
                                          Tick
                                        </Col>
                                        <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                                          {reportData.details["Tick"]}
                                        </Col>
                                      </Row>
                                      <Divider style={{ marginTop: "5px", marginBottom: "10px", backgroundColor: "#FFFFFF"}}/>

                                      <Row>
                                        <Col span={10} style={{color: "#909090"}}>
                                          Option Type
                                        </Col>
                                        <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                                          {reportData.details["Option Type"]}
                                        </Col>
                                      </Row>
                                      <Divider style={{ marginTop: "5px", marginBottom: "10px", backgroundColor: "#FFFFFF"}}/>
                                    </Card>
                                  </Col>
                                  <Col span={3}>
                                  </Col>
                                </Row>
                            </Col>
                          </Row>
                        </Card>

                      </Col>
                      <Col span={4}>
                      </Col>
                    </Row>
                    <Row style={{marginBottom: 10}}>
                      <Col span={4}>
                      </Col>
                      <Col span={8} style={{paddingRight: 5}}>
                        <Card style={{padding: 0, textAlign: "left", height: "100%", width: "100%", color: "#6F6F6F", borderRadius: "16px"}}>
                          <Row>
                            <h2 style={{color: "#3F5F69"}}>
                              {"Premiums & Rates"}
                            </h2>
                          </Row>
                          
                          <Row style={{marginBottom: 10, textAlign: "right"}}>
                            <Col span={8}>
                            </Col>
                            <Col span={4} style={{color: "#909090"}}>
                              Premium
                            </Col>
                            <Col span={8} style={{color: "#909090"}}>
                              Rate
                            </Col>
                            <Col span={4}>
                            </Col>
                          </Row>

                          <Row style={{textAlign: "right"}}>
                            <Col span={8} style={{color: "#909090", textAlign: "left"}}>
                              Unloaded
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.premiums["premium"]["Unloaded"]}
                            </Col>
                            <Col span={8} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.premiums["rate"]["Unloaded"]}
                            </Col>
                            <Col span={4}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row style={{textAlign: "right"}}>
                            <Col span={8} style={{color: "#909090", textAlign: "left"}}>
                              Loaded
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.premiums["premium"]["Loaded"]}
                            </Col>
                            <Col span={8} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.premiums["rate"]["Loaded"]}
                            </Col>
                            <Col span={4}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row style={{textAlign: "right"}}>
                            <Col span={8} style={{color: "#909090", textAlign: "left"}}>
                              Marginal
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.premiums["premium"]["Marginal"]}
                            </Col>
                            <Col span={8} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.premiums["rate"]["Marginal"]}
                            </Col>
                            <Col span={4}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>
                        </Card>
                      </Col>
                      <Col span={8} style={{paddingLeft: 5}}>
                        <Card style={{padding: 0, textAlign: "left", width: "100%", color: "#6F6F6F", borderRadius: "16px"}}>
                          <Row>
                            <h2 style={{color: "#3F5F69", marginBottom: "40px"}}>
                              Expected Performance
                            </h2>
                          </Row>

                          <Row>
                            <Col span={10} style={{color: "#909090"}}>
                              Annualized Return
                            </Col>
                            <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.performance["Annualized return for full tenor"]}
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row>
                            <Col span={10} style={{color: "#909090"}}>
                              Portfolio Expected Gain
                            </Col>
                            <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.performance["Portfolio Expected Gain"]}
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row>
                            <Col span={10} style={{color: "#909090"}}>
                              Tenor
                            </Col>
                            <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.performance["Tenor"]}
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row>
                            <Col span={10} style={{color: "#909090"}}>
                              LC Cost
                            </Col>
                            <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.performance["LC cost"]}
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row>
                            <Col span={10} style={{color: "#909090"}}>
                              Collateral
                            </Col>
                            <Col span={14} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.performance["Collateral"]}
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                        </Card>
                      </Col>
                      <Col span={4}>
                      </Col>
                    </Row>
                    <Row style={{marginBottom: 10}}>
                      <Col span={4}>
                      </Col>
                      <Col span={16}>
                        <Card style={{padding: 0, textAlign: "left", width: "100%", color: "#6F6F6F", borderRadius: "16px"}}>
                          <Row>
                            <h2 style={{color: "#3F5F69"}}>
                              Payout Summary
                            </h2>
                          </Row>

                          <Row style={{marginBottom: 10, textAlign: "right"}}>
                            <Col span={6}>
                            </Col>
                            <Col span={4} style={{color: "#909090"}}>
                              Simulated
                            </Col>
                            <Col span={6} style={{color: "#909090"}}>
                              Historical
                            </Col>
                            <Col span={6} style={{color: "#909090"}}>
                              Final Estimate
                            </Col>
                            <Col span={2}>
                            </Col>
                          </Row>

                          <Row style={{textAlign: "right"}}>
                            <Col span={6} style={{color: "#909090", textAlign: "left"}}>
                              Expected Payout
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Expected Payout"].simulated}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Expected Payout"].historical}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Expected Payout"].final}
                            </Col>
                            <Col span={2}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row style={{textAlign: "right"}}>
                            <Col span={6} style={{color: "#909090", textAlign: "left"}}>
                              Standard Deviation Payout
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Standard Deviation Payout"].simulated}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Standard Deviation Payout"].historical}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Standard Deviation Payout"].final}
                            </Col>
                            <Col span={2}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row style={{textAlign: "right"}}>
                            <Col span={6} style={{color: "#909090", textAlign: "left"}}>
                              Worst 20% Payout Avg.
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 20% Payout Average"].simulated}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 20% Payout Average"].historical}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 20% Payout Average"].final}
                            </Col>
                            <Col span={2}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row style={{textAlign: "right"}}>
                            <Col span={6} style={{color: "#909090", textAlign: "left"}}>
                              Worst 10% Payout Avg.
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 10% Payout Average"].simulated}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 10% Payout Average"].historical}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 10% Payout Average"].final}
                            </Col>
                            <Col span={2}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row style={{textAlign: "right"}}>
                            <Col span={6} style={{color: "#909090", textAlign: "left"}}>
                              Worst 5% Payout Avg.
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 5% Payout Average"].simulated}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 5% Payout Average"].historical}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 5% Payout Average"].final}
                            </Col>
                            <Col span={2}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row style={{textAlign: "right"}}>
                            <Col span={6} style={{color: "#909090", textAlign: "left"}}>
                              Worst 1% Payout Avg.
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 1% Payout Average"].simulated}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 1% Payout Average"].historical}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst 1% Payout Average"].final}
                            </Col>
                            <Col span={2}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row style={{textAlign: "right"}}>
                            <Col span={6} style={{color: "#909090", textAlign: "left"}}>
                              Worst Payout
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst Payout"].simulated}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst Payout"].historical}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Worst Payout"].final}
                            </Col>
                            <Col span={2}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                          <Row style={{textAlign: "right"}}>
                            <Col span={6} style={{color: "#909090", textAlign: "left"}}>
                              Total Limit Loss
                            </Col>
                            <Col span={4} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Total Limit Loss"].simulated}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Total Limit Loss"].historical}
                            </Col>
                            <Col span={6} style={{color: "#0D2927", fontFamily: "Space Mono"}}>
                              {reportData.summary["Total Limit Loss"].final}
                            </Col>
                            <Col span={2}>
                            </Col>
                          </Row>
                          <Divider style={{ marginTop: "5px", marginBottom: "10px", borderColor: "#C1E2E2", backgroundColor: "#FFFFFF"}}/>

                        </Card>
                      </Col>
                      <Col span={4}>
                      </Col>
                    </Row>
              </div>
            )}
          </div>
        </Layout.Content>
        <Layout.Footer style={{ paddingLeft: 0, paddingRight: 0, backgroundColor: "#FAFAFA" }}>
          <Row>
            <Col span={4}>
            </Col>
            <Col span={16}>
              <Divider style={{ marginTop: 32, marginBottom: 32, color: "#FDFDFD", backgroundColor: "#FFFFFF"}}/>
              <Row justify="space-between" >
                <Col span={8} style={{textAlign: "start"}}>
                  <p style={{color: "#797979"}}>
                    Arbol Solutions ©2022
                  </p>
                </Col>
                <Col span={8} style={{textAlign: "end"}}>
                  <a href="https://www.arbolmarket.com/terms-of-use" target="_blank" rel="noopener noreferrer" style={{color: "#797979"}}> 
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
      {/* <Contract
        name="WeatherRiskNFT"
        // price={price}
        signer={userSigner}
        provider={localProvider}
        address={address}
        blockExplorer={blockExplorer}
        contractConfig={contractConfig}
      /> */}
    </div>
  );
}

export default App;