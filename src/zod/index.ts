import { z } from "zod";
export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string()
})

export const ImageLikedSchema = z.object({
    likedUserId: z.number(),
    imageId: z.number(),
    comment: z.string(),
})

export const BehaviourLikedSchema = z.object({
    likedUserId: z.number(),
    behaviourId: z.number(),
    comment: z.string()
})

export const RegistrationSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    password:z.string(),
    gender:z.string(),
    phoneNumber:z.string(),
    age:z.number().optional(),
    preferredGender:z.string(),
    latitude:z.string(),
    longitude:z.string(),
    behaviours:z.array(z.object({
        question:z.string(),
        answer:z.string()
    })).optional(),
    occupation: z.string(),       
    region: z.string(),           
    religion: z.string(),         
    date_of_birth: z.string(),    
    home_town:z.string(),
    dating_type:z.string()        
})

export const RejectSchema = z.object({
    rejectedUserId:z.number()
})
export const AcceptSchema = z.object({
    acceptedUserId:z.number(),
    message:z.string(),
})
export const GoogleLoginSchema = z.object({
    email:z.string().email(),
})
export type TRegistrationSchema = z.infer<typeof RegistrationSchema>;

export interface Behaviour{
    question:string,
    answer:string
}