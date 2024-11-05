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
                    // location:{
                    //     latitude:number,
                    //     longitude:number
                    // }
                }){
                    
                    const point = `POINT(${data.longitude} ${data.latitude})`;
                    const newUser:User&{
                        id:number
                    } = await prisma.$queryRaw`
                        INSERT INTO "User" (
                        first_name, last_name, email, password, phone_number, age, gender, preferred_gender, 
                        geohash, bloom_filter, latitude, longitude, occupation, region, religion, date_of_birth, home_town
                        ) VALUES (
                        ${data.firstName}, ${data.lastName}, ${data.email}, ${data.password},
                        ${data.phoneNumber}, ${data.age}, ${data.gender}, ${data.preferredGender}, 
                        -- ST_GeomFromText(${point}, 4326),
                        ${data.geohash}, ${data.bloom_filter}, ${data.latitude}, ${data.longitude}, 
                        ${data.occupation}, ${data.region}, ${data.religion}, ${data.date_of_birth}, ${data.home_town}
                        )
                        RETURNING id, first_name, last_name, email, phone_number, age, gender, preferred_gender, 
                        geohash, bloom_filter, latitude, longitude, occupation, region, religion, date_of_birth, home_town;
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