1) Setting up the environment
* install cairo & starti inside a python virtual env: https://www.cairo-lang.org/docs/quickstart.html
* install starknet CLI & set up the account: https://www.cairo-lang.org/docs/hello_starknet/account_setup.html
* transfer Goerli ETH by using https://faucet.goerli.starknet.io/ as defined in the tutorial
* wait to have the transfer-transaction accepted on L2 (check it on https://testnet.starkscan.co/)
* fill the value variable `ACC` in the Makefile (the default account name is "__default __" _without the space-character inside_) 
    by putting there a value of the --account if you have passed it to `starknet new_account`
* install protostar inside your virtual env you have started: https://docs.swmansion.com/protostar/docs/tutorials/installation
* export the protostar-PATH to the virtual-env's path: `export PATH="$PATH:/Users/[you]/.protostar/dist/protostar`

2) Running the cairo demo program
* fill the value with `PAYLOAD_URL` in the Makefile (it should have the format= at the end). You might needed the `cache-service` started locally.
* execute `make prepare_data`. The files are saved in the `./data` directory; the base name is defined as `DATA_NAME` variable in the Makefile)
* execute `make run`

3) Using the contract
* run `make declare` and save the value of "class hash" hex returned by the function
* wait to have the transaction accepted on L2 (check it on https://testnet.starkscan.co/)
* run `make CLASS_HASH=0xabc deploy` where 0xabc is the "class hash" saved in the first step and save the "contract hash".
* wait to have the transaction accepted on L2
* run `make prepare_data` once again to have the data's timestamp able to validate by the contract
* run `make CONTRACT_ADDRESS=0xdef get_oracle_value(s)` where 0xdef is the "contract hash" saved in the deploying-step above.
* you can modify the invocation and/or DATA_NAME directly in the Makefile