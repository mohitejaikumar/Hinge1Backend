import {Request, Response, Router} from "express";
import { LoginSchema } from "../zod";
import prisma from "../db";
import jwt from "jsonwebtoken";

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





export default router;