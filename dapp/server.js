const cors = require("cors");
const express = require("express");
const Session = require("express-session");

const path = require("path");
const port = process.env.PORT || 3001;
const buildPath = path.join(__dirname, "packages/react-app/build");

const axios = require("axios");
const mongoose = require("mongoose");
const bigInt = require("big-integer");

const EthCrypto = require("eth-crypto");
const { 
  createCipheriv,
  createDecipheriv, 
  randomBytes 
} = require("crypto");
const { ethers } = require("ethers");
const { 
  generateNonce, 
  ErrorTypes, 
  SiweMessage 
} = require("siwe");
const deployedContracts = require("./packages/react-app/src/contracts/hardhat_contracts.json");

const network = "mumbai";
const chainId = 80001;

const deployedContract = deployedContracts[chainId][network].contracts["WeatherRiskNFT"];
const provider = new ethers.providers.JsonRpcProvider(`https://polygon-${network === "matic" || network === "polygon" ? "mainnet" : network}.g.alchemy.com/v2/${process.env.HARDHAT_ALCHEMY_KEY}`, chainId);
const minter = new ethers.Wallet(process.env.HARDHAT_PRIVATE_KEY, provider);
const WeatherRiskNFT = new ethers.Contract(deployedContract.address, deployedContract.abi, minter);

const delay = ms => new Promise(res => setTimeout(res, ms));


function bigIntToBase64String(x) {
  const tokenId = bigInt(x.toString());

  let tokenIdHex = tokenId.toString(16);
  let padding = "";
  for (let i=0; i<26-tokenIdHex.length; i++) {
    // pad hex string if not 26 hex chars
    padding += "0";
  }
  tokenIdHex = padding.concat(tokenIdHex);
  const tokenIdBytes = Buffer.from(tokenIdHex, "hex");
  const contractID = tokenIdBytes.toString("base64");
  return contractID
}


mongoose.connect(process.env.DAPP_MONGO_URL, {
  dbName: "meteor",
  useNewUrlParser: true,
  useUnifiedTopology: true
}, err => err ? console.log(err) : 
  console.log("Connected"));


const SROSchema = new mongoose.Schema({
  __config__: {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    payouts: {
      __config__: {
        index_distribution: {
          __config__: {
            index: {
              __config__: {
                loader: {
                  __config__: Object
                }
              }
            }
          }
        },
        derivative: {
          __config__: {
            limit: {
              type: Number,
              required: true,
            },
            strike: {
              type: Number,
              required: true,
            },
            tick: {
              type: Number,
              required: true,
            },
            opt_type: {
              type: String,
              required: true,
            },
          }
        }
      }
    }
  }
});


const contractSchema = new mongoose.Schema({
  _id: String,
  premium: {
    type: Number,
    required: true,
  },
  start: {
    type: String,
    required: true,
  },
  end: {
    type: String,
    required: true,
  },
  programName: {
    type: String,
    required: true,
  },
  lifecycleStatus: {
    type: String,
    required: true,
  },
  absoluteExhaust: {
    type: Number,
    required: true,
  },
  serializedRiskObject: SROSchema,
}, { collection: "contracts" });
const Contract = mongoose.model("Contract", contractSchema);


const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}))
// SIWE code copied from docs.login.xyz
app.use(Session({
  name: "siwe-quickstart",
  secret: "siwe-quickstart-secret",
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false, sameSite: true }
}));

app.use(express.static(buildPath));


app.get("/nonce", async function (req, res) {
  req.session.nonce = generateNonce();
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(req.session.nonce);
});


