#[contract]
mod PriceManager {
    use array::ArrayTrait;
    use box::BoxTrait;
    use option::OptionTrait;
    use integer::u64_try_from_felt252;
    use traits::Into;
    use traits::TryInto;

    use starknet::ContractAddress;
    use starknet::contract_address_try_from_felt252;
    use starknet::get_caller_address;
    use starknet::info::get_block_timestamp;
    use starknet::info::get_block_info;

    use redstone::processor::process_payload;
    use redstone::config::Config;
    use redstone::sliceable_array::ArrayCopy;
    use redstone::sliceable_array::SliceableArrayTrait;
    use redstone::sliceable_array::SliceableArray;
    use redstone::numbers::Felt252PartialOrd;
    use redstone::numbers::Felt252Div;

    use utils::serde_storage::StorageAccessSerde;
    use utils::gas::out_of_gas_array;

    use interface::round_data::RoundData;
    use interface::round_data::RoundDataSerde;

    struct Storage {
        signer_count: usize,
        signers: Array<felt252>,
        owner: ContractAddress,
        feed_ids: Array<felt252>,
        price_values: LegacyMap::<felt252, felt252>,
        round_data: RoundData,
    }

    #[constructor]
    fn constructor(
        owner_address: felt252, signer_count_threshold: felt252, signer_addresses: Array<felt252>
    ) {
        owner::write(contract_address_try_from_felt252(owner_address).unwrap());

        assert(signer_count_threshold > 0, 'Wrong signer count threshold');
        assert(
            signer_addresses.len().into() >= signer_count_threshold, 'Wrong number of addresses'
        );

        signer_count::write(signer_count_threshold.try_into().unwrap());
        signers::write(signer_addresses);
        feed_ids::write(ArrayTrait::new());
        round_data::write(
            RoundData { payload_timestamp: 0, round: 0, block_number: 0, block_timestamp: 0 }
        )
    }


    #[view]
    fn read_price(feed_id: felt252) -> felt252 {
        price_values::read(feed_id)
    }

    #[view]
    fn read_round_data() -> RoundData {
        round_data::read()
    }

    #[view]
    fn read_round_data_and_price(feed_id: felt252) -> (RoundData, felt252, ) {
        (read_round_data(), read_price(:feed_id))
    }

    #[external]
    fn write_prices(round_number: felt252, feed_ids: Array<felt252>, payload_bytes: Array<u8>) {
        let config = Config {
            block_timestamp: get_block_timestamp(),
            feed_ids: @feed_ids,
            signer_count_threshold: signer_count::read(),
            signers: @signers::read()
        };

        let results = process_payload(:payload_bytes, :config);
        let prices = results.aggregated_values.copied();

        write_price_values_internal(
            rnd_number: round_number,
            feed_ids_arr: feed_ids,
            :prices,
            payload_timestamp: results.min_timestamp / 1000
        )
    }

    #[external]
    fn write_price_values(
        round_number: felt252,
        feed_ids: Array<felt252>,
        prices: Array<felt252>,
        payload_timestamp: felt252
    ) {
        assert((owner::read() == get_caller_address()), 'Caller is not the owner');
        write_price_values_internal(
            rnd_number: round_number, feed_ids_arr: feed_ids, prices: prices, :payload_timestamp
        )
    }

    fn write_price_values_internal(
        rnd_number: felt252,
        feed_ids_arr: Array<felt252>,
        prices: Array<felt252>,
        payload_timestamp: felt252
    ) {
        assert(feed_ids_arr.len() == prices.len(), 'Different array lengths');

        let read_data = read_round_data();

        assert(rnd_number == read_data.round + 1, 'Wrong round number');

        assert(payload_timestamp < 10000000000, 'Timestamp must be normalized');
        assert(payload_timestamp > read_data.payload_timestamp, 'Wrong payload timestamp');

        let data = RoundData {
            block_number: get_block_info().unbox().block_number.into(),
            block_timestamp: get_block_timestamp().into(),
            round: rnd_number,
            payload_timestamp
        };

        clear_values(feed_ids::read(), index: 0);

        feed_ids::write(feed_ids_arr.copied());
        _write_price_values(feed_ids: @feed_ids_arr, values: prices, index: 0);
        round_data::write(data);
    }

    fn _write_price_values(feed_ids: @Array<felt252>, values: Array<felt252>, index: usize) {
        match gas::withdraw_gas_all(get_builtin_costs()) {
            Option::Some(_) => {},
            Option::None(_) => panic(out_of_gas_array()),
        };

        if (feed_ids.len() == index) {
            return ();
        }

        price_values::write(*feed_ids[index], *values[index]);

        _write_price_values(:feed_ids, :values, index: index + 1)
    }

    fn clear_values(feed_ids: Array<felt252>, index: usize) {
        match gas::withdraw_gas_all(get_builtin_costs()) {
            Option::Some(_) => {},
            Option::None(_) => panic(out_of_gas_array()),
        };

        if (feed_ids.len() == index) {
            return ();
        }

        price_values::write(*feed_ids[index], 0);

        clear_values(:feed_ids, index: index + 1)
    }
}
