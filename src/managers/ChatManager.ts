import { WebSocket } from "ws";
import prisma from "../db";


export interface User{
    userId:string,
    socket:WebSocket
}

export default class ChatManager{
    private static instance:ChatManager;
    private users: Map<string, User>;


    private constructor(){
        this.users = new Map();
    }


    static getInstance(){
        if(!this.instance){
            this.instance = new ChatManager();

        }
        return this.instance;
    }
    
    async join(userId:string , socket:WebSocket){
        // check this user exists
        try{
            const user = await prisma.user.findUnique({
                where:{
                    id:Number(userId)
                }
            })
            if(!user){
                console.log("User not found");
                return;
            }
            // add this user 
            this.users.set(userId,{
                userId:userId,
                socket:socket
            })
        }
        catch(err){
            console.error("join failed" , err);
            
        }
    }

    async sendMessage(senderId:string, receiverId:string , message:string){
        // check sender exists
        try{
            const sender = await prisma.user.findUnique({
                where:{
                    id:Number(senderId)
                }
            })
            const receiver = await prisma.user.findUnique({
                where:{
                    id:Number(receiverId)
                }
            })
            if(!sender || !receiver){
                console.log("User not found");
                return;
            }
            // send message check if both websocket are connected 
            const senderWs = this.users.get(senderId);
            const receiverWs = this.users.get(receiverId);
            if(!senderWs || !receiverWs){
                console.log("ws connection not found");
                return;
            }
            // update db 
            await prisma.chats.create({
                data:{
                    sender_id:Number(senderId),
                    receiver_id:Number(receiverId),
                    message:message,
                }
            })
            console.log("updated chats in db");
            receiverWs.socket.send(JSON.stringify({
                type:"chat",
                payload:{
                    senderId:senderId,
                    message:message
                }
            }))
        }
        catch(err){
            console.error("sendMessage failed" , err);
        }
    }
    
    clearUser(ws:WebSocket){
        this.users.forEach((user)=>{
            if(user.socket === ws){
                this.users.delete(user.userId);
                console.log("user disconnected");
            }
        })
    }


}