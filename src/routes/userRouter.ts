import {Request, Response, Router} from "express";
import { AcceptSchema, BehaviourLikedSchema, GoogleLoginSchema, ImageLikedSchema, LoginSchema, RegistrationSchema, RejectSchema } from "../zod";
import prisma from "../db";
import jwt from "jsonwebtoken";
import { authMiddleware, CustomRequest } from "../middleware";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import bcrypt from "bcrypt";
import BitSet from "bitset";
import { calculateAge, checkIfExistsInBloom, updateAddBloomFilter } from "../helpers";
import ngeohash from "ngeohash";
import { User } from "@prisma/client";


const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_BUCKET!,
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
            cb(null, `${Date.now()}-${file.originalname}`)
        }
    })
})



const router = Router();

router.post('/login' , async (req:Request, res:Response)=>{

    const loginDetails = req.body;
    
    const parsedResult = LoginSchema.safeParse(loginDetails);
    if(!parsedResult.success){
        res.status(400).json({message:"Invalid Body"});
        return;
    }
    const user = await prisma.user.findUnique({
        where:{
            email:loginDetails.email
        }
    })
    if(!user){
        res.status(400).json({message:"User not found"});
        return;
    }
    const passwordCompare = await bcrypt.compare(loginDetails.password,user.password);
    if(!passwordCompare){
        res.status(400).json({message:"Invalid Credentials"});
        return;
    }

    const token = jwt.sign({
        userId:user.id
    },process.env.JWT_SECRET!);

    res.json({token});
})

router.post('/googleLogin' , async (req:Request, res:Response)=>{
    const googleLoginDetails = req.body;
    const parsedResult = GoogleLoginSchema.safeParse(googleLoginDetails);
    if(!parsedResult.success){
        res.status(400).json({message:"Invalid Body"});
        return;
    }
    try{
        const user = await prisma.user.findUnique({
            where:{
                email:parsedResult.data.email
            }
        })
        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        const token = jwt.sign({
            userId:user.id
        },process.env.JWT_SECRET!);

        res.json({token});
    }
    catch(err){
        console.error("googleLogin Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})

router.post("/imageLiked" , authMiddleware ,async (req:CustomRequest, res:Response)=>{
    const imageLikedDetails = req.body;
    console.log(imageLikedDetails);
    const parsedResult = ImageLikedSchema.safeParse(imageLikedDetails);
    if(!parsedResult.success){
        console.log(parsedResult.error);
        res.status(400).json({message:"Invalid Body"});
        return;
    }
    try{
        // check user exists
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            }
        })
        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        // update bloom filter
        const updatedBloomFilter = updateAddBloomFilter(user.bloom_filter , parsedResult.data.likedUserId);
        
        await prisma.$transaction(async (tx)=>{
            await tx.likes.create({
                data:{
                    image_id:Number(parsedResult.data.imageId),
                    liked_by:Number(req.userId!),
                    liked_to:Number(parsedResult.data.likedUserId),
                    comment:parsedResult.data.comment
                }
            })
            await tx.user.update({
                where:{
                    id:Number(req.userId!)
                },
                data:{
                    bloom_filter:updatedBloomFilter
                }
            })
        })
        console.log("imageLiked successfully");
    }
    catch(err){
        console.error("image like failed" , err);
        res.status(500).json({message:"Internal Server Error"});
        return;
    }
    res.json({
        message:"Image Liked",
    })
    
})

router.post("/behaviourLiked" , authMiddleware ,async (req:CustomRequest, res:Response)=>{
    const behaviourLikedDetails = req.body;
    const parsedResult = BehaviourLikedSchema.safeParse(behaviourLikedDetails);
    if(!parsedResult.success){
        res.status(400).json({message:"Invalid Body"});
        return;
    }
    try{
        // check user exists
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            }
        })
        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        // update bloom filter
        const updatedBloomFilter = updateAddBloomFilter(user.bloom_filter , parsedResult.data.likedUserId);
        
        await prisma.$transaction(async (tx)=>{
            await tx.likes.create({
                data:{
                    behaviour_id:Number(parsedResult.data.behaviourId),
                    liked_by:Number(req.userId!),
                    liked_to:Number(parsedResult.data.likedUserId),
                    comment:parsedResult.data.comment
                }
            })
            await tx.user.update({
                where:{
                    id:Number(req.userId!)
                },
                data:{
                    bloom_filter:updatedBloomFilter
                }
            })
        })
        console.log("berhavourLiked successfully");
    }
    catch(err){
        console.error("behaviour like failed" , err);
        res.status(500).json({message:"Internal Server Error"});
        return;
    }
    res.json({
        message:"behaviour Liked",
    })
    
})