app.post("/verify", async function (req, res) {
  try {
    if (!req.body.message) {
      res.status(422).json({ message: "Expected prepareMessage object as body" });
      return;
    }

    let message = new SiweMessage(req.body.message);
    const fields = await message.validate(req.body.signature);
    if (fields.nonce !== req.session.nonce) {
      console.log(req.session);
      res.status(422).json({
          message: `Invalid nonce.`,
      });
      return;
    }
    req.session.siwe = fields;
    req.session.cookie.expires = new Date(fields.expirationTime);
    req.session.save(() => res.status(200).end());
    console.log("User is authenticated");
  } catch (e) {
    req.session.siwe = null;
    req.session.nonce = null;
    console.error(e);
    switch (e) {
      case ErrorTypes.EXPIRED_MESSAGE: {
        req.session.save(() => res.status(440).json({ message: e.message }));
        break;
      }
      case ErrorTypes.INVALID_SIGNATURE: {
        req.session.save(() => res.status(422).json({ message: e.message }));
        break;
      }
      default: {
        req.session.save(() => res.status(500).json({ message: e.message }));
        break;
      }
    }
  }
});


app.post("/mongo", async (req, res) => {
  if (!req.session.siwe) {
    res.status(401).json({ message: "You have to first sign in" });
    return;
  }
  try {
    console.log("Fetching contracts");
    const selector = {
      lifecycleStatus: {
        $in: ["Live Contract", "In Progress", "Awaiting Evaluation"],
      },
      programName: {
        $in: ["GuaRAINteed Program (GRP)"]
      }
    }
    let contracts = {};
    let contract;

    const supply  = await WeatherRiskNFT.totalSupply();
    let mints = [];
    for (let i=0; i<supply; i++) {
      const tokenId = await WeatherRiskNFT.tokenByIndex(i);
      mints.push(tokenId.toString());
    }

    const contractQuery = await Contract.find(selector).exec();
    for (let i=0; i<contractQuery.length; i++) {
      contract = await contractQuery[i].toObject();

      const paddedBase64Id = contract._id + "A==";  // pad and truncate padding on decode
      const hexId = Buffer.from(paddedBase64Id, "base64").toString("hex");
      /* global BigInt */
      const tokenId = bigInt(hexId, 16).toString(10);

      if (mints.includes(tokenId.toString())) {
        // console.log(`token ${tokenId} (contract ${contract._id}) already minted`);
        continue; // skip contract if already minted
      }

      const initialState = await WeatherRiskNFT.tokenStates(tokenId);
      const approved = initialState.startDate.gt(0);
      if (!approved && !req.body.isAdmin) {
        // console.log(`token ${tokenId} (contract ${contract._id}) not approved`);
        continue; // skip contract if not approved (if client is not the admin)
      }
      
      // pass through if 
      //        admin: not minted
      //        client: not minted and approved
      //        deputy: not minted and approved

      const serializedRiskObject = contract.serializedRiskObject.__config__;
      const payouts = serializedRiskObject.payouts.__config__;
      const index_distribution = payouts.index_distribution.__config__;
      const index = index_distribution.index.__config__;
      const loader = index.loader.__config__;
      const derivative = payouts.derivative.__config__;
      const startDate = index.start.replaceAll("/", "-");
      const endDate = index.end.replaceAll("/", "-");
      const programName = contract.programName;

      if (programName.includes("GRP")) {

        let locations = [];
        let dataset;
        let imperial_units;

        if ("loaders" in loader) {
          const loaders = loader.loaders;
          for (let i=0; i++; i<loaders.length) {
            const location = [loaders[i].__config__.lat, loaders[i].__config__.lon];
            locations.push(location);
          }
          dataset = loaders[0].__config__.dataset_name;
          imperial_units = loaders[0].__config__.imperial_units;
        } else {
          locations.push([loader.lat, loader.lon]);
          dataset = loader.dataset_name;
          imperial_units = loader.imperial_units;
        }

        const contractID = bigIntToBase64String(tokenId);

        terms = {
          key: (i+1).toString(),
          id: tokenId,
          approved,
          contractID,
          id: tokenId,
          premium: contract.premium,
          limit: derivative.limit,
          strike: derivative.strike, 
          exhaust: contract.absoluteExhaust,
          tick: derivative.tick,
          opt_type: derivative.opt_type, 
          dataset,
          imperial_units,
          locations,
          lifecycleStage: contract.lifecycleStatus,
          programName: contract.programName,
          computedPayout: 0,
          startDate,
          endDate,
          uri: "PRE-MINT"
        }
        contracts[contractID] = terms;
      }
    }
    console.log(`Format selector ${JSON.stringify(selector)}`);
    console.log(`Returned contracts ${Object.keys(contracts).length}`);
    // also return deputy address
    contracts["deputyAddress"] = minter.address;
    res.send(contracts);
  } catch (e) {
    console.log(e);
    res.send("Something went wrong");
  }
});


