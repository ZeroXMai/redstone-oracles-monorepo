library crypto;

dep bytes;

use std::{b256::*, b512::*, bytes::*, ecr::{ec_recover, EcRecoverError}, hash::keccak256};
use bytes::{bytes_slice_tail_offset, bytes_to_b256};

pub fn recover_signer_address(signature_bytes: Bytes, signable_bytes: Bytes) -> Address {
    let (r_bytes, mut s_bytes) = bytes_slice_tail_offset(signature_bytes, 32, 1);
    let v = signature_bytes.get(signature_bytes.len - 1).unwrap();
    let r_number = b256::try_from(r_bytes).unwrap();
    let s_number = b256::try_from(s_bytes).unwrap();

    let hash = signable_bytes.keccak256();

    return recover_public_address(r_number, s_number, v, hash).unwrap();
}

fn recover_public_address(
    r: b256,
    s: b256,
    v: u64,
    msg_hash: b256,
) -> Result<Address, EcRecoverError> {
    let mut v_256: b256 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    if (v == 28) {
        v_256 = 0x0000000000000000000000000000000000000000000000000000000000000001;
    }

    let mut s_with_parity = s | (v_256 << 255);

    let signature = B512 {
        bytes: [r, s_with_parity],
    };

    let pub_key_result = ec_recover(signature, msg_hash);
    if let Result::Err(e) = pub_key_result {
        // propagate the error if it exists
        Result::Err(e)
    } else {
        let pub_key = pub_key_result.unwrap();
        let address = keccak256(((pub_key.bytes)[0], (pub_key.bytes)[1]));
        let mask = 0x000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

        Result::Ok(Address::from(address & mask))
    }
}