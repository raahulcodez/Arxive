1. add aptos move init --name TestTransfer (function name)
2. addd sender address in move toml
3. add file under sources directory
4. aptos move compile


5. aptos init (for address)

6. get your private key from the wallet -
    -> .aptos folder
        config.yaml imp

7. aptos move deploy 
    - need to give yes (--assume-yes)

8. aptos move run --function-id 0x3a5f28c1accc5e1788be13509227ec8b46ee0a4341f9beb7c5bb65a6b8451ddf::TestTransfer::transfer_a
pt --args address:0x803defc0f2777f0792b18b93018b79576b61d1dc388f2e067c9ee453b72e8665

    - need to give yes (--assume-yes)