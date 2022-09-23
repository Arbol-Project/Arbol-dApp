import { Button, Modal, Spin, Tooltip, Typography, Row, Col } from "antd";
import React, { useState, useEffect } from "react";
// import { ethers } from "ethers";
import { QrcodeOutlined, KeyOutlined, SendOutlined } from "@ant-design/icons";
import QR from "qrcode.react";

// import { Transactor } from "../helpers";
import Address from "./Address";
import AddressInput from "./AddressInput";
import Balance from "./Balance";
// import EtherInput from "./EtherInput";

// import { Contract as ethersContract } from "@ethersproject/contracts";
// import Web3 from "web3";

const { Text } = Typography;
const bigInt = require("big-integer");

/**
  ~ What it does? ~

  Displays a wallet where you can specify address and send USD/ETH, with options to
  scan address, to convert between USD and ETH, to see and generate private keys,
  to send, receive and extract the burner wallet

  ~ How can I use? ~

  <Wallet
    provider={userProvider}
    address={address}
    ensProvider={mainnetProvider}
    price={price}
    color='red'
  />

  ~ Features ~

  - Provide provider={userProvider} to display a wallet
  - Provide address={address} if you want to specify address, otherwise
                                                    your default address will be used
  - Provide ensProvider={mainnetProvider} and your address will be replaced by ENS name
              (ex. "0xa870" => "user.eth") or you can enter directly ENS name instead of address
  - Provide price={price} of ether and easily convert between USD and ETH
  - Provide color to specify the color of wallet icon
**/

function base64StringToBigInt(s) {
  const tokenIdBytes = Buffer.from(s, "base64");
  const tokenIdHex = tokenIdBytes.toString("hex");
  const tokenId = bigInt(tokenIdHex, 16);
  return tokenId;
}


