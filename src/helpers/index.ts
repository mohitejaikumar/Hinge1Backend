import murmurhash from 'murmurhash';
import BitSet from "bitset";


const numberOfHashes = Number(process.env.HASH_SIZE!);
const numberOfBits = Number(process.env.BLOOM_FILTER_SIZE!);

export const updateAddBloomFilter = (filter:string , item:number): string =>{
    
    let oldBitset = new BitSet(filter);
    
    if(oldBitset.cardinality() >= Number(numberOfBits!)){
        // initialize new_one 
        oldBitset = new BitSet();
    }
    for(let i=0;i<numberOfHashes;i++){
        const index = murmurhash.v3(String(item),i)%numberOfBits;
        oldBitset.set(index);
    }

    return oldBitset.toString();
}

export const checkIfExistsInBloom = (filter:string , item:number):boolean =>{
    const bitset = new BitSet(filter);
    for(let i=0;i<numberOfHashes;i++){
        const index = murmurhash.v3(String(item),i)%numberOfBits;
        if(!bitset.get(index)){
            return false;
        }
    }
    return true;
}


export function calculateAge(dob: string): number {
    // Convert from dd-mm-yyyy to yyyy-mm-dd for correct parsing
    const [day, month, year] = dob.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day); // month is 0-indexed
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    // Adjust if the birthday hasn't occurred yet this year
    const hasBirthdayOccurred = 
        today.getMonth() > birthDate.getMonth() || 
        (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

    if (!hasBirthdayOccurred) {
        age -= 1;
    }

    return age;
}
