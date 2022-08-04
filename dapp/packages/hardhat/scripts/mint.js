const deployedContracts = require("../../react-app/src/contracts/hardhat_contracts.json");
const mongoose = require("mongoose");
// const axios = require('axios');
const bigInt = require("big-integer");
const { ethers } = require("hardhat");
const EthCrypto = require("eth-crypto");
const { 
  createCipheriv, 
  // createDecipheriv, 
  randomBytes 
} = require("crypto");


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
  serializedRiskObject: SROSchema,
}, { collection: "contracts" });
const Contract = mongoose.model("Contract", contractSchema);


const publicKeys = {
  "0x31d04A8811f12CCA552406bc0101AD6d1Fba7192": "",   // viewer
  "0x69640770407A09B166AED26B778699045B304768": "02012dc774b33c34f5bd9d22aadc5599b1d46f414637023972be75ddc184f1b676", // test viewer
  "0x4506F70e253DEccCC1a419954606cB3D1E6a9a70": "03cc7d57c51fe62090ddc345e0358cc820e9359e7e0f9b4cfb1df84a498c46e7f8",   // Chainlink Rinkeby Node 1
  "0xAe76Be2fbCca75B039e42DEDDE12dd305f9FCdCe": "026d93aec02db1f0cc8c69da667ba935c6618b6137bfecf9bdee2b044a44751a74"    // dApp Server
}

const ids = [           // GRP contracts
  "9DvyDBBZGrKAvbnMj", 
  // "J7mYjdsBcqvXtpsg2",
  // "zHP5GKGDgaT4Ht3Hf",
];

// const viewer = "0x31d04A8811f12CCA552406bc0101AD6d1Fba7192";
const viewer = "0x69640770407A09B166AED26B778699045B304768"
const node = "0x4506F70e253DEccCC1a419954606cB3D1E6a9a70";
const dapp = "0xAe76Be2fbCca75B039e42DEDDE12dd305f9FCdCe";


