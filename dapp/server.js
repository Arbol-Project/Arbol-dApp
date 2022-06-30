// const pako = require('pako');
// const ethUtil = require('ethereumjs-util');
// const sigUtil = require('@metamask/eth-sig-util');
const path = require("path");
const express = require("express");
const cors = require("cors");
// const mongoose = require("mongoose");
const app = express();
const port = process.env.PORT || 3001;
const buildPath = path.join(__dirname, "packages/react-app/build");
// const axios = require('axios');
// const fs = require('fs');
// const bigInt = require("big-integer");
// const nodemailer = require('nodemailer');

// const tweetnacl = require('tweetnacl');
// const naclUtil = require('tweetnacl-util');

// let _ = require("lodash");

// const delay = ms => new Promise(res => setTimeout(res, ms));

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_SENDER,
//     pass: process.env.EMAIL_APP_PASSWORD
//   }
// });

// const mailOptions = {
//   from: process.env.EMAIL_SENDER,
//   to: process.env.EMAIL_RECEIVER,
//   subject: 'Public Encryption Key Stored',
//   text: 'placeholder'
// };

app.use(express.json());
app.use(cors());
app.use(express.static(buildPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// mongoose.connect(process.env.PROD_MONGO_URL, {
//   dbName: "meteor",
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }, err => err ? console.log(err) : 
//   console.log("Connected"));

// const IDSchema = new mongoose.Schema({
//   id: {
//     type: String,
//     required: true,
//     unique: true,
//   },
// });

// const SROSchema = new mongoose.Schema({
//   __config__: IDSchema
// });

// const contractSchema = new mongoose.Schema({
//   _id: String,
//   premium: {
//     type: Number,
//     required: true,
//   },
//   reinsurerID: {
//     type: String,
//     required: false,
//   },
//   clientID: {
//     type: String,
//     required: false,
//   },
//   createdAt: {
//     type: Date,
//     required: true,
//   },
//   start: {
//     type: String,
//     required: true,
//   },
//   end: {
//     type: String,
//     required: true,
//   },
//   programName: {
//     type: String,
//     required: true,
//   },
//   finalDatasetRevision: {
//     type: String,
//     required: true,
//   },
//   serializedRiskObject: SROSchema,
// }, { collection: "contracts" });
// const Contract = mongoose.model("Contract", contractSchema);

// const encryptionKeys = {
//   "0x690795577B319CA232d2568D68BBA3bB4EE7c839" : "719zGP63ZpxE4vTnQtl6mVh4N943kl0Q76a+rQFY4m0=",

//   "0x31d04A8811f12CCA552406bc0101AD6d1Fba7192" : "8Fbvn34aMs7CVCbxCN22hCA+MjuCNQeJSRMp6xDUyyU=", // client

//   "0x69640770407A09B166AED26B778699045B304768" : "JwOCl9vOQtw8dHsha0R2020D/wxGyAvNdBW/zJ+WBGY=", // test client
//   "0xAe76Be2fbCca75B039e42DEDDE12dd305f9FCdCe" : "QsCZXKNKwTe34I4c55lOW+X4J+BZQzThO958s1IyRxs=",
//   "0x456789ccc3813e8797c4B5C5BAB846ee4A47b0BA" : "lORRDX1xwVI2u26XZImOwMhueV9y+yWQoAX4ShGgD1E=", // minter
//   "0x4506F70e253DEccCC1a419954606cB3D1E6a9a70" : "Dmm+Kbdr3pZbUpxf1j7pfDlavMPogz4OO+rxzC9o6Ck=", // node
// };

// // app.post("/check", async (req, resp) => {
// //   try {
// //     console.log("checking");
// //     const result = req.body.address in encryptionKeys;
// //     const response = {"stored": result, "pubKey": result ? encryptionKeys[req.body.address] : ""};
// //     resp.send(response);
// //   } catch (e) {
// //     console.log(e);
// //     resp.send("Something Went Wrong");
// //   }
// // });

// // app.post("/store", async (req, resp) => {
// //   try {
// //     console.log("storing");
// //     encryptionKeys[req.body.address] = req.body.encKey;
// //     mailOptions.text = "address " + req.body.address + ": encryption key " + req.body.encKey;
// //     transporter.sendMail(mailOptions, function(error, info){
// //       if (error) {
// //         console.log(error);
// //       } else {
// //         console.log('Email sent: ' + info.response);
// //       }
// //     });
// //     resp.send("success");
// //   } catch (e) {
// //     console.log(e);
// //     resp.send("Something Went Wrong");
// //   }
// // });

// // app.post("/mongo", async (req, resp) => {
// //   try {
// //     console.log("querying");
// //     const contractQuery = await Contract.find({_id: {"$in": req.body.ids}}).exec();
// //     const response = {"base": contractQuery};
// //     resp.send(response);    
// //   } catch (e) {
// //     console.log(e);
// //     resp.send("Something Went Wrong");
// //   }
// // });

// // app.post("/risk", async (req, resp) => {
// //   try {
// //     console.log("requesting");
// //     var headers = {
// //       "Authorization": process.env.RISK_KEY,
// //       "accept": "application/json",
// //       "Content-Type": "application/json"
// //     };
// //     headers = {"headers": {...headers, ...req.headers}};
// //     const result = await axios.post(process.env.RISK_API, req.body, headers)
// //     console.log("ready: ", result.data.ready);
// //     resp.send(result.data);
// //   } catch (e) {
// //     console.log(e);
// //     resp.send("Something Went Wrong");
// //   }
// // });




// app.post("/mint", async (req, resp) => {
//   try {
//     console.log("minting");
//     const contractQuery = await Contract.find({_id: {"$in": req.body.ids}}).exec();

//     let headers = {
//       "Authorization": process.env.RISK_KEY,
//       "accept": "application/json",
//       "Content-Type": "application/json"
//     };
//     headers = {"headers": {...headers, ...req.headers}};

//     const results = [];
//     let contract;

//     for (let i=0; i<contractQuery.length; i++) {
//       contract = JSON.parse(JSON.stringify(contractQuery[i]));

//       console.log(contract);

//       let locations = [];
//       let dataset;
//       let imperial_units;

//       let serializedRiskObject = JSON.parse(JSON.stringify(contract.serializedRiskObject.__config__));
//       let payouts = serializedRiskObject.payouts.__config__;
//       let index_distribution = payouts.index_distribution.__config__;
//       let index = index_distribution.index.__config__;
//       let loader = index.loader.__config__;
//       let derivative = payouts.derivative.__config__;

//       if ("loaders" in loader) {
//         const loaders = loader.loaders;
//         for (let i=0; i++; i<loaders.length) {
//           const location = [loaders[i].__config__.lat, loaders[i].__config__.lon];
//           locations.push(location);
//         }
//         dataset = loaders[0].__config__.dataset_name;
//         imperial_units = loaders[0].__config__.imperial_units;
//       } else {
//         locations.push([loader.lat, loader.lon]);
//         dataset = loader.dataset_name;
//         imperial_units = loader.imperial_units;
//       }

//       let body = {ids: [contract._id], premium: contract.premium};
//       let ready = false;
//       let data = {};
//       while (!ready) {
//         const result = await axios.post(process.env.RISK_API, body, headers);
//         console.log("ready: ", result.data.ready);
//         ready = result.data.ready;
//         data = result.data;
//         if (!ready) { 
//           console.log("waiting");
//           await delay(10*1000);
//           console.log("retrying");
//         }
//       }   

//       const params = {
//         "dataset": dataset,
//         "imperial_units": imperial_units
//       }

//       let keys = Object.keys(data.result.contracts);
//       delete keys.units;
//       const runID = keys[0];
//       // console.log(runID);

//       const runIDIndex = req.body.order.indexOf("runID");
//       const clientIDIndex = req.body.order.indexOf("clientID");
//       const startIndex = req.body.order.indexOf("start");
//       const limitIndex = req.body.order.indexOf("limit");
//       const datasetIndex = req.body.order.indexOf("dataset");
//       const locationsIndex = req.body.order.indexOf("locations");

//       let serialData = [];
//       let tag;
//       for (let i = 0; i<req.body.order.length; i++) {

//         tag = req.body.order[i];
//         if (tag.includes("{id}")) {
//           tag = tag.replace("{id}", runID);
//         }

//         if (i < runIDIndex) {
//           serialData.push(_.get(data.result, tag));
//         } else if (i < clientIDIndex) {
//           serialData.push(runID);
//         } else if (i < startIndex) {
//           serialData.push(_.get(contract, tag));
//         } else if (i < limitIndex) {
//           const _start = _.get(index, tag);
//           console.log("start: ", _start);
//           serialData.push(tag);
//           serialData.push(_start.replaceAll('/', '-'));
//         } else if (i < datasetIndex) {
//           serialData.push(tag);
//           serialData.push(_.get(derivative, tag));
//         } else if (i < locationsIndex) {
//           serialData.push(tag);
//           serialData.push(_.get(params, tag));
//         } else {
//           serialData.push(tag);
//           let coord;
//           let locationsBuffer = [];
//           for (let j=0; j<locations.length; j++) {
//             coord = locations[j];
//             locationsBuffer.push(coord)
//           }
//           serialData.push(locationsBuffer);
//         }
//       }
//       console.log(serialData);
//       const serialDataString = JSON.stringify(serialData, "utf-8");

//       const clientEncryption = sigUtil.encrypt({
//         publicKey: encryptionKeys["0x69640770407A09B166AED26B778699045B304768"],
//         data: serialDataString,
//         version: 'x25519-xsalsa20-poly1305',
//       })

//       const providerEncryption = sigUtil.encrypt({
//         publicKey: encryptionKeys["0x456789ccc3813e8797c4B5C5BAB846ee4A47b0BA"],
//         data: serialDataString,
//         version: 'x25519-xsalsa20-poly1305',
//       })

//       const originalEncryption = sigUtil.encrypt({
//         publicKey: encryptionKeys["0x4506F70e253DEccCC1a419954606cB3D1E6a9a70"],
//         data: serialDataString,
//         version: 'x25519-xsalsa20-poly1305',
//       })

//       let external_order = [clientEncryption, providerEncryption, originalEncryption];
//       let internal_order = [
//         // "version", 
//         "nonce", 
//         "ephemPublicKey", 
//         "ciphertext"
//       ];

//       let packed = []
//       for (let i=0; i<external_order.length; i++) {
//         for (let j=0; j<internal_order.length; j++) {
//           packed.push(external_order[i][internal_order[j]]);
//         }
//       }
//       const originalEncryptedMessage = JSON.stringify(packed.slice(2 * packed.length / 3));

//       // const finalReducedData = clientEncryptedMessage + providerEncryptedMessage + originalEncryptedMessage;
//       // const finalEncryptedBuffer = Buffer.concat([clientEncryptedMessage, providerEncryptedMessage, originalEncryptedMessage]);
//       const finalEncryptedBuffer = Buffer.from(JSON.stringify(packed));
//       const compressedEncryption = pako.deflate(finalEncryptedBuffer);
//       const uri = Buffer.from(compressedEncryption).toString("base64");

//       // console.log("uncompressed unencrypted unserialized data size: ", Buffer.from(JSON.stringify(reducedData)).length);
//       console.log("uncompressed unencrypted serialized data size: ", Buffer.from(serialDataString).length);

//       console.log("uncompressed encrypted serialized data size: ", Buffer.from(originalEncryptedMessage).length);
//       console.log("uncompressed encrypted serialized payload size ", finalEncryptedBuffer.length);

//       console.log("compressed encrypted serialized payload size: ", compressedEncryption.length);
//       console.log("compressed encrypted serialized base64 payload length: ", uri.length);

//       let result = {
//         to: "0x69640770407A09B166AED26B778699045B304768",
//         uri: uri,
//         endDate: index.end.replaceAll('/', '-'),
//         tokenId: bigInt(contract._id, 64).toString(10)
//       }

//       fs.writeFile(contract._id + '-base64.json', JSON.stringify(result), { flag: 'w+' }, err => {
//         if (err) {
//           console.error(err);
//         }
//         // results.push(uri);
//         // file written successfully
//       });
//       results.push(result);




//     }

//     resp.send(results);
//   } catch (e) {
//     console.log(e);
//     resp.send("Something Went Wrong");
//   }
// });





app.listen(port, () => {
  console.log
});
