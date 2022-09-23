import { Button } from "antd";
import React from "react";
// import { useThemeSwitcher } from "react-css-theme-switcher";

// import Address from "./Address";
import Balance from "./Balance";
import Wallet from "./Wallet";

/** 
  ~ What it does? ~

  Displays an Address, Balance, and Wallet as one Account component,
  also allows users to log in to existing accounts and log out

  ~ How can I use? ~

  <Account
    useBurner={boolean}
    address={address}
    localProvider={localProvider}
    userProvider={userProvider}
    mainnetProvider={mainnetProvider}
    price={price}
    web3Modal={web3Modal}
    loadWeb3Modal={loadWeb3Modal}
    logoutOfWeb3Modal={logoutOfWeb3Modal}
    blockExplorer={blockExplorer}
    isContract={boolean}
  />

  ~ Features ~

  - Provide address={address} and get balance corresponding to the given address
  - Provide localProvider={localProvider} to access balance on local network
  - Provide userProvider={userProvider} to display a wallet
  - Provide mainnetProvider={mainnetProvider} and your address will be replaced by ENS name
              (ex. "0xa870" => "user.eth")
  - Provide price={price} of ether and get your balance converted to dollars
  - Provide web3Modal={web3Modal}, loadWeb3Modal={loadWeb3Modal}, logoutOfWeb3Modal={logoutOfWeb3Modal}
              to be able to log in/log out to/from existing accounts
  - Provide blockExplorer={blockExplorer}, click on address and get the link
              (ex. by default "https://etherscan.io/" or for xdai "https://blockscout.com/poa/xdai/")
**/

export default function Account({
  // injectedProvider, 
  // selectedChainId,
  // loadDashboard,
  // base64StringToBigInt,
  setReencryptionCounter,
  transferrableIDs,
  contractInterface,
  useBurner,
  address,
  userSigner,
  localProvider,
  // mainnetProvider,
  pubKey,
  // price,
  minimized,
  web3Modal,
  loadWeb3Modal,
  logoutOfWeb3Modal,
  blockExplorer,
  isContract,
  // loadDashboards,
}) {
  // console.log(transferrableIDs);
  // const { currentTheme } = useThemeSwitcher();
  const currentTheme = "light";

  const modalButtons = [];
  if (web3Modal) {
    if (web3Modal.cachedProvider) {
      modalButtons.push(
        <Button
          key="logoutbutton"
          style={{ verticalAlign: "middle", marginRight: 24 }}
          shape="round"
          size="medium"
          onClick={logoutOfWeb3Modal}
        >
          Logout
        </Button>,
      );
    } else {
      modalButtons.push(
        <Button
          key="loginbutton"
          style={{ verticalAlign: "middle", marginRight: 24 }}
          shape="round"
          size="medium"
          /* type={minimized ? "default" : "primary"}     too many people just defaulting to MM and having a bad time */
          onClick={loadWeb3Modal}
        >
          Connect
        </Button>,
      );
    }
  }
  const display = minimized ? (
    ""
  ) : (
    <span>
      {web3Modal && web3Modal.cachedProvider ? (
        <>
          {/* {address && <Address address={address} ensProvider={mainnetProvider} blockExplorer={blockExplorer} />} */}
          <Balance 
            address={address} 
            provider={localProvider} 
            // price={price} 
            color={currentTheme === "light" ? "#3F5F69" : "#ddd"} 
          />
          <Wallet
            // setReencryptionCounter={setReencryptionCounter}
            // injectedProvider={injectedProvider}
            // selectedChainId={selectedChainId}
            // loadDashboard={loadDashboard}
            // bigIntToBase64String={bigIntToBase64String}
            transferrableIDs={transferrableIDs}
            contractInterface={contractInterface}
            address={address}
            provider={localProvider}
            signer={userSigner}
            // ensProvider={mainnetProvider}
            pubKey={pubKey}
            // price={price}
            color={currentTheme === "light" ? "#1890ff" : "#2caad9"}
          />
        </>
      ) : useBurner ? (
        ""
      ) : isContract ? (
        <>
          {/* {address && <Address address={address} ensProvider={mainnetProvider} blockExplorer={blockExplorer} />} */}
          <Balance 
            address={address} 
            provider={localProvider} 
            // price={price} 
            color={currentTheme === "light" ? "#3F5F69" : "#ddd"} 
          />
        </>
      ) : (
        ""
      )}
      {useBurner && web3Modal && !web3Modal.cachedProvider ? (
        <>
          {/* <Address address={address} ensProvider={mainnetProvider} blockExplorer={blockExplorer} /> */}
          <Balance 
            address={address} 
            provider={localProvider} 
            // price={price} 
            color={currentTheme === "light" ? "#3F5F69" : "#ddd"} 
          />
          <Wallet
            // setReencryptionCounter={setReencryptionCounter}
            // injectedProvider={injectedProvider}
            // selectedChainId={selectedChainId}
            // loadDashboard={loadDashboard}
            // bigIntToBase64String={bigIntToBase64String}
            transferrableIDs={transferrableIDs}
            contractInterface={contractInterface}
            address={address}
            provider={localProvider}
            // signer={userSigner}
            // ensProvider={mainnetProvider}
            signer={userSigner}
            pubKey={pubKey}
            // injectedProvider={injectedProvider}
            // deployedContracts={deployedContracts}
            // localChainId={localChainId}
            // selectedNetwork={selectedNetwork}
            // price={price}
            color={currentTheme === "light" ? "#1890ff" : "#2caad9"}
          />
        </>
      ) : (
        <></>
      )}
    </span>
  );

  return (
    <div
      style={{
        verticalAlign: "middle",
      }}>
      {modalButtons}
      {display}
    </div>
  );
}
