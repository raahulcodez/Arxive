module archiva::registry {
    use std::string;
    use std::vector;
    use std::timestamp;
    use std::signer;

    struct ContractMetadata has key, store, copy {  // Add 'copy' ability
    ipfs_cid: string::String,
    module_name: string::String,
    archived_at: u64,
}

    struct ArchiveRegistry has key {
        entries: vector<ContractMetadata>,
    }

    public entry fun init_registry(account: &signer) {
        move_to(account, ArchiveRegistry {
            entries: vector::empty<ContractMetadata>(),
        });
    }

    public entry fun archive_contract(account: &signer, ipfs_cid: string::String, module_name: string::String)
    acquires ArchiveRegistry {
        let metadata = ContractMetadata {
            ipfs_cid,
            module_name,
            archived_at: timestamp::now_seconds(),
        };

        let registry = borrow_global_mut<ArchiveRegistry>(signer::address_of(account));
        vector::push_back(&mut registry.entries, metadata);
    }

    public fun get_archived(addr: address): vector<ContractMetadata>
    acquires ArchiveRegistry {
        let registry = borrow_global<ArchiveRegistry>(addr);
        *&registry.entries  // Explicitly dereference and copy
    }

}
