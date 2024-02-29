import express, { Request, Response } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import os from "os";
import multer from "multer";
import ejs from "ejs";


import * as middlewares from "./middlewares";
import api from "./api";
import MessageResponse from "./interfaces/MessageResponse";
import credential from "./libs/credential.json"

require("dotenv").config();

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.engine("ejs", ejs.renderFile);
app.set("views", path.join(__dirname, "views")); // Ubah path ini sesuai dengan struktur folder Anda
app.set("view engine", "ejs");


const SCOPES = ["https://www.googleapis.com/auth/drive"];

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, callback) => callback(null, `${file.originalname}`),
});
const upload = multer({ storage: storage });

async function googleAuth() {
  const auth = new google.auth.JWT(credential.client_email, '', credential.private_key, SCOPES);

  return auth;
}

async function uploadDrive(req: Request, res: Response) {
  try {
    const file = req.file;

    if (!file) {
      throw new Error("No file uploaded");
    }

    const auth = await googleAuth();

    const { data } = await google
      .drive({ version: "v3", auth: auth })
      .files.create({
        media: {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.path),
        },
        requestBody: {
          name: file.originalname,
          parents: ["1eGPVmtWdW2jbcqmV_6CL6vrABYxvxttR"], 
        },
        fields: "id,name",
      });

    console.log(`File uploaded successfully -> ${JSON.stringify(data)}`);

    res.json({
      status: 1,
      message: "success",
      file_id: data.id,
      file_name: data.name,
    });
  } catch (error: any) {
    console.log(error);
    res.json({ status: -1, message: "failure", err: error.message });
  }
}


app.get<{}, MessageResponse>("/", (req,res) => {
  res.render("index")
})
app.post("/upload", upload.single("drive_file"), uploadDrive);






app.use("/api/v1", api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
