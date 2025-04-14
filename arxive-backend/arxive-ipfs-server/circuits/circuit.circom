pragma circom 2.0.0;
template Main() {
    signal input walletAddress;
    signal output out;

    out <== walletAddress;  // Your custom logic
}

component main = Main();
