import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.route";
import leadRoutes from "./routes/lead.route";

const app = express();
app.use(helmet());

app.use(
    cors({
        origin: "*"
    })
);

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.get(
  "/",
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Lead Management API is running"
    });
  }
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/leads",
  leadRoutes
)

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }
);

export default app;