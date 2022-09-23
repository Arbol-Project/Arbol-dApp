import { 
  Col, 
  Row, 
} from "antd";
import React from "react";


export default function LoginPage() {
    return (
      <div className="Login Page"
        style={{ 
          marginTop: 81, 
        }}>
        <Col>
          <Row>
            <h2 
              style={{
                color: "#3F5F69"
              }}>
              Arbol dApp NFT Portal
            </h2>
          </Row>
          <Row>
            <h3 
              style={{
                color: "#8E8E8E"
              }}>
              Connect your Metamask wallet and Sign in with Ethereum
            </h3>
          </Row>
        </Col>
      </div>
    )
}