app.post("/decrypt", async (req, res) => {
  if (!req.session.siwe) {
    res.status(401).json({ message: "You have to first sign in" });
    return;
  }
  try {
    console.log("Decrypting tokens");

    let decryptions = {};
    for (let i=0; i<req.body.jobs.length; i++) {
      const job = req.body.jobs[i];
      // console.log(job["dappKey"].slice(2))
      // console.log(job["dappKey"])
      const keyEncryption = EthCrypto.cipher.parse(job["dappKey"].slice(2)); // slice "0x" from beginning of stirng before parsing
      const keyPlaintext = await EthCrypto.decryptWithPrivateKey(process.env.DAPP_PRIVATE_KEY, keyEncryption);
      const aesKey = Buffer.from(keyPlaintext, "hex");
    
      const uri = Buffer.from(job["uri"], "base64");
      const iv = uri.slice(0, 32);
      const ciphertext = uri.slice(32, uri.length-16);
      const authTag = uri.slice(uri.length-16, uri.length);
      const decipher = createDecipheriv("aes-256-gcm", aesKey, iv)
      decipher.setAuthTag(authTag);
      const decryption = decipher.update(ciphertext);
      decryptions[job["contractID"]] = JSON.parse(decryption);
    }
    res.send(decryptions);
    console.log("Decrypted")
  } catch (e) {
    console.log(e);
    res.send("Something went wrong");
  }
});


