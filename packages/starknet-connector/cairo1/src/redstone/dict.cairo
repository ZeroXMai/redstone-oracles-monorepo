use dict::Felt252DictTrait;
use integer::u32_to_felt252;
use redstone::numbers::Felt252PartialOrd;
use redstone::gas::out_of_gas_array;

const DICT_UNKNOWN_VALUE: felt252 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

trait OptionalDictTrait<T> {
    fn new_of_size(size: usize) -> Felt252Dict<T>;
    fn get_or_none(ref self: Felt252Dict<T>, index: felt252) -> Option<T>;
}

impl OptionalDictFelt252 of OptionalDictTrait<felt252> {
    fn new_of_size(size: usize) -> Felt252Dict<felt252> {
        let mut dict: Felt252Dict<felt252> = Felt252DictTrait::new();

        dict_fill(ref :dict, value: DICT_UNKNOWN_VALUE, count: u32_to_felt252(size), index: 0);
        dict.insert(DICT_UNKNOWN_VALUE, u32_to_felt252(size));

        dict
    }

    fn get_or_none(ref self: Felt252Dict<felt252>, index: felt252) -> Option<felt252> {
        if (self[index] == DICT_UNKNOWN_VALUE) {
            return Option::None(());
        }

        if (index >= self[DICT_UNKNOWN_VALUE]) {
            return Option::None(());
        }

        Option::Some(self[index])
    }
}

fn dict_fill<T, impl TCopy: Copy<T>, impl TDrop: Drop<T>, impl TDefault: Felt252DictValue<T>>(
    ref dict: Felt252Dict<T>, value: T, count: felt252, index: felt252
) {
    match gas::withdraw_gas_all(get_builtin_costs()) {
        Option::Some(_) => {},
        Option::None(_) => panic(out_of_gas_array()),
    };

    if (index == count) {
        return ();
    }

    dict.insert(index, value);
    dict_fill(ref :dict, :value, :count, index: index + 1)
}

impl Felt252DictCopy<T, impl TCopy: Copy<T>> of Copy<Felt252Dict<T>>;
