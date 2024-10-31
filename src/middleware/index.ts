import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface CustomRequest extends Request{
    userId?: string;
}

export const authMiddleware = (req:CustomRequest, res:Response, next:NextFunction)=>{
    console.log("Middleware called");
    const token = req.headers.authorization;

    if(!token || typeof token !== "string"){
        res.status(401).json({message:"Unauthorized"});
        return;
    }

    try{
        const decodedToken = jwt.verify(token,process.env.JWT_SECRET! );
        //@ts-ignore
        req.userId = decodedToken.userId;
        next();
    }
    catch(err){
        res.status(401).json({message:"Invalid Token"});
    }

}