export default function Wallet(props) {
  const [signerAddress, setSignerAddress] = useState();
  useEffect(() => {
    async function getAddress() {
      if (props.signer) {
        const newAddress = await props.signer.getAddress();
        setSignerAddress(newAddress);
      }
    }
    getAddress();
  }, [props.signer]);

  // console.log(props.transferrableIDs);

  const selectedAddress = props.address || signerAddress;

  const [open, setOpen] = useState();
  const [qr, setQr] = useState();
  // const [amount, setAmount] = useState();
  const [toAddress, setSendAddress] = useState();
  const [send, setSend] = useState();
  const [key, setKey] = useState();
  const [inFlight, setInFlight] = useState(false);
  const [delivered, setDelivered] = useState(false);
  // const [transferrableIDs, setTransferrableIDs] = useState(props.transferrableIDs);


  async function transferContract(token, to, contract, signer) {
    try {
      if (token && to) {
        const tokenId = base64StringToBigInt(token);
        // console.log(tokenId.value);
        // console.log(to);
    
        const from = await signer.getAddress();
        setDelivered(false);
        let tx = await contract.transferFrom(from, to, tokenId.value);
        setInFlight(true);
        await tx.wait();
        // let ids = [...transferrableIDs].filter(x => x !== token);
        // setTransferrableIDs(ids);

        // console.log('testing')
        // if (!inFlight && !delivered) {
        //   setInFlight(true);
        // } else if (inFlight && !delivered) {
        //   setDelivered(true);
        //   setInFlight(false);
        // } else if (delivered) {
        //   setDelivered(false);
        // }
        console.log("contract transferred");
      } else {
        console.log("Insufficient parameters");
      }
    } catch (e) {
      console.log("transfer failed");
    }
  }

  if (props.contractInterface) {
    props.contractInterface.on("Transfer", (from, to, id) => {
      setDelivered(true);
      setInFlight(false);
      // setDelivered(false);
    });
  }

  const providerSend = props.provider ? (
    <Tooltip title="Wallet">
      <img
        width={24}
        src="/wallet.png"
        alt="wallet"
        onClick={() => {
          setOpen(!open); 
        }}
        style={{ cursor: "pointer" }}
      />
    </Tooltip>
  ) : (
    ""
  );

  let display;
  let receiveButton;
  let encryptionKeyButton;
  let transferButton;
  if (qr) {
    display = (
      <div>
        <div>
          <Text copyable>{selectedAddress}</Text>
        </div>
        <QR
          value={selectedAddress}
          size={450}
          level="H"
          includeMargin
          renderAs="svg"
          imageSettings={{ excavate: false, src: "", height: 0, width: 0 }}
        />
      </div>
    );
    receiveButton = (
      <Button
        key="hide"
        onClick={() => {
          setQr("");
        }}
      >
        <QrcodeOutlined /> Hide
      </Button>
    );
    encryptionKeyButton = (
      <Button
        key="retrieve"
        onClick={() => {
          setKey(selectedAddress);
          setQr("");
          setSend("");
        }}
      >
        <KeyOutlined /> Encryption Key
      </Button>
    );
    transferButton = (
      <Button
        key="transfer"
        onClick={() => {
          setSend(selectedAddress);
          setKey("");
          setQr("");
        }}
      >
        <SendOutlined /> Transfers
      </Button>
    );
  } else if (key) {
    const pubKey = props.pubKey;
    display = (
      <div>
        <b>Public Key:</b>

        <div>
          <Text copyable>{pubKey}</Text>
        </div>

        <hr />

      </div>
    );

    receiveButton = (
      <Button
        key="receive"
        onClick={() => {
          setQr(selectedAddress);
          setKey("");
          setSend("");
        }}
      >
        <QrcodeOutlined /> Receive
      </Button>
    );
    encryptionKeyButton = (
      <Button
        key="hide"
        onClick={() => {
          setKey("");
        }}
      >
        <KeyOutlined /> Hide
      </Button>
    );
    transferButton = (
      <Button
        key="transfer"
        onClick={() => {
          setSend(selectedAddress);
          setKey("");
          setQr("");
        }}
      >
        <SendOutlined /> Transfers
      </Button>
    );
    
  } else if (send) {
    const inputStyle = {
      padding: 10,
    };

    display = (
      <div>
        <Col span={24}>
          <Row>
            <div style={inputStyle}>
              <AddressInput
                transferContract={transferContract}
                transferrableIDs={props.transferrableIDs}
                contractInterface={props.contractInterface}
                autoFocus
                placeholder="to address"
                address={toAddress}
                onChange={setSendAddress}
                signer={props.signer}
              />
            </div>
          </Row>
          <Row justify="space-around">
            
            <div style={{textAlign: "center", paddingTop: "20px"}}>
              { delivered ? (
                <p>
                  Transfer Complete
                </p>
                  
                ) : (
                  inFlight ? (
                    <img
                      width={40}
                      height={40}
                      src="/Spinning-Spinner.gif"
                      alt="Spinner" 
                    />
                  ) : (
                    ""
                  ))}
            </div>
          </Row>
        </Col>
        
      </div>
    );
    receiveButton = (
      <Button
        key="receive"
        onClick={() => {
          setQr(selectedAddress);
          setKey("");
          setSend("");
        }}
      >
        <QrcodeOutlined /> Receive
      </Button>
    );
    encryptionKeyButton = (
      <Button
        key="retrieve"
        onClick={() => {
          setKey(selectedAddress);
          setQr("");
          setSend("");
        }}
      >
        <KeyOutlined /> Encryption Key
      </Button>
    );

    transferButton = (
      <Button
        key="transfer"
        onClick={() => {
          setSend(selectedAddress);
          setKey("");
          setQr("");
        }}
      >
        <SendOutlined /> Transfers
      </Button>
    );
    
  } else {
    const inputStyle = {
      padding: 10,
    };

    display = (
      <div>
        <Col span={24}>
          <Row>
            <div style={inputStyle}>
              <AddressInput
                transferContract={transferContract}
                transferrableIDs={props.transferrableIDs}
                contractInterface={props.contractInterface}
                autoFocus
                placeholder="to address"
                address={toAddress}
                onChange={setSendAddress}
                signer={props.signer}
              />
            </div>
          </Row>
          <Row justify="space-around">
            
            <div style={{textAlign: "center", paddingTop: "20px"}}>
              { delivered ? (
                <p>
                  Transfer Complete
                </p>
                  
                ) : (
                  inFlight ? (
                    <img
                      width={40}
                      height={40}
                      src="/Spinning-Spinner.gif"
                      alt="Spinner" 
                    />
                  ) : (
                    ""
                  ))}
            </div>
          </Row>
        </Col>
        
      </div>
    );
    receiveButton = (
      <Button
        key="receive"
        onClick={() => {
          setQr(selectedAddress);
          setKey("");
          setSend("");
        }}
      >
        <QrcodeOutlined /> Receive
      </Button>
    );
    encryptionKeyButton = (
      <Button
        key="retrieve"
        onClick={() => {
          setKey(selectedAddress);
          setQr("");
          setSend("");
        }}
      >
        <KeyOutlined /> Encryption Key
      </Button>
    );

    transferButton = (
      <Button
        key="transfer"
        onClick={() => {
          setSend(selectedAddress);
          setKey("");
          setQr("");
        }}
      >
        <SendOutlined /> Transfers
      </Button>
    );
  }

  return (
    <span>
      {providerSend}
      <Modal
        visible={open}
        title={
          <div>
            {selectedAddress ? <Address address={selectedAddress} 
            // ensProvider={props.ensProvider} 
            /> : <Spin />}
            <div style={{ float: "right", paddingRight: 25 }}>
              <Balance 
                address={selectedAddress} 
                provider={props.provider} 
              />
            </div>
          </div>
        }
        onOk={() => {
          setQr();
          setKey();
          setOpen(!open);
        }}
        onCancel={() => {
          setQr();
          setKey();
          setOpen(!open);
        }}
        footer={[
          encryptionKeyButton,
          receiveButton,
          transferButton,
        ]}
      >
        {display}
      </Modal>
    </span>
  );
}
