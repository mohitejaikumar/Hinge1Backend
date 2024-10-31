import { PrismaClient, User } from '@prisma/client'
import { TRegistrationSchema } from '../zod';
import BitArray from 'bit-array'

const prismaClientSingleton = () => {
    const prisma =new PrismaClient().$extends({
        model:{
            user:{
                async create(data:TRegistrationSchema & {
                    geohash:string,
                    bloom_filter:string,
                }){
                    
                    const new_user = {
                        first_name:data.firstName,
                        last_name:data.lastName,
                        email:data.email,
                        password:data.password,
                        phone_number:data.phoneNumber,
                        age:data.age,
                        gender:data.gender,
                        min_preferred_age:data.min_age,
                        max_preferred_age:data.max_age, 
                        preferred_gender:data.preferredGender,
                        location:{
                            latitude:data.latitude,
                            longitude:data.longitude
                        }
                    }
                    return new_user;
                }
            }
        }
    })



    return prisma;

}

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma