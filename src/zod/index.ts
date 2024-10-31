import { z } from "zod";
import { Gender } from "@prisma/client";
export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string()
})

export const ImageLikedSchema = z.object({
    likedUserId: z.string(),
    imageId: z.string(),
    comment: z.string(),
})

export const BehaviourLikedSchema = z.object({
    likedUserId: z.string(),
    behaviourId: z.string(),
    comment: z.string()
})

export const RegistrationSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    password:z.string(),
    gender:z.enum([Gender.Male,Gender.Female,Gender.Lesbian]),
    phoneNumber:z.number(),
    age:z.number(),
    preferredGender:z.array(z.enum([Gender.Male,Gender.Female,Gender.Lesbian])),
    latitude:z.string(),
    longitude:z.string(),
    min_age:z.number(),
    max_age:z.number(),
    behaviours:z.array(z.object({
        question:z.string(),
        answer:z.string()
    })).optional(),
    customRadius:z.number(),
})

export type TRegistrationSchema = z.infer<typeof RegistrationSchema>;

export interface Behaviour{
    question:string,
    answer:string
}