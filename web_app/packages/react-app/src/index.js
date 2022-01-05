import "./index.css";

import { ApolloProvider } from "@apollo/react-hooks";
import ApolloClient from "apollo-boost";
import React from "react";
import ReactDOM from "react-dom";

import App from "./App";

// You should replace this url with your own and put it into a .env file
// See all subgraphs: https://thegraph.com/explorer/
const client = new ApolloClient({
  uri: "",
});

ReactDOM.render(
  <ApolloProvider client={client} value={[]}>
    <App />
  </ApolloProvider>,
  document.getElementById("root"),
);