async function main() {
  try {

    console.log("minting");
    const contractQuery = await Contract.find({_id: {"$in": ids}}).exec();

    // const results = [];
    let contract;
    for (let i=0; i<contractQuery.length; i++) {
      contract = JSON.parse(JSON.stringify(contractQuery[i]));

      const paddedBase64Id = contract._id + "A==";  // pad and truncate padding on decode
      const hexId = Buffer.from(paddedBase64Id, "base64").toString("hex");
      /* global BigInt */
      const tokenId = bigInt(hexId, 16).toString(10);

      const serializedRiskObject = JSON.parse(JSON.stringify(contract.serializedRiskObject.__config__));
      const payouts = serializedRiskObject.payouts.__config__;
      const index_distribution = payouts.index_distribution.__config__;
      const index = index_distribution.index.__config__;
      const loader = index.loader.__config__;
      const derivative = payouts.derivative.__config__;

      const startDate = new Date(index.start).getTime() / 1000;
      const endDate = new Date(index.end).getTime() / 1000;
      const programName = contract.programName;

      let confidential;

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

        confidential = {
          "premium": contract.premium,
          "limit": derivative.limit,
          "strike": derivative.strike, 
          "exhaust": contract.absoluteExhaust,
          "tick": derivative.tick,
          "opt_type": derivative.opt_type, 
          "dataset": dataset,
          "imperial_units": imperial_units,
          "locations": locations
        }
      }

      // generate one-time AES access key
      let aesKey = randomBytes(32);
      // console.log("access key: ", aesKey.toString('hex'), aesKey.length);

      const viewerCipher = await EthCrypto.encryptWithPublicKey(publicKeys[viewer], aesKey.toString('hex'));
      const viewerKey = Buffer.from(EthCrypto.cipher.stringify(viewerCipher), 'hex');
      // console.log("nodeKey: ", nodeKey, Buffer.from(nodeKey, 'hex').length);

      const nodeCipher = await EthCrypto.encryptWithPublicKey(publicKeys[node], aesKey.toString('hex'));
      const nodeKey = Buffer.from(EthCrypto.cipher.stringify(nodeCipher), 'hex');
      // console.log("nodeKey: ", nodeKey, Buffer.from(nodeKey, 'hex').length);

      const dappCipher = await EthCrypto.encryptWithPublicKey(publicKeys[dapp], aesKey.toString('hex'));
      const dappKey = Buffer.from(EthCrypto.cipher.stringify(dappCipher), 'hex');
      // console.log("nodeKey: ", nodeKey, Buffer.from(nodeKey, 'hex').length);

      // encrypt confidential terms with access key
      let iv = randomBytes(32);
      let cipher = createCipheriv("aes-256-gcm", aesKey, iv);
      let ciphertext = Buffer.concat([cipher.update(JSON.stringify(confidential), 'utf8'), cipher.final()]);
      let authTag = cipher.getAuthTag();
      let uri = Buffer.concat([iv, ciphertext, authTag]).toString('base64');
      console.log("uri: ", uri);

      // get contract interface and mint NFT
      // const deployedContract = deployedContracts[4]["rinkeby"].contracts["WeatherRiskNFT"];
      const deployedContract = deployedContracts[80001]["mumbai"].contracts["WeatherRiskNFT"];
      const WeatherRiskNFT = await ethers.getContractAt("contracts/WeatherRiskNFT.sol:WeatherRiskNFT", deployedContract.address);
      let tx = await WeatherRiskNFT.mint(viewer, tokenId, uri, viewerKey, nodeKey, dappKey, startDate, endDate, programName);
      await tx.wait();
      
      console.log(tx);

    }
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



      // test decryption of confidential terms and access key
      // const pkey = process.env.DECRYPTION_PRIVATE_KEY;
      // let keyEncryption = EthCrypto.cipher.parse(nodeKey);
      // aesKey = await EthCrypto.decryptWithPrivateKey(pkey, keyEncryption);
      // uri = Buffer.from(uri, 'base64');
      // iv = uri.slice(0, 32);
      // authTag = uri.slice(uri.length-16, uri.length);
      // ciphertext = uri.slice(32, uri.length-16);
      // cipher = createDecipheriv("aes-256-gcm", Buffer.from(aesKey, 'hex'), iv)
      // cipher.setAuthTag(authTag);
      // let decryption = cipher.update(ciphertext)
      // console.log('decryption: ', decryption.toString())

      // test decryption of access key re-encrypted in python
      // const py_results = 'ea98df556bdd57761ae388c6078234aa0353803ac70eae20aa3853d6df196af4935bd572ab50135afabb584c1fba72e4c88b4b681fe5b8601d675da553136bb89135a88d9190f30432861d3691c1871245a05662faf8ac697ba09f76e9b51a37530b0b9a473e72279dab3652ad8654efeecfa3fe7f5925f3e361bb49596d0f97bb6daf01169cce5daa6698a95ef1096620846038dcea4294a6cff964cc76d85826';
      // keyEncryption = EthCrypto.cipher.parse(py_results)
      // decryption = await EthCrypto.decryptWithPrivateKey(pkey, keyEncryption);
      // console.log('python test: ', decryption);


      // const order = serializationOrder.reportOrder.concat(serializationOrder.termsOrder);

      // axios.defaults.baseURL = process.env.RISK_API;
      // axios.defaults.headers.common['Authorization'] = process.env.RISK_KEY;
      // axios.defaults.headers.post['Content-Type'] = 'application/json;charset=UTF-8';


      // const body = {ids: [contract._id], premium: contract.premium};
      // const headers = {
      //   "Accept": "application/json",
      // };
      // let ready = false;
      // let data = {};
      // while (!ready) {
      //   const result = await axios.post('/', body, headers);
      //   console.log("ready: ", result.data.ready);
      //   ready = result.data.ready;
      //   data = result.data;
      //   if (!ready) { 
      //     console.log("waiting");
      //     await delay(10*1000);
      //     console.log("retrying");
      //   }
      // }   

      // let keys = Object.keys(data.result.contracts);
      // delete keys.units;
      // const runID = keys[0];
      // const runIDIndex = order.indexOf("runID");
      // const clientIDIndex = order.indexOf("clientID");
      // const startIndex = order.indexOf("start");
      // const limitIndex = order.indexOf("limit");
      // const datasetIndex = order.indexOf("dataset");
      // const locationsIndex = order.indexOf("locations");

      // let serialData = [];
      // let tag;
      // for (let i = 0; i<order.length; i++) {

      //   tag = order[i];
      //   if (tag.includes("{id}")) {
      //     tag = tag.replace("{id}", runID);
      //   }

      //   if (i < runIDIndex) {
      //     serialData.push(_.get(data.result, tag));
      //   } else if (i < clientIDIndex) {
      //     serialData.push(runID);
      //   } else if (i < startIndex) {
      //     serialData.push(_.get(contract, tag));
      //   } else if (i < limitIndex) {
      //     const _start = _.get(index, tag);
      //     // console.log("start: ", _start);
      //     serialData.push(tag);
      //     serialData.push(_start.replaceAll('/', '-'));
      //   } else if (i < datasetIndex) {
      //     serialData.push(tag);
      //     serialData.push(_.get(derivative, tag));
      //   } else if (i < locationsIndex) {
      //     serialData.push(tag);
      //     serialData.push(_.get(params, tag));
      //   } else {
      //     serialData.push(tag);
      //     let coord;
      //     let locationsBuffer = [];
      //     for (let j=0; j<locations.length; j++) {
      //       coord = locations[j];
      //       locationsBuffer.push(coord)
      //     }
      //     serialData.push(locationsBuffer);
      //   }
      // }
      // console.log(serialData);

      // const clientEncryption = sigUtil.encrypt({
      //   publicKey: encryptionKeys[client],
      //   data: serialDataString,
      //   version: 'x25519-xsalsa20-poly1305',
      // })

      // const providerEncryption = sigUtil.encrypt({
      //   publicKey: encryptionKeys[provider],
      //   data: serialDataString,
      //   version: 'x25519-xsalsa20-poly1305',
      // })

      // const originalEncryption = sigUtil.encrypt({
      //   publicKey: encryptionKeys[node],
      //   data: serialDataString,
      //   version: 'x25519-xsalsa20-poly1305',
      // })

      // console.log(originalEncryption);

      // let external_order = [clientEncryption, providerEncryption, originalEncryption];
      // let internal_order = [
      //   // "version", 
      //   "nonce", 
      //   "ephemPublicKey", 
      //   "ciphertext"
      // ];

      // let packed = []
      // for (let i=0; i<external_order.length; i++) {
      //   for (let j=0; j<internal_order.length; j++) {
      //     packed.push(external_order[i][internal_order[j]]);
      //   }
      // }
      // const originalEncryptedMessage = JSON.stringify(packed.slice(2 * packed.length / 3));

      // const finalEncryptedBuffer = Buffer.from(JSON.stringify(packed));
      // const compressedEncryption = pako.deflate(finalEncryptedBuffer);
      // const uri = Buffer.from(compressedEncryption).toString("base64");

      // console.log("uncompressed unencrypted serialized data size: ", Buffer.from(serialDataString).length);

      // console.log("uncompressed encrypted serialized data size: ", Buffer.from(originalEncryptedMessage).length);
      // console.log("uncompressed encrypted serialized payload size ", finalEncryptedBuffer.length);

      // console.log("compressed encrypted serialized payload size: ", compressedEncryption.length);
      // console.log("compressed encrypted serialized base64 payload length: ", uri.length);

      // console.log(paddedBase64Id, tokenId);

      // let result = {
      //   to: client,
      //   tokenId: tokenId,
      //   uri: uri,
      //   viewerKey: viewerKey,
      //   nodeKey: nodeKey,
      //   dappKey: dappKey,
      //   startDate: startDate,
      //   endDate: endDate,
      //   programName: programName
      // }

      // const tid = await WeatherRiskNFT.tokenByIndex(0);
      // let tx = await WeatherRiskNFT.burn(tid);
      // await tx.wait();


      // console.log(aesKey.length);
      // console.log(bytesToHex(aesKey));
      // console.log(Buffer.from(bytesToHex(aesKey), 'hex').length);
      // encrypt access keys for viewer, node, and dapp server
      // const viewerPublicKey = EthCrypto.publicKey.decompress(Buffer.from(publicKeys[viewer], 'hex'));
      // const viewerCipher = await EthCrypto.encryptWithPublicKey(viewerPublicKey, bytesToHex(aesKey));
      // const viewerKey = EthCrypto.cipher.stringify(viewerCipher);

      // console.log(hexToBytes(publicKeys[node]))
      // console.log(Buffer.from(publicKeys[node], 'hex'))
      // const nodePublicKeyBytes = Buffer.from(publicKeys[node], 'hex');
      // const nodePublicKey = EthCrypto.publicKey.decompress(nodePublicKeyBytes);
      // const nodePublicKey = publicKeys[node];
      // const nodeCipher = await EthCrypto.encryptWithPublicKey(publicKeys[node], bytesToHex(aesKey));


      // modified from https://github.com/bitchan/eccrypto/blob/master/index.js
      // const EC_GROUP_ORDER = Buffer.from('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141', 'hex');
      // const ZERO32 = Buffer.alloc(32, 0);
      
      // function isScalar (x) {
      //   return Buffer.isBuffer(x) && x.length === 32;
      // }

      // function isValidPrivateKey(privateKey) {
      //   if (!isScalar(privateKey))
      //   {
      //     return false;
      //   }
      //   return privateKey.compare(ZERO32) > 0 && // > 0
      //   privateKey.compare(EC_GROUP_ORDER) < 0; // < G
      // }

      // function sha512(msg) {
      //   return crypto.createHash("sha512").update(msg).digest();
      // }

      // function getPublic(privateKey) {
      //   // assert(privateKey.length === 32, "Bad private key");
      //   // assert(isValidPrivateKey(privateKey), "Bad private key");
      //   // See https://github.com/wanderer/secp256k1-node/issues/46
      //   const compressed = secp256k1.publicKeyCreate(privateKey);
      //   return Buffer.from(secp256k1.publicKeyConvert(compressed, false));
      // };

      // function derive(privateKeyA, publicKeyB) {
      //   return new Promise(function(resolve) {
      //     const keyA = ec.keyFromPrivate(privateKeyA);
      //     const keyB = ec.keyFromPublic(publicKeyB);
      //     const Px = keyA.derive(keyB.getPublic());  // BN instance
      //     resolve(Buffer.from(Px.toArray()));
      //   });
      // };

      // function hmacSha256(key, msg) {
      //   return crypto.createHmac("sha256", key).update(msg).digest();
      // }

      // function aes256CbcEncrypt(iv, key, plaintext) {
      //   const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      //   const firstChunk = cipher.update(plaintext);
      //   const secondChunk = cipher.final();
      //   console.log('chunks: ', firstChunk.toString('hex'), secondChunk.toString('hex'));
      //   return Buffer.concat([firstChunk, secondChunk]);
      // }
      
      // function encrypt(publicKeyTo, msg, opts) {
      //   opts = opts || {};
      //   // Tmp variable to save context from flat promises;
      //   let ephemPublicKey;
      //   return new Promise(function(resolve) {
      //     const ephemPrivateKey = opts.ephemPrivateKey || crypto.randomBytes(32);
      //     // There is a very unlikely possibility that it is not a valid key
      //     while(!isValidPrivateKey(ephemPrivateKey))
      //     {
      //       ephemPrivateKey = opts.ephemPrivateKey || crypto.randomBytes(32);
      //     }
      //     // console.info('ephemPrivateKey: ', ephemPrivateKey);
      //     ephemPublicKey = getPublic(ephemPrivateKey);
      //     console.log("ephemeral private key: ", ephemPrivateKey.toString('hex'))
      //     resolve(derive(ephemPrivateKey, publicKeyTo));
      //   }).then(function(Px) {
      //     const hash = sha512(Px);
      //     const iv = opts.iv || crypto.randomBytes(16);
      //     const encryptionKey = hash.slice(0, 32);
      //     const macKey = hash.slice(32);
      //     console.log('shared key: ', encryptionKey.toString('hex'));
      //     const ciphertext = aes256CbcEncrypt(iv, encryptionKey, msg);
      //     const dataToMac = Buffer.concat([iv, ephemPublicKey, ciphertext]);
      //     const mac = Buffer.from(hmacSha256(macKey, dataToMac));
      //     console.log('ciphertext length: ', ciphertext.length);
      //     return {
      //       iv: iv,
      //       ephemPublicKey: ephemPublicKey,
      //       ciphertext: ciphertext,
      //       mac: mac,
      //     };
      //   });
      // };

      // // modified from https://github.com/pubkey/eth-crypto/blob/master/src/encrypt-with-public-key.js
      // function encryptWithPublicKey(publicKey, message, opts) {
      //   const pubString = '04' + publicKey;
      //   return encrypt(
      //     Buffer.from(pubString, 'hex'),
      //     Buffer.from(message),
      //     opts ? opts : {}
      // ).then(encryptedBuffers => {
      //     const encrypted = {
      //         iv: encryptedBuffers.iv.toString('hex'),
      //         ephemPublicKey: encryptedBuffers.ephemPublicKey.toString('hex'),
      //         ciphertext: encryptedBuffers.ciphertext.toString('hex'),
      //         mac: encryptedBuffers.mac.toString('hex'),
      //     };
      //     return encrypted;
      // })};