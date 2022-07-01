# Arbol-dApp

Monorepo for Arbol-dApp, a permissioned reinsurance settlement platform on Polygon.


## dApp

Frontend and backend for [arbol-dapp.xyz](https://www.arbol-dapp.xyz). Bootstrapped with [Scaffold-ETH](https://github.com/scaffold-eth/scaffold-eth) and hosted by Heroku.

## Chainlink Node

Arbol-dApp relies on authorized Chainlink nodes as off-chain execution environments in order to preserve client privacy and obscure policy details. This directory contains all code a Chainlink node needs to run our external adapters, including job specifications, monitoring tools, and Cloudformation scripts. 