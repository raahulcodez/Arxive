module sender::NFTMarketplace {
    use std::signer;
    use std::vector;

    struct NFT has copy, store {
    id: u64,
    owner: address,
    metadata: vector<u8>,
}

    struct NFTStorage has key {
        nfts: vector<NFT>,
    }

    public entry fun init(account: &signer) {
        move_to(account, NFTStorage { nfts: vector::empty<NFT>() });
    }

    public entry fun mint(account: &signer, id: u64, metadata: vector<u8>) acquires NFTStorage {
        let storage = borrow_global_mut<NFTStorage>(signer::address_of(account));
        let nft = NFT { id, owner: signer::address_of(account), metadata };
        vector::push_back(&mut storage.nfts, nft);
    }

    public fun get_all(account: address): vector<NFT> acquires NFTStorage {
        borrow_global<NFTStorage>(account).nfts
    }
}
