import { Input, Select, Button, Row, Col } from "antd";
import React, { useCallback, useState } from "react";
// import { ethers } from "ethers";
// import { CameraOutlined, QrcodeOutlined } from "@ant-design/icons";
// import { useLookupAddress } from "eth-hooks/dapps/ens";
// import QrReader from "react-qr-reader";
// import { tryToDisplayAsText } from "./Contract/utils";
const { Option } = Select;
const bigInt = require("big-integer");

// import Blockie from "./Blockie";

// const isENS = (address = "") => address.endsWith(".eth") || address.endsWith(".xyz");

// probably we need to change value={toAddress} to address={toAddress}

/** 
  ~ What it does? ~

  Displays an address input with QR scan option

  ~ How can I use? ~

  <AddressInput
    autoFocus
    ensProvider={mainnetProvider}
    placeholder="Enter address"
    value={toAddress}
    onChange={setToAddress}
  />

  ~ Features ~

  - Provide ensProvider={mainnetProvider} and your address will be replaced by ENS name
              (ex. "0xa870" => "user.eth") or you can enter directly ENS name instead of address
  - Provide placeholder="Enter address" value for the input
  - Value of the address input is stored in value={toAddress}
  - Control input change by onChange={setToAddress}
                          or onChange={address => { setToAddress(address);}}
**/


export default function AddressInput({ 
  // loadDashboard, 
  transferContract,
  ivalue, 
  transferrableIDs, 
  autoFocus, 
  placeholder, 
  // selectedChainId, 
  signer, 
  // injectedProvider,
  onChange,
  contractInterface
}) {
  
  // console.log("in ai: ", transferrableIDs);

  // const { onChange } = props;
  const [value, setValue] = useState(ivalue);
  // const [transferIds, setTransferIds] = useState([]);
  // const [scan, setScan] = useState(false);

  const currentValue = typeof ivalue !== "undefined" ? ivalue : value;
  // const ens = useLookupAddress(ensProvider, currentValue);
  // const transferrableIDs = JSON.parse(transferrableIDs);
  let ids = {};
  // let ids = [];
  let contractID;
  for (let i=0; i<transferrableIDs.length; i++) {
    // contractID = bigIntToBase64String(transferrableIDs[i]);
    contractID = transferrableIDs[i];
    // console.log(contractID);
    ids[contractID] = <Option key={contractID}>{contractID.substring(0, contractID.length-3)}</Option>;
    // ids.push(<Option key={contractID}>{contractID.substring(0, contractID.length-3)}</Option>);
  };
  // console.log(transferrableIDs);
  // setTransferIds(ids);
  const [transferIds, setTransferIds] = useState(ids);

  const updateAddress = useCallback(
    async newValue => {
      if (typeof newValue !== "undefined") {
        let address = newValue;
        // if (isENS(address)) {
        //   try {
        //     const possibleAddress = await ensProvider.resolveName(address);
        //     if (possibleAddress) {
        //       address = possibleAddress;
        //     }
        //     // eslint-disable-next-line no-empty
        //   } catch (e) {}
        // }
        setValue(address);
        if (typeof onChange === "function") {
          onChange(address);
        }
      }
    },
    [onChange],
  );

  // console.log(transferrableIDs[0].children);

  const [transferTarget, setTransferTarget] = useState();
  // const [transferReceiver, setTransferReceiver] = useState();



  return (
    <div>
      <Row style={{textAlign: "left", verticalAlign: "middle"}}>
        <Col span={11}>
          <div>
            <Select 
              onChange={(value) => {
                setTransferTarget(value)
              }} 
              defaultValue="Contracts" 
              style={{width: "196px", boxShadow: "none", backgroundColor: "FAFAFA"}}
              // value={delivered ? "Contracts" : transferIds[transferTarget]}
              >
                {Object.values(transferIds)}
            </Select>
          </div>
        </Col>
        <Col span={10}>
          <Input
            style={{width: "160px", marginRight: "10px", marginLeft: "10px"}}
            id="0xAddress" // name it something other than address for auto fill doxxing
            name="0xAddress" // name it something other than address for auto fill doxxing
            autoComplete="off"
            autoFocus={autoFocus}
            placeholder={placeholder ? placeholder : "address"}
            // prefix={<Blockie address={currentValue} size={8} scale={3} />}
            value={currentValue}
            // addonBefore={
            // }
            
            // addonAfter={
              // <div
              //   style={{ marginTop: 4, cursor: "pointer" }}
              //   onClick={() => {
              //     // setScan(!scan);
              //     // transferContract()
              //   }}
              // >
              //   {/* <Badge count={<CameraOutlined style={{ fontSize: 9 }} />}>
              //     <QrcodeOutlined style={{ fontSize: 18 }} />
              //   </Badge>{" "} */}
              //   Send
              // </div>
            // }
            onChange={e => {
              updateAddress(e.target.value);
            }}
          />
        </Col>
        <Col span={3}>
          <Button 
            // disabled
            onClick={() => {
              transferContract(transferTarget, value, contractInterface, signer);
              let ids = {...transferIds};
              delete ids[transferTarget];
              setTransferIds(ids);
              // loadDashboard(selectedChainId, signer, injectedProvider);
            }} 
            // style={{color: "#232323", backgroundColor: "#FAFAFA", border: "none"}}>
            // style={{ cursor: "pointer" }}
            >
            Send
          </Button>
        </Col>
      </Row>
    </div>
  );
}
