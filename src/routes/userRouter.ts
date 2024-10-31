import {Request, Response, Router} from "express";
import { BehaviourLikedSchema, ImageLikedSchema, LoginSchema, RegistrationSchema } from "../zod";
import prisma from "../db";
import jwt from "jsonwebtoken";
import { authMiddleware, CustomRequest } from "../middleware";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import ngeohash from "ngeohash";
import BitArray from "bit-array";


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

    if(user.password !== loginDetails.password){
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
        await prisma.likes.create({
            data:{
                image_id:Number(parsedResult.data.imageId),
                liked_by:Number(req.userId!),
                liked_to:Number(parsedResult.data.likedUserId),
                comment:parsedResult.data.comment
            }
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
        await prisma.likes.create({
            data:{
                behaviour_id:Number(parsedResult.data.behaviourId),
                liked_by:Number(req.userId!),
                liked_to:Number(parsedResult.data.likedUserId),
                comment:parsedResult.data.comment
            }
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

        try{
            
            // Create images Array 
            await prisma.$transaction(async (tx)=>{
                // Create new user
                const user = await tx.user.create({
                    firstName:parsedResult.data.firstName,
                    lastName:parsedResult.data.lastName,
                    email:parsedResult.data.email,
                    password:parsedResult.data.password,
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
                    bloom_filter: new BitArray(Number(process.env.BLOOM_FILTER_SIZE!)).toString()
                })
                // Create Images
                await tx.images.createMany({
                    data:images.map(image=>{
                        return{
                            url:image.url,
                            user_id:12,
                            
                        }
                    })
                })
            })
        }
        catch(err){
            console.error("Registration Failed" , err);
        }
})



export default router;