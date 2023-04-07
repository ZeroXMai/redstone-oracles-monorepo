use array::ArrayTrait;
use redstone::gas::out_of_gas_array;

trait IndexOfTrait<T, U> {
    fn index_of(self: @T, element: U) -> Option<usize>;
}

impl IndexOfArray<T,
impl UPartialEq: PartialEq<T>,
impl TCopy: Copy<T>,
impl TDrop: Drop<T>> of IndexOfTrait<Array<T>, T> {
    fn index_of(self: @Array<T>, element: T) -> Option<usize> {
        _array_index_of(self, element, 0_usize)
    }
}

fn _array_index_of<T, impl UPartialEq: PartialEq<T>, impl TCopy: Copy<T>, impl TDrop: Drop<T>>(
    arr: @Array<T>, element: T, index: usize
) -> Option<usize> {
    match gas::withdraw_gas_all(get_builtin_costs()) {
        Option::Some(_) => {},
        Option::None(_) => panic(out_of_gas_array()),
    };

    if (index == arr.len()) {
        return Option::None(());
    }

    let elt = *arr[index];

    if (elt == element) {
        return Option::Some(index);
    }

    _array_index_of(:arr, :element, index: index + 1_usize)
}
