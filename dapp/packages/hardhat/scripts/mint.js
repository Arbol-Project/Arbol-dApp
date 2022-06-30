const deployedContracts = require("../../react-app/src/contracts/hardhat_contracts.json");
const serializationOrder = require("../../react-app/src/contracts/serialization_order.json");
const pako = require('pako');
const sigUtil = require('@metamask/eth-sig-util');
const mongoose = require("mongoose");
const axios = require('axios');
const bigInt = require("big-integer");
const { ethers } = require("hardhat");


let _ = require("lodash");

const delay = ms => new Promise(res => setTimeout(res, ms));

mongoose.connect(process.env.PROD_MONGO_URL, {
  dbName: "meteor",
  useNewUrlParser: true,
  useUnifiedTopology: true
}, err => err ? console.log(err) : 
  console.log("Connected"));

const IDSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
});

const SROSchema = new mongoose.Schema({
  __config__: IDSchema
});

const contractSchema = new mongoose.Schema({
  _id: String,
  premium: {
    type: Number,
    required: true,
  },
  reinsurerID: {
    type: String,
    required: false,
  },
  clientID: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
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
  finalDatasetRevision: {
    type: String,
    required: true,
  },
  serializedRiskObject: SROSchema,
}, { collection: "contracts" });
const Contract = mongoose.model("Contract", contractSchema);


const encryptionKeys = {"": ""};

const ids = [""];

const client = "";
const provider = "";
const node = "";


const order = serializationOrder.reportOrder.concat(serializationOrder.termsOrder);

axios.defaults.baseURL = process.env.RISK_API;
axios.defaults.headers.common['Authorization'] = process.env.RISK_KEY;
axios.defaults.headers.post['Content-Type'] = 'application/json;charset=UTF-8';

async function main() {
  try {

    console.log("minting");
    const contractQuery = await Contract.find({_id: {"$in": ids}}).exec();

    const results = [];
    let contract;

    for (let i=0; i<contractQuery.length; i++) {
      contract = JSON.parse(JSON.stringify(contractQuery[i]));

      // console.log(contract);

      let locations = [];
      let dataset;
      let imperial_units;

      const serializedRiskObject = JSON.parse(JSON.stringify(contract.serializedRiskObject.__config__));
      const payouts = serializedRiskObject.payouts.__config__;
      const index_distribution = payouts.index_distribution.__config__;
      const index = index_distribution.index.__config__;
      const loader = index.loader.__config__;
      const derivative = payouts.derivative.__config__;

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

      const body = {ids: [contract._id], premium: contract.premium};
      const headers = {
        "Accept": "application/json",
      };
      let ready = false;
      let data = {};
      while (!ready) {
        const result = await axios.post('/', body, headers);
        console.log("ready: ", result.data.ready);
        ready = result.data.ready;
        data = result.data;
        if (!ready) { 
          console.log("waiting");
          await delay(10*1000);
          console.log("retrying");
        }
      }   

      const params = {
        "dataset": dataset,
        "imperial_units": imperial_units
      }

      let keys = Object.keys(data.result.contracts);
      delete keys.units;
      const runID = keys[0];
      const runIDIndex = order.indexOf("runID");
      const clientIDIndex = order.indexOf("clientID");
      const startIndex = order.indexOf("start");
      const limitIndex = order.indexOf("limit");
      const datasetIndex = order.indexOf("dataset");
      const locationsIndex = order.indexOf("locations");

      let serialData = [];
      let tag;
      for (let i = 0; i<order.length; i++) {

        tag = order[i];
        if (tag.includes("{id}")) {
          tag = tag.replace("{id}", runID);
        }

        if (i < runIDIndex) {
          serialData.push(_.get(data.result, tag));
        } else if (i < clientIDIndex) {
          serialData.push(runID);
        } else if (i < startIndex) {
          serialData.push(_.get(contract, tag));
        } else if (i < limitIndex) {
          const _start = _.get(index, tag);
          // console.log("start: ", _start);
          serialData.push(tag);
          serialData.push(_start.replaceAll('/', '-'));
        } else if (i < datasetIndex) {
          serialData.push(tag);
          serialData.push(_.get(derivative, tag));
        } else if (i < locationsIndex) {
          serialData.push(tag);
          serialData.push(_.get(params, tag));
        } else {
          serialData.push(tag);
          let coord;
          let locationsBuffer = [];
          for (let j=0; j<locations.length; j++) {
            coord = locations[j];
            locationsBuffer.push(coord)
          }
          serialData.push(locationsBuffer);
        }
      }
      console.log(serialData);
      const serialDataString = JSON.stringify(serialData, "utf-8");

      const clientEncryption = sigUtil.encrypt({
        publicKey: encryptionKeys[client],
        data: serialDataString,
        version: 'x25519-xsalsa20-poly1305',
      })

      const providerEncryption = sigUtil.encrypt({
        publicKey: encryptionKeys[provider],
        data: serialDataString,
        version: 'x25519-xsalsa20-poly1305',
      })

      const originalEncryption = sigUtil.encrypt({
        publicKey: encryptionKeys[node],
        data: serialDataString,
        version: 'x25519-xsalsa20-poly1305',
      })

      // console.log(originalEncryption);

      let external_order = [clientEncryption, providerEncryption, originalEncryption];
      let internal_order = [
        // "version", 
        "nonce", 
        "ephemPublicKey", 
        "ciphertext"
      ];

      let packed = []
      for (let i=0; i<external_order.length; i++) {
        for (let j=0; j<internal_order.length; j++) {
          packed.push(external_order[i][internal_order[j]]);
        }
      }
      const originalEncryptedMessage = JSON.stringify(packed.slice(2 * packed.length / 3));

      const finalEncryptedBuffer = Buffer.from(JSON.stringify(packed));
      const compressedEncryption = pako.deflate(finalEncryptedBuffer);
      const uri = Buffer.from(compressedEncryption).toString("base64");

      console.log("uncompressed unencrypted serialized data size: ", Buffer.from(serialDataString).length);

      console.log("uncompressed encrypted serialized data size: ", Buffer.from(originalEncryptedMessage).length);
      console.log("uncompressed encrypted serialized payload size ", finalEncryptedBuffer.length);

      console.log("compressed encrypted serialized payload size: ", compressedEncryption.length);
      console.log("compressed encrypted serialized base64 payload length: ", uri.length);

      const endDate = new Date(index.end).getTime() / 1000;

      const paddedBase64Id = contract._id + "A==";  // pad and truncate padding on decode
      const hexId = Buffer.from(paddedBase64Id, "base64").toString("hex");
      /* global BigInt */
      const tokenId = bigInt(hexId, 16).toString(10);
      // console.log(paddedBase64Id, tokenId);

      let result = {
        to: client,
        uri: uri,
        endDate: endDate,
        tokenId: tokenId
      }

      const deployedContract = deployedContracts[4]["rinkeby"].contracts["WeatherRiskNFT"];
      // console.log(deployedContract.address);
      const WeatherRiskNFT = await ethers.getContractAt("contracts/WeatherRiskNFT.sol:WeatherRiskNFT", deployedContract.address);
      let tx = await WeatherRiskNFT.mint(result['to'], result['tokenId'], result['uri'], result['endDate']);
      await tx.wait();
      console.log(tx);
      // const tid = await WeatherRiskNFT.tokenByIndex(0);
      // console.log(tid);
      // let tx = await WeatherRiskNFT.burn(tid);
      // await tx.wait();

      results.push(result);
    }
    // console.log(results)
  } catch (e) {
    console.log(e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