router.post("/register" , upload.array("images") , async (req, res:Response)=>{
        const registrationDetails = JSON.parse(req.body.userData);
        const parsedResult = RegistrationSchema.safeParse(registrationDetails);
        if(!parsedResult.success){
            console.log(parsedResult.error);
            res.status(400).json({message:"Invalid Body"});
            return;
        }
        // Check if any files were uploaded
        if (!req.files || req.files.length === 0) {
            console.log("No files uploaded");
            res.status(400).json({message:"No files uploaded"});
            return;
        }
        
        const images:{
            url:string,
            key:string,
            originalName:string
            //@ts-ignore
        }[] = req.files.map(file => ({
            url: file.location,
            key: file.key,
            originalName: file.originalname,
        }));

        // calculate geohash
        const geohash = ngeohash.encode(parsedResult.data.latitude, parsedResult.data.longitude, 4);
        
        // hash the password
        const passwordHash = await bcrypt.hash(parsedResult.data.password, 10);
        const age = calculateAge(parsedResult.data.date_of_birth);
        console.log(parsedResult.data , age);
        try{
            
            // Create images Array 
            const user = await prisma.$transaction(async (tx)=>{
                console.log("inside transaction");
                // Create new user
                const user = await tx.user.create({
                    firstName:parsedResult.data.firstName,
                    lastName:parsedResult.data.lastName,
                    email:parsedResult.data.email,
                    password:passwordHash,
                    phoneNumber:parsedResult.data.phoneNumber,
                    age:age,
                    occupation:parsedResult.data.occupation,
                    region:parsedResult.data.region,
                    religion:parsedResult.data.religion,
                    date_of_birth:parsedResult.data.date_of_birth,
                    home_town:parsedResult.data.home_town,
                    gender:parsedResult.data.gender,
                    preferredGender:parsedResult.data.preferredGender,
                    latitude:parsedResult.data.latitude,
                    longitude:parsedResult.data.longitude,
                    dating_type:parsedResult.data.dating_type,
                    geohash:geohash,
                    bloom_filter: new BitSet().toString()
                })
                const userId = await tx.user.findUnique({
                    where:{
                        email:parsedResult.data.email
                    }
                })
                // Create Images
                await tx.images.createMany({
                    data:images.map(image=>{
                        return{
                            url:image.url,
                            user_id:userId?.id || 1
                        }
                    })
                })
                // upload behaviours 
                if(parsedResult.data.behaviours){
                    await tx.behaviour.createMany({
                        data:parsedResult.data.behaviours.map(behaviour=>{
                            return{
                                question:behaviour.question,
                                answer:behaviour.answer,
                                user_id:userId?.id || 1
                            }
                        })
                    })
                }
                return user;
            })

            const token = jwt.sign({
                userId:user.id
            },process.env.JWT_SECRET!);

            res.status(200).json({token});
        }
        catch(err){
            console.error("Registration Failed" , err);
            res.status(500).json({message:"Internal Server Error"});
        }
})