app.post("/risk", async (req, res) => {
  if (!req.session.siwe) {
    res.status(401).json({ message: "You have to first sign in" });
    return;
  }
  try {
    console.log("Generating reports");

    let headers = {
      "Authorization": process.env.DAPP_RISK_KEY,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
    delete headers.cookie;
    const url = process.env.DAPP_RISK_API+"/report/summary";

    let ready = false;
    let data = {};
    let waitTime = 10 * 1000;
    if (req.body.ids.length > 1) {
      console.log(req.body);
      waitTime = 30*1000;
    }
    while (!ready) {
      const result = await axios.post(url, req.body, {headers: headers});
      console.log("ready: ", result.data.ready);
      ready = result.data.ready;
      data = result.data;
      if (!ready) { 
        console.log(`waiting ${waitTime / 1000} seconds`);
        await delay(waitTime);
        console.log("retrying");
      }
    }
    console.log("data: ", data);
    res.send(data);
  } catch (e) {
    console.log(e);
    res.send("Something went wrong");
  }
});

app.post("/approve", async (req, res) => {
  try {
    // generate one-time AES access key and encrypt with public keys of node, dapp server, and token receiver
    let aesKey = randomBytes(32);
    const encryptionConfig = await WeatherRiskNFT.encryptionConfig();

    const nodePublicKey = Buffer.from(encryptionConfig.nodePublicKey.slice(2), "hex");
    const dappPublicKey = Buffer.from(encryptionConfig.dappPublicKey.slice(2), "hex");

    const nodeCipher = await EthCrypto.encryptWithPublicKey(nodePublicKey, aesKey.toString("hex"));
    const nodeKey = Buffer.from(EthCrypto.cipher.stringify(nodeCipher), "hex");

    const dappCipher = await EthCrypto.encryptWithPublicKey(dappPublicKey, aesKey.toString("hex"));
    const dappKey = Buffer.from(EthCrypto.cipher.stringify(dappCipher), "hex");

    const startDate = new Date(req.body.contract.startDate).getTime() / 1000;
    const endDate = new Date(req.body.contract.endDate).getTime() / 1000;

    const tokenState = [
      req.body.counterparty,
      parseInt(req.body.contract.premium * 100),
      startDate,
      endDate,
      req.body.contract.programName,
      nodeKey, 
      dappKey
    ];

    if (req.body.deputyApprove) {
      console.log("Pre-Minting");
      tx = await WeatherRiskNFT.preMint(req.body.contract.id, tokenState);
      await tx.wait();
      res.send({ approveStatus: true });
    } else {
      res.send({ tokenState });
    }
  } catch (e) {
    console.log(e);
    if (req.body.deputyApprove) {
      res.send({ approveStatus: false, error: e });
    } else {
      res.send({ error: e });
    }
  }
});

app.post("/mint", async (req, res) => {
  try {
    console.log("Preparing to mint contract as NFT");
    const programName = req.body.contract.programName;

    let confidential;

    if (programName.includes("GRP")) {

      confidential = {
        "premium": req.body.contract.premium,
        "limit": req.body.contract.limit,
        "strike": req.body.contract.strike, 
        "exhaust": req.body.contract.exhaust,
        "tick": req.body.contract.tick,
        "opt_type": req.body.contract.opt_type, 
        "dataset": req.body.contract.dataset,
        "imperial_units": req.body.contract.imperial_units,
        "locations": req.body.contract.locations
      }
    }

    // retrieve encrypted AES key for viewer encryption
    const tokenState = await WeatherRiskNFT.tokenStates(req.body.contract.id);
    const keyEncryption = EthCrypto.cipher.parse(tokenState.dappKey.slice(2)); // slice "0x" from beginning of stirng before parsing
    const keyPlaintext = await EthCrypto.decryptWithPrivateKey(process.env.DAPP_PRIVATE_KEY, keyEncryption);
    const aesKey = Buffer.from(keyPlaintext, "hex");

    const viewerCipher = await EthCrypto.encryptWithPublicKey(req.body.publicKey, aesKey.toString("hex"));
    const viewerKey = Buffer.from(EthCrypto.cipher.stringify(viewerCipher), "hex");
    // encrypt confidential terms with access key
    let iv = randomBytes(32);
    let cipher = createCipheriv("aes-256-gcm", aesKey, iv);
    let ciphertext = Buffer.concat([cipher.update(JSON.stringify(confidential), "utf8"), cipher.final()]);
    let authTag = cipher.getAuthTag();
    let uri = Buffer.concat([iv, ciphertext, authTag]).toString("base64");
    if (req.body.deputyMint) {
      console.log("Minting...")
      tx = await WeatherRiskNFT.mint(req.body.contract.id, uri, viewerKey);
      await tx.wait();
      res.send({ mintStatus: true });
    } else {
      res.send({ uri, viewerKey })
    }
  } catch (e) {
    console.log(e);
    if (req.body.deputyMint) {
      res.send({ mintStatus: false, error: e})
    } else {
      res.send({ error: e });
    }
  }
});

app.post("/evaluate", async (req, res) => {
  try {
    console.log("Evaluating contract");
    let tx = await WeatherRiskNFT.requestEvaluation(req.body.tokenId);
    await tx.wait();
    console.log("success");
    res.send({ evaluateStatus: true });
  } catch (e) {
    console.log(e);
    res.send({ evaluateStatus: false, error: e})
  }
});

app.post("/dispute", async (req, res) => {
  try {
    console.log("Disputing evaluation");
    let tx = await WeatherRiskNFT.disputeEvaluation(req.body.tokenId);
    await tx.wait();
    console.log("success");
    res.send({ disputeStatus: true });
  } catch (e) {
    console.log(e);
    res.send({ disputeStatus: false, error: e})
  }
});

app.post("/settle", async (req, res) => {
  try {
    console.log("Settling contract");
    let tx = await WeatherRiskNFT.settleContract(req.body.tokenId);
    await tx.wait();
    console.log("success");
    res.send({ settlementStatus: true });
  } catch (e) {
    console.log(e);
    res.send({ settlementStatus: false, error: e})
  }
});

app.listen(port, () => {
  console.log
});