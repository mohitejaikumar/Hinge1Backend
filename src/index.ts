import express from "express";
import cors from "cors";
import usersRouter from "./routes/userRouter";
import { WebSocketServer } from 'ws';
import ChatManager from "./managers/ChatManager";

const wss = new WebSocketServer({ port: 8080 });


wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', async(raw:{
        toString():string,
    })=>{
        console.log('received: %s', raw);
        const {type , payload} = JSON.parse(raw.toString());
        switch(type){
            case "join":
                await ChatManager.getInstance().join(payload.userId,ws);
                break;
            case "chat":
                await ChatManager.getInstance().sendMessage(payload.senderId,payload.receiverId,payload.message);
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

app.use("/users" , usersRouter );

app.get("/", (req,res)=>{
    res.send("Hello World");
})

app.listen(3000, ()=>{
    console.log("Server started on port 3000");
})