module {{addr}}::HelloWorld {
    public entry fun say_hello(account: &signer) {
        let _ = signer::address_of(account);
    }
}
