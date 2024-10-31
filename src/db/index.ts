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
                    
                    const point = `POINT(${data.longitude} ${data.latitude})`;
                    const newUser:User = await prisma.$queryRaw`
                        INSERT INTO "User" (
                        first_name, last_name, email, password, phone_number, age, gender, 
                        min_preferred_age, max_preferred_age, preferred_gender, 
                        location, geohash, bloom_filter
                        ) VALUES (
                        ${data.firstName}, ${data.lastName}, ${data.email}, ${data.password},
                        ${data.phoneNumber}, ${data.age}, ${data.gender}, ${data.min_age},
                        ${data.max_age}, ${JSON.stringify(data.preferredGender)}, 
                        ST_GeomFromText(${point}, 4326),
                        ${data.geohash}, ${data.bloom_filter}
                        )
                        RETURNING id, first_name, last_name, email, phone_number, age, gender, 
                        min_preferred_age, max_preferred_age, preferred_gender, 
                        geohash, bloom_filter;
                    `;
                                        
                    return newUser;
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