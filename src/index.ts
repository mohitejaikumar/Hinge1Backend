import express from "express";
import cors from "cors";
import usersRouter from "./routes/userRouter";

const app = express();
app.use(cors());

app.use("/users" , usersRouter );

app.get("/", (req,res)=>{
    res.send("Hello World");
})

app.listen(3000, ()=>{
    console.log("Server started on port 3000");
})