router.post("/reject" , authMiddleware , async (req:CustomRequest, res:Response)=>{
    const rejectDetails = req.body;
    const parsedResult = RejectSchema.safeParse(rejectDetails);
    if(!parsedResult.success){
        res.status(400).json({message:"Invalid Body"});
        return;
    }
    try{
        // check user exists
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            }
        })
        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        // update bloom filter
        const updatedBloomFilter = updateAddBloomFilter(user.bloom_filter , parsedResult.data.rejectedUserId);
        
        await prisma.$transaction(async (tx)=>{
            // update user bloom filter
            await tx.user.update({
                where:{
                    id:Number(req.userId!)
                },
                data:{
                    bloom_filter:updatedBloomFilter
                }
            })
            // remove this user from likes as well if exists 
            await tx.likes.deleteMany({
                where:{
                    liked_by:Number(parsedResult.data.rejectedUserId),
                    liked_to:Number(req.userId!)
                }
            })
        })
        console.log("rejected successfully");
        res.status(200).json({message:"Rejected successfully"});
    }
    catch(err){
        console.error("Reject Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})

router.get("/allLikes" , authMiddleware , async(req:CustomRequest, res:Response)=>{
    try{
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            }
        })
        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        const likes = await prisma.likes.findMany({
            where:{
                liked_to:Number(req.userId!)
            },
            include:{
                by_user:{
                    select:{
                        id:true,
                        first_name:true,
                        images:{
                            select:{
                                url:true,
                            }
                        }
                    }
                },
                image:{
                    select:{
                        url:true,
                        id:true
                    }
                },
                behaviour:{
                    select:{
                        question:true,
                        answer:true,
                        id:true
                    }
                }
            }
        })
        res.status(200).json(likes);
    }
    catch(err){
        console.error("getAllLikes Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})

router.get("/me" , authMiddleware , async(req:CustomRequest, res:Response)=>{
    try{
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            },
            select:{
                id:true,
                first_name:true,
                last_name:true,
                email:true,
                phone_number:true,
                age:true,
                gender:true,
                preferred_gender:true,
                occupation:true,
                region:true,
                religion:true,
                date_of_birth:true,
                home_town:true,
                dating_type:true,
                images:{
                    select:{
                        url:true,
                        id:true
                    }
                },
                behaviour:{
                    select:{
                        question:true,
                        answer:true,
                        id:true
                    }
                }
            }
        })
        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        res.status(200).json(user);
    }
    catch(err){
        console.error("getUser Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})

router.get("/profile/:id", authMiddleware , async (req:CustomRequest, res:Response)=>{
    const otherUserId = req.params.id;
    console.log("profile route called");
    if(!otherUserId){
        res.status(400).json({message:"Invalid Request"});
        return;
    }
    try{
        // check user exists
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            }
        })
        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        // check this user can see this profile or not 

        const likedUser = await prisma.likes.findUnique({
            where:{
                liked_by_liked_to:{
                    liked_by:Number(req.params.id),
                    liked_to:Number(req.userId!),
                }
            }
        })
        if(!likedUser){
            res.status(400).json({message:"Not authorized"});
            return;
        }
        const otherUser = await prisma.user.findUnique({
            where:{
                id:Number(otherUserId)
            },
            select:{
                id:true,
                first_name:true,
                last_name:true,
                email:true,
                phone_number:true,
                age:true,
                gender:true,
                preferred_gender:true,
                occupation:true,
                region:true,
                religion:true,
                date_of_birth:true,
                home_town:true,
                dating_type:true,
                images:{
                    select:{
                        url:true,
                        id:true
                    }
                },
                behaviour:{
                    select:{
                        question:true,
                        answer:true,
                        id:true
                    }
                }
            }
        })
        if(!otherUser){
            console.log("user not found");
            res.status(400).json({message:"User not found"});
            return;
        }
        console.log(otherUser);
        res.status(200).json(otherUser);
    }
    catch(err){
        console.error("getProfile Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})

router.get("/chats/:id", authMiddleware , async (req:CustomRequest, res:Response)=>{
    const otherUserId = req.params.id;
    if(!otherUserId){
        res.status(400).json({message:"Invalid Request"});
        return;
    }
    try{
        // check user exists
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            }
        })
        const otherUser = await prisma.user.findUnique({
            where:{
                id:Number(otherUserId)
            }
        })
        if(!user || !otherUser){
            res.status(400).json({message:"User not found"});
            return;
        }
        let chats = await prisma.$transaction(async (tx)=>{
            const sender_chat = await tx.chats.findMany({
                where:{
                    sender_id:Number(req.userId!),
                    receiver_id:Number(otherUserId)
                }
            })
            const receiver_chat = await tx.chats.findMany({
                where:{
                    receiver_id:Number(req.userId!),
                    sender_id:Number(otherUserId)
                }
            })
            return [...sender_chat , ...receiver_chat];
        })
        chats = chats.sort((a,b)=>a.created_at.getTime()-b.created_at.getTime());
        res.status(200).json(chats);
    }
    catch(err){
        console.error("getChats Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})
    
router.get('/allMatches', authMiddleware , async (req:CustomRequest, res:Response)=>{
    try{
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            },
            include:{
                matches_accepted:{
                    select:{
                        id:true,
                        first_person:{
                            select:{
                                id:true,
                                first_name:true,
                                images:{
                                    select:{
                                        id:true,
                                        url:true
                                    }
                                },
                                chats_sent:{
                                    take:1,
                                    orderBy:{
                                        created_at:"desc"
                                    },
                                    select:{
                                        message:true,
                                        created_at:true,
                                    }
                                },
                                chats_received:{
                                    take:1,
                                    orderBy:{
                                        created_at:"desc"
                                    },
                                    select:{
                                        message:true,
                                        created_at:true,
                                    }
                                }
                            }
                        }
                        
                    }
                },
                matches_initiated:{
                    select:{
                        second_person:{
                            select:{
                                id:true,
                                first_name:true,
                                images:{
                                    select:{
                                        id:true,
                                        url:true,
                                    }
                                },
                                chats_sent:{
                                    take:1,
                                    orderBy:{
                                        created_at:"desc"
                                    },
                                    select:{
                                        message:true,
                                        created_at:true,
                                    }
                                },
                                chats_received:{
                                    take:1,
                                    orderBy:{
                                        created_at:"desc"
                                    },
                                    select:{
                                        message:true,
                                        created_at:true,
                                    }
                                }
                            }
                        }
                        
                    }
            }
            }
        })

        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        let people = new Map();
        if(user?.matches_accepted){
            user.matches_accepted.forEach(match=>{
                people.set(match.first_person.id , match.first_person);
            })
        };
        if(user?.matches_initiated){
            user.matches_initiated.forEach(match=>{
                people.set(match.second_person.id , match.second_person);
            })
        };
        console.log(JSON.stringify(Array.from(people.values())));
        res.status(200).json({
            people:Array.from(people.values())
        });
    }
    catch(err){
        console.error("getChats Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})
// search in 100km radius 
router.get("/matches" , authMiddleware , async (req:CustomRequest, res:Response)=>{
    try{
        // check user exists
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            }
        })
        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        // find all neighbour hash 
        const neighbour = ngeohash.neighbors(user.geohash);
        let geohashes = [user.geohash];
        // find neighbour of this geohash as well 
        for(let i in neighbour){
            const neigh2 = ngeohash.neighbors(neighbour[i]);
            geohashes = [...geohashes, ...neigh2];
        }
        console.log(geohashes);
        //Execute raw query using approximate and precise filtering
        const preciseResults:User[] = await prisma.$queryRaw`
            SELECT 
                "User".id,
                "User".first_name,
                "User".last_name,
                "User".email,
                "User".phone_number,
                "User".age,
                "User".gender,
                "User".preferred_gender,
                "User".occupation,
                "User".region,
                "User".religion,
                "User".date_of_birth,
                "User".home_town,
                "User".dating_type,
                json_agg(DISTINCT "Images") AS images,        -- Aggregate related images into a JSON array
                json_agg(DISTINCT "Behaviour") AS behaviour -- Aggregate related behaviours into a JSON array
            FROM "User"
            LEFT JOIN "Images" ON "User".id = "Images".user_id          -- Join with Images table
            LEFT JOIN "Behaviour" ON "User".id = "Behaviour".user_id  -- Join with Behaviours table
            WHERE 
                geohash = ANY(${geohashes})
                AND "User".id != ${user.id}
                AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint("User".longitude::double precision, "User".latitude::double precision), 4326),
                    ST_SetSRID(ST_MakePoint(${Number(user.longitude)}, ${Number(user.latitude)}), 4326)::geography,
                    100 * 1000  -- Radius in meters
                )
                AND "User".gender = ${user.preferred_gender}
            GROUP BY "User".id  -- Group by User ID to aggregate images and behaviours
            LIMIT 10; -- Limit to 10 results
        `;

        let filteredResults = [];
        const userBloom = user.bloom_filter;
        for(const result of preciseResults){
                // check this user exits in bloom or not 
            if(!checkIfExistsInBloom(userBloom , result.id)){
                filteredResults.push(result);
            }
        }
        res.status(200).json(filteredResults);
    }
    catch(err){
        console.error("getMatches Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})

router.post('/accept' , authMiddleware , async (req:CustomRequest, res:Response)=>{
    const acceptDetails = req.body;
    console.log(acceptDetails);
    const parsedResult = AcceptSchema.safeParse(acceptDetails);
    if(!parsedResult.success){
        console.log(parsedResult.error);
        res.status(400).json({message:"Invalid Body"});
        return;
    }
    try{
        // check user exists
        const user = await prisma.user.findUnique({
            where:{
                id:Number(req.userId!)
            }
        })
        if(!user){
            res.status(400).json({message:"User not found"});
            return;
        }
        // check this user exists 
        const otherUser = await prisma.user.findUnique({
            where:{
                id:Number(parsedResult.data.acceptedUserId)
            }
        })
        if(!otherUser){
            res.status(400).json({message:"User not found"});
            return;
        }
        // update bloom filter
        const updatedBloomFilter = updateAddBloomFilter(user.bloom_filter , parsedResult.data.acceptedUserId);

        await prisma.$transaction(async (tx)=>{
            // remove this user from likes 
            await tx.likes.deleteMany({
                where:{
                    liked_by:Number(parsedResult.data.acceptedUserId),
                    liked_to:Number(req.userId!)
                }
            })
            // update bloom filter
            await tx.user.update({
                where:{
                    id:Number(req.userId!)
                },
                data:{
                    bloom_filter:updatedBloomFilter,
                }
            })
            // create match 
            await tx.matches.create({
                data:{
                    first_person_id:Number(parsedResult.data.acceptedUserId),
                    second_person_id:Number(req.userId!)
                }
            })
            await tx.chats.create({
                data:{
                    sender_id:Number(req.userId!),
                    receiver_id:Number(parsedResult.data.acceptedUserId),
                    message:parsedResult.data.message
                }
            })
        })
        
        console.log("accepted successfully");
        res.status(200).json({message:"Accepted successfully"});
    }
    catch(err){
        console.error("Accept Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }    
})



export default router;