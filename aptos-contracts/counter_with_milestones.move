module aggregator_examples::counter_with_milestone {
    use std::error;
    use std::signer;
    use aptos_framework::aggregator_v2::{Self, Aggregator};
    use aptos_framework::event;

    // Resource being modified doesn't exist
    const ERESOURCE_NOT_PRESENT: u64 = 2;

    // Incrementing a counter failed
    const ECOUNTER_INCREMENT_FAIL: u64 = 4;

    const ENOT_AUTHORIZED: u64 = 5;

    struct MilestoneCounter has key {
        next_milestone: u64,
        milestone_every: u64,
        count: Aggregator<u64>,
    }

    #[event]
    struct MilestoneReached has drop, store {
        milestone: u64,
    }

    // Create the global `MilestoneCounter`.
    // Stored under the module publisher address.
    public entry fun create(publisher: &signer, milestone_every: u64) {
        assert!(
            signer::address_of(publisher) == @aggregator_examples,
            ENOT_AUTHORIZED,
        );

        move_to<MilestoneCounter>(
            publisher,
            MilestoneCounter {
                next_milestone: milestone_every,
                milestone_every,
                count: aggregator_v2::create_unbounded_aggregator(),
            }
        );
    }

    public entry fun increment_milestone() acquires MilestoneCounter {
        assert!(exists<MilestoneCounter>(@aggregator_examples), error::invalid_argument(ERESOURCE_NOT_PRESENT));
        let milestone_counter = borrow_global_mut<MilestoneCounter>(@aggregator_examples);
        assert!(aggregator_v2::try_add(&mut milestone_counter.count, 1), ECOUNTER_INCREMENT_FAIL);

        if (aggregator_v2::is_at_least(&milestone_counter.count, milestone_counter.next_milestone) && !aggregator_v2::is_at_least(&milestone_counter.count, milestone_counter.next_milestone + 1)) {
            event::emit(MilestoneReached { milestone: milestone_counter.next_milestone});
            milestone_counter.next_milestone = milestone_counter.next_milestone + milestone_counter.milestone_every;
        }
    }
}