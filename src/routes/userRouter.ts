import {Request, Response, Router} from "express";
import { BehaviourLikedSchema, ImageLikedSchema, LoginSchema, RegistrationSchema, RejectSchema } from "../zod";
import prisma from "../db";
import jwt from "jsonwebtoken";
import { authMiddleware, CustomRequest } from "../middleware";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import bcrypt from "bcrypt";
import BitSet from "bitset";
import { updateAddBloomFilter } from "../helpers";


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

router.post("/imageLiked" , authMiddleware ,async (req:CustomRequest, res:Response)=>{
    const imageLikedDetails = req.body;
    const parsedResult = ImageLikedSchema.safeParse(imageLikedDetails);
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
        const registrationDetails = req.body;
        const parsedResult = RegistrationSchema.safeParse(registrationDetails);
        if(!parsedResult.success){
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
        const geohash = ngeohash.encode(parsedResult.data.latitude, parsedResult.data.longitude, 9);

        // hash the password
        const passwordHash = await bcrypt.hash(parsedResult.data.password, 10);
        try{
            
            // Create images Array 
            const user = await prisma.$transaction(async (tx)=>{
                // Create new user
                const user = await tx.user.create({
                    firstName:parsedResult.data.firstName,
                    lastName:parsedResult.data.lastName,
                    email:parsedResult.data.email,
                    password:passwordHash,
                    phoneNumber:parsedResult.data.phoneNumber,
                    age:parsedResult.data.age,
                    gender:parsedResult.data.gender,
                    min_age:parsedResult.data.min_age,
                    max_age:parsedResult.data.max_age,
                    preferredGender:parsedResult.data.preferredGender,
                    latitude:parsedResult.data.latitude,
                    longitude:parsedResult.data.longitude,
                    customRadius:parsedResult.data.customRadius,
                    geohash:geohash,
                    bloom_filter: new BitSet(process.env.BLOOM_FILTER_SIZE!).toString()
                })
                // Create Images
                await tx.images.createMany({
                    data:images.map(image=>{
                        return{
                            url:image.url,
                            user_id:user.id
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
                                user_id:user.id
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
        await prisma.user.update({
            where:{
                id:Number(req.userId!)
            },
            data:{
                bloom_filter:updatedBloomFilter
            }
        })
        res.status(200).json({message:"Rejected successfully"});
    }
    catch(err){
        console.error("Reject Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})

router.get("/allLikes" , authMiddleware , async(req:CustomRequest, res:Response)=>{
    try{
        const likes = await prisma.likes.findMany({
            where:{
                liked_to:Number(req.userId!)
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
            }
        })
        res.status(200).json(user);
    }
    catch(err){
        console.error("getUser Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})

router.get("/chats/:id", authMiddleware , async (req:CustomRequest, res:Response)=>{
    const otherUserId = req.params.id;
    if(!otherUserId || typeof otherUserId !== "string"){
        res.status(400).json({message:"Invalid Request"});
        return;
    }
    try{
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
        chats = chats.sort((a,b)=>b.created_at.getTime()-a.created_at.getTime());
        res.status(200).json(chats);
    }
    catch(err){
        console.error("getChats Failed" , err);
        res.status(500).json({message:"Internal Server Error"});
    }
})



export default router;