#![doc(html_root_url = "https://docs.rs/phf_generator/0.8.0")]
use std::iter;

use fastrand::Rng;
use phf_shared::{HashKey, Hashes, PhfHash};

const DEFAULT_LAMBDA: usize = 5;
const FIXED_SEED: u64 = 1234567890;

pub struct HashState {
    pub key: HashKey,
    pub disps: Vec<(u32, u32)>,
    pub map: Vec<usize>,
}

pub fn generate_hash<H: PhfHash>(entries: &[H]) -> HashState {
    generate_hash_with_hash_fn(entries, phf_shared::hash)
}

pub fn generate_hash_with_hash_fn<T, F>(entries: &[T], hash_fn: F) -> HashState
where
    F: Fn(&T, &HashKey) -> Hashes,
{
    let mut rng = Rng::with_seed(FIXED_SEED);
    iter::repeat_with(|| rng.u64(..))
        .find_map(|key| {
            let hashes: Vec<_> = entries.iter().map(|entry| hash_fn(entry, &key)).collect();
            try_generate_hash(hashes).map(|(disps, map)| HashState { key, disps, map })
        })
        .expect("failed to solve PHF")
}

struct Bucket {
    idx: usize,
    keys: Vec<usize>,
}

fn try_generate_hash(hashes: Vec<Hashes>) -> Option<(Vec<(u32, u32)>, Vec<usize>)> {
    let table_len = hashes.len();
    let buckets_len = (table_len + DEFAULT_LAMBDA - 1) / DEFAULT_LAMBDA;

    let mut buckets: Vec<_> = (0..buckets_len)
        .map(|i| Bucket { idx: i, keys: vec![] })
        .collect();
    for (i, hash) in hashes.iter().enumerate() {
        buckets[(hash.g % buckets_len as u32) as usize].keys.push(i);
    }
    buckets.sort_by(|a, b| a.keys.len().cmp(&b.keys.len()).reverse());

    let mut map = vec![None; table_len];
    let mut disps = vec![(0u32, 0u32); buckets_len];
    let mut try_map = vec![0u64; table_len];
    let mut generation = 0u64;
    let mut values_to_add = vec![];

    'buckets: for bucket in &buckets {
        for d1 in 0..(table_len as u32) {
            'disps: for d2 in 0..(table_len as u32) {
                values_to_add.clear();
                generation += 1;

                for &key in &bucket.keys {
                    let idx = (phf_shared::displace(hashes[key].f1, hashes[key].f2, d1, d2) % table_len as u32) as usize;
                    if map[idx].is_some() || try_map[idx] == generation {
                        continue 'disps;
                    }
                    try_map[idx] = generation;
                    values_to_add.push((idx, key));
                }

                disps[bucket.idx] = (d1, d2);
                for &(idx, key) in &values_to_add {
                    map[idx] = Some(key);
                }
                continue 'buckets;
            }
        }
        return None;
    }

    Some((disps, map.into_iter().map(|i| i.unwrap()).collect()))
}
