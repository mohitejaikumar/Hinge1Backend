import murmurhash from 'murmurhash';
import BitSet from "bitset";


const numberOfHashes = Number(process.env.HASH_SIZE!);
const numberOfBits = Number(process.env.BLOOM_FILTER_SIZE!);

export const updateAddBloomFilter = (filter:string , item:string): string =>{
    
    let oldBitset = new BitSet(filter);
    
    if(oldBitset.cardinality() >= Number(numberOfBits!)){
        // initialize new_one 
        oldBitset = new BitSet();
    }
    for(let i=0;i<numberOfHashes;i++){
        const index = murmurhash.v3(item,i)%numberOfBits;
        oldBitset.set(index);
    }

    return oldBitset.toString(numberOfBits);
}
