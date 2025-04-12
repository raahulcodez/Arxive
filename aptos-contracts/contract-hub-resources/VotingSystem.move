module sender::VotingSystem {
    use std::signer;
    use std::vector; // <-- REQUIRED for vector operations

    struct Proposal has copy, drop, store {
        id: u64,
        name: vector<u8>,
        votes: u64,
    }

    struct VotingState has key {
        proposals: vector<Proposal>,
    }

    public entry fun init(account: &signer) {
        move_to(account, VotingState { proposals: vector::empty<Proposal>() });
    }

    public entry fun add_proposal(account: &signer, id: u64, name: vector<u8>) acquires VotingState {
        let state = borrow_global_mut<VotingState>(signer::address_of(account));
        vector::push_back(&mut state.proposals, Proposal { id, name, votes: 0 });
    }

    public entry fun vote(account: &signer, id: u64) acquires VotingState {
    let state = borrow_global_mut<VotingState>(signer::address_of(account));
    let len = vector::length(&state.proposals);
    let mut_i = 0;
    while (mut_i < len) {
        let prop = vector::borrow_mut(&mut state.proposals, mut_i);
        if (prop.id == id) {
            prop.votes = prop.votes + 1;
            return;
        };
        mut_i = mut_i + 1;
    }
}

    public fun get_proposals(account: address): vector<Proposal> acquires VotingState {
        borrow_global<VotingState>(account).proposals
    }
}
