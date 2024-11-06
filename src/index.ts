import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import usersRouter from "./routes/userRouter";
import { WebSocketServer } from 'ws';
import ChatManager from "./managers/ChatManager";
import jwt from "jsonwebtoken";

const wss = new WebSocketServer({ port: 8080 });


wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', async(raw:{
        toString():string,
    })=>{
        console.log('received: %s', raw);
        const {type , payload} = JSON.parse(raw.toString());
        let userId="";
        // check token 
        try{
            const decodedToken = jwt.verify(payload.token,process.env.JWT_SECRET!);
            //@ts-ignore
            userId = decodedToken.userId;
        }
        catch(err){
            console.error("Invalid Token" , err);
            return;
        }
        
        switch(type){
            case "join":
                await ChatManager.getInstance().join(userId,ws);
                break;
            case "chat":
                await ChatManager.getInstance().sendMessage(userId,payload.receiverId,payload.message);
                break;
            default:
                break;
        }
    });
    ws.on('close', ()=>{
        ChatManager.getInstance().clearUser(ws);
    })
});

const app = express();
app.use(cors());
app.use(express.json());

app.use("/users" , usersRouter );

app.get("/", (req,res)=>{
    res.send("Hello World");
})

app.post('/upload' , async (req,res)=>{
    console.log(req.body);
    res.send("Uploaded");
})

app.listen(3000, ()=>{
    console.log("Server started on port 3000");
})