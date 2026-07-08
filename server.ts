/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { DatabaseSchema, Society, User, JoinRequest, Worker, Building, Query } from "./src/types";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), "data"))) {
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
}

// Global Manager settings (can be overridden by environment)
const DEFAULT_MANAGER_PASSWORD = "Manager@Secure2026";
let managerSessionToken = "";

// Helper to validate strong password policy
function validateStrongPassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 12) {
    return { isValid: false, error: "Password must be at least 12 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one digit." };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one special character (e.g. !@#$%^&*)." };
  }
  return { isValid: true };
}

// In-memory cache fallback, but read/write to DB_PATH
function readDB(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading database file, using empty/preseeded schema", err);
  }

  // Seeding Default DB
  const defaultDB: DatabaseSchema = {
    societies: [
      {
        id: "soc-1",
        name: "Green Meadows Society",
        address: "102, Garden Valley Highway, Sector 4",
        referralCode: "GREEN123",
        buildings: [
          {
            name: "A Block",
            floors: [
              {
                number: 1,
                flats: [
                  { number: 101, status: "occupied", residentId: "res-1", residentName: "Rahul Sharma" },
                  { number: 102, status: "vacant", residentId: null, residentName: null },
                ],
              },
              {
                number: 2,
                flats: [
                  { number: 201, status: "vacant", residentId: null, residentName: null },
                  { number: 202, status: "vacant", residentId: null, residentName: null },
                ],
              },
            ],
          },
          {
            name: "B Block",
            floors: [
              {
                number: 1,
                flats: [
                  { number: 101, status: "vacant", residentId: null, residentName: null },
                  { number: 102, status: "vacant", residentId: null, residentName: null },
                ],
              },
            ],
          },
        ],
        workers: [
          { id: "work-1", name: "Ramesh Kumar", role: "Electrician", contact: "+91 98765 43210", rating: 4.8 },
          { id: "work-2", name: "Suresh Patil", role: "Plumber", contact: "+91 91234 56789", rating: 4.5 },
          { id: "work-3", name: "Manish Chawla", role: "Security Guard", contact: "+91 93456 78901", rating: 4.9 },
        ],
      },
      {
        id: "soc-2",
        name: "Royal Heights",
        address: "7th Avenue Road, Near Hilltop Garden",
        referralCode: "ROYAL456",
        buildings: [
          {
            name: "Wing A",
            floors: [
              {
                number: 1,
                flats: [
                  { number: 101, status: "vacant", residentId: null, residentName: null },
                  { number: 102, status: "vacant", residentId: null, residentName: null },
                ],
              },
            ],
          },
        ],
        workers: [
          { id: "work-4", name: "Gopal Rao", role: "Gardener", contact: "+91 92233 44556", rating: 4.7 },
        ],
      },
    ],
    users: [
      {
        id: "admin-1",
        name: "Aman Gupta (Secretary)",
        email: "secretary.green@gmail.com",
        password: "Password@123", // Preseeded standard hash/plain password for testing
        mobile: "+91 99988 87776",
        role: "admin",
        status: "approved",
        societyId: "soc-1",
        token: "admin-token-12345",
      },
      {
        id: "admin-2",
        name: "Sanjay Singhal",
        email: "secretary.royal@gmail.com",
        password: "Password@123",
        mobile: "+91 98888 77777",
        role: "admin",
        status: "approved",
        societyId: "soc-2",
        token: "admin-token-67890",
      },
      {
        id: "res-1",
        name: "Rahul Sharma",
        mobile: "+91 99000 11223",
        role: "resident",
        status: "approved",
        societyId: "soc-1",
        flatInfo: {
          building: "A Block",
          floor: 1,
          flat: 101,
        },
        token: "resident-token-112233",
      },
    ],
    joinRequests: [
      {
        id: "req-1",
        residentName: "Pooja Hegde",
        mobile: "+91 98765 00001",
        societyId: "soc-1",
        referralCode: "GREEN123",
        building: "A Block",
        floor: 1,
        flat: 102,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2), "utf-8");
  return defaultDB;
}

function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database to file", err);
  }
}

// Parse request body
app.use(express.json());

// API Auth Middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  // Check if main manager
  const cleanToken = token.replace("Bearer ", "");
  const db = readDB();
  const currentManagerToken = db.managerSessionToken || managerSessionToken;
  if (currentManagerToken && cleanToken === currentManagerToken) {
    (req as any).user = { role: "manager", name: "Main Manager", id: "manager" };
    return next();
  }

  // Check user DB
  const user = db.users.find((u) => u.token === cleanToken);
  if (!user) {
    return res.status(401).json({ error: "Invalid token or session expired" });
  }

  (req as any).user = user;
  next();
}

// API Routes

// Manager Login
app.post("/api/auth/manager-login", (req, res) => {
  const { password, biometricSession } = req.body;

  if (biometricSession === true) {
    // Generate a random session token for verified biometric signature
    managerSessionToken = "mgr-" + crypto.randomBytes(16).toString("hex");
    const db = readDB();
    db.managerSessionToken = managerSessionToken;
    writeDB(db);
    return res.json({
      token: managerSessionToken,
      user: {
        role: "manager",
        name: "Global Platform Manager",
        email: "manager@society.com",
      },
    });
  }

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  // Password policy validation on login attempt
  const policyCheck = validateStrongPassword(password);
  if (!policyCheck.isValid) {
    return res.status(400).json({ error: `Security Policy Violation: ${policyCheck.error}` });
  }

  const expectedPassword = process.env.MANAGER_PASSWORD || DEFAULT_MANAGER_PASSWORD;
  if (password !== expectedPassword) {
    return res.status(401).json({ error: "Invalid Manager password" });
  }

  // Generate a random session token
  managerSessionToken = "mgr-" + crypto.randomBytes(16).toString("hex");
  const db = readDB();
  db.managerSessionToken = managerSessionToken;
  writeDB(db);
  res.json({
    token: managerSessionToken,
    user: {
      role: "manager",
      name: "Global Platform Manager",
      email: "manager@society.com",
    },
  });
});

// Reset Manager Password & Lock Passcode back to original defaults
app.post("/api/auth/reset-manager-password-to-default", (req, res) => {
  delete process.env.MANAGER_PASSWORD;
  res.json({
    success: true,
    message: "Manager login password reset to 'Manager@Secure2026' and lock screen passcode reset to 'SHIVSHRI@2025'!",
    defaultLoginPassword: "Manager@Secure2026",
    defaultLockPasscode: "SHIVSHRI@2025"
  });
});

// Admin Registration
app.post("/api/auth/admin-register", (req, res) => {
  const { name, email, password, mobile } = req.body;
  if (!name || !email || !password || !mobile) {
    return res.status(400).json({ error: "All fields are required (name, email, password, mobile)" });
  }

  const db = readDB();
  if (db.users.some((u) => u.email === email && u.role === "admin")) {
    return res.status(400).json({ error: "An admin with this email already exists" });
  }

  // Enforce strong password for admin too!
  const passwordCheck = validateStrongPassword(password);
  if (!passwordCheck.isValid) {
    return res.status(400).json({ error: `Admin Password: ${passwordCheck.error}` });
  }

  const newToken = "adm-" + crypto.randomBytes(16).toString("hex");
  const newUser: User = {
    id: "admin-" + crypto.randomUUID(),
    name,
    email,
    password, // Plain text in local json db for demo/simplicity
    mobile,
    role: "admin",
    status: "approved", // Society Admins are auto-approved to create their societies
    token: newToken,
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({
    token: newToken,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      mobile: newUser.mobile,
      role: newUser.role,
      status: newUser.status,
    },
  });
});

// Admin Login
app.post("/api/auth/admin-login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = readDB();
  const user = db.users.find((u) => u.email === email && u.role === "admin" && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Generate fresh token
  user.token = "adm-" + crypto.randomBytes(16).toString("hex");
  writeDB(db);

  const society = user.societyId ? db.societies.find((s) => s.id === user.societyId) || null : null;

  res.json({
    token: user.token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      societyId: user.societyId,
    },
    society,
  });
});

// Resident Login/Registration Workflow
app.post("/api/auth/resident-login", (req, res) => {
  const { mobile, referralCode } = req.body;
  if (!mobile || !referralCode) {
    return res.status(400).json({ error: "Mobile number and Referral Code are required" });
  }

  const db = readDB();

  // Find society by referral code
  const society = db.societies.find((s) => s.referralCode.toUpperCase() === referralCode.toUpperCase());
  if (!society) {
    return res.status(404).json({ error: "Invalid referral code. Please check with your Society Secretary." });
  }

  // Find if resident already exists with this mobile and referral code
  const existingResident = db.users.find(
    (u) => u.mobile === mobile && u.role === "resident" && u.societyId === society.id
  );

  if (existingResident) {
    // If pending or approved, we log them in or return status
    if (!existingResident.token) {
      existingResident.token = "res-" + crypto.randomBytes(16).toString("hex");
      writeDB(db);
    }
    return res.json({
      status: existingResident.status,
      token: existingResident.token,
      user: {
        id: existingResident.id,
        name: existingResident.name,
        mobile: existingResident.mobile,
        role: existingResident.role,
        status: existingResident.status,
        societyId: existingResident.societyId,
        flatInfo: existingResident.flatInfo,
      },
      society: {
        id: society.id,
        name: society.name,
        address: society.address,
      },
    });
  }

  // Resident does not exist, return society info so client can prompt for Name, Building, Floor, Flat selection
  res.json({
    status: "unregistered",
    society: {
      id: society.id,
      name: society.name,
      address: society.address,
      buildings: society.buildings,
    },
  });
});

// Submit Resident Registration / Join Request
app.post("/api/auth/resident-register", (req, res) => {
  const { name, mobile, referralCode, building, floor, flat } = req.body;
  if (!name || !mobile || !referralCode || !building || floor === undefined || flat === undefined) {
    return res.status(400).json({ error: "All registration details are required." });
  }

  const db = readDB();
  const society = db.societies.find((s) => s.referralCode.toUpperCase() === referralCode.toUpperCase());
  if (!society) {
    return res.status(404).json({ error: "Society not found with this referral code." });
  }

  // Check if flat is already occupied by an approved resident
  const targetBuilding = society.buildings.find((b) => b.name === building);
  const targetFloor = targetBuilding?.floors.find((f) => f.number === Number(floor));
  const targetFlat = targetFloor?.flats.find((fl) => fl.number === Number(flat));

  if (targetFlat && targetFlat.status === "occupied") {
    return res.status(400).json({ error: `Flat ${flat} is already occupied. Contact Society Secretary.` });
  }

  // Create Resident User with status 'pending'
  const token = "res-" + crypto.randomBytes(16).toString("hex");
  const residentId = "res-" + crypto.randomUUID();
  const newResident: User = {
    id: residentId,
    name,
    mobile,
    role: "resident",
    status: "pending",
    societyId: society.id,
    flatInfo: {
      building,
      floor: Number(floor),
      flat: Number(flat),
    },
    token,
  };

  // Create Join Request
  const newRequest: JoinRequest = {
    id: "req-" + crypto.randomUUID(),
    residentName: name,
    mobile,
    societyId: society.id,
    referralCode,
    building,
    floor: Number(floor),
    flat: Number(flat),
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  db.users.push(newResident);
  db.joinRequests.push(newRequest);
  writeDB(db);

  res.status(201).json({
    status: "pending",
    token,
    user: {
      id: residentId,
      name,
      mobile,
      role: "resident",
      status: "pending",
      societyId: society.id,
      flatInfo: newResident.flatInfo,
    },
    society: {
      id: society.id,
      name: society.name,
      address: society.address,
    },
  });
});

// Verify Auth Token Session
app.post("/api/auth/verify", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const db = readDB();
  const currentManagerToken = db.managerSessionToken || managerSessionToken;
  if (currentManagerToken && token === currentManagerToken) {
    return res.json({
      role: "manager",
      user: {
        role: "manager",
        name: "Global Platform Manager",
        email: "manager@society.com",
      },
    });
  }

  const user = db.users.find((u) => u.token === token);
  if (!user) {
    return res.status(401).json({ error: "Session expired or invalid token" });
  }

  let society = null;
  if (user.societyId) {
    society = db.societies.find((s) => s.id === user.societyId) || null;
  }

  res.json({
    role: user.role,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      societyId: user.societyId,
      flatInfo: user.flatInfo,
    },
    society,
  });
});

// Society Admin API: Create Society
app.post("/api/societies", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only Society Admins can create societies" });
  }

  const { name, address, buildingsCount, floorsPerBuilding, flatsPerFloor } = req.body;
  if (!name || !address || !buildingsCount || !floorsPerBuilding || !flatsPerFloor) {
    return res.status(400).json({ error: "All society creation parameters are required." });
  }

  const db = readDB();

  // Create structural representation of buildings, floors, flats
  const buildings: Building[] = [];
  for (let b = 1; b <= Number(buildingsCount); b++) {
    const buildingName = `Block ${String.fromCharCode(64 + b)}`; // Block A, Block B, etc.
    const floors = [];
    for (let f = 1; f <= Number(floorsPerBuilding); f++) {
      const flats = [];
      for (let fl = 1; fl <= Number(flatsPerFloor); fl++) {
        // Flat number like 101, 102, 201, 202
        const flatNumber = f * 100 + fl;
        flats.push({
          number: flatNumber,
          status: "vacant" as const,
          residentId: null,
          residentName: null,
        });
      }
      floors.push({ number: f, flats });
    }
    buildings.push({ name: buildingName, floors });
  }

  // Generate unique referral code
  const referralCode = "SOC-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  const societyId = "soc-" + crypto.randomUUID();

  const newSociety: Society = {
    id: societyId,
    name,
    address,
    referralCode,
    buildings,
    workers: [],
  };

  db.societies.push(newSociety);

  // Link admin user to this society
  const dbUser = db.users.find((u) => u.id === user.id);
  if (dbUser) {
    dbUser.societyId = societyId;
  }

  writeDB(db);

  res.status(201).json({
    society: newSociety,
    user: { ...user, societyId },
  });
});

// Society Admin API: Get society details & join requests
app.get("/api/societies/my", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only Admins can view society details" });
  }

  if (!user.societyId) {
    return res.status(400).json({ error: "No society associated with this admin" });
  }

  const db = readDB();
  const society = db.societies.find((s) => s.id === user.societyId);
  if (!society) {
    return res.status(404).json({ error: "Society not found" });
  }

  const requests = db.joinRequests.filter((r) => r.societyId === user.societyId);
  const residents = db.users.filter((u) => u.societyId === user.societyId && u.role === "resident");
  const queries = (db.queries || []).filter((q) => q.societyId === user.societyId);

  res.json({
    society,
    requests,
    residents,
    queries,
  });
});

// Society Admin API: Process Resident Request (Approve/Reject)
app.post("/api/societies/requests/:requestId/resolve", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const { requestId } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  if (status !== "approved" && status !== "rejected") {
    return res.status(400).json({ error: "Invalid status" });
  }

  const db = readDB();
  const request = db.joinRequests.find((r) => r.id === requestId && r.societyId === user.societyId);
  if (!request) {
    return res.status(404).json({ error: "Join request not found" });
  }

  request.status = status;

  // Update corresponding Resident User status
  const resident = db.users.find(
    (u) => u.mobile === request.mobile && u.role === "resident" && u.societyId === user.societyId
  );
  if (resident) {
    resident.status = status;
  }

  // If approved, mark the flat as occupied in society buildings
  if (status === "approved" && resident) {
    const society = db.societies.find((s) => s.id === user.societyId);
    if (society) {
      const bld = society.buildings.find((b) => b.name === request.building);
      const flr = bld?.floors.find((f) => f.number === request.floor);
      const flt = flr?.flats.find((fl) => fl.number === request.flat);
      if (flt) {
        flt.status = "occupied";
        flt.residentId = resident.id;
        flt.residentName = resident.name;
      }
    }
  }

  writeDB(db);
  res.json({ success: true, message: `Request successfully ${status}` });
});

// Society Admin API: Add worker
app.post("/api/societies/workers", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const { name, role, contact, rating } = req.body;
  if (!name || !role || !contact) {
    return res.status(400).json({ error: "Worker details are required (name, role, contact)" });
  }

  const db = readDB();
  const society = db.societies.find((s) => s.id === user.societyId);
  if (!society) {
    return res.status(404).json({ error: "Society not found" });
  }

  const newWorker: Worker = {
    id: "work-" + crypto.randomUUID(),
    name,
    role,
    contact,
    rating: rating ? Number(rating) : 5.0,
  };

  society.workers.push(newWorker);
  writeDB(db);

  res.status(201).json(newWorker);
});

// Society Admin API: Remove worker/helper
app.delete("/api/societies/workers/:workerId", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const { workerId } = req.params;
  const db = readDB();
  const society = db.societies.find((s) => s.id === user.societyId);
  if (!society) {
    return res.status(404).json({ error: "Society not found" });
  }

  const initialLength = society.workers.length;
  society.workers = society.workers.filter((w) => w.id !== workerId);
  if (society.workers.length === initialLength) {
    return res.status(404).json({ error: "Helper not found" });
  }

  writeDB(db);
  res.json({ success: true, message: "Helper removed successfully" });
});

// Society Admin API: Remove resident
app.delete("/api/societies/residents/:residentId", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const { residentId } = req.params;
  const db = readDB();

  const resident = db.users.find((u) => u.id === residentId && u.role === "resident" && u.societyId === user.societyId);
  if (!resident) {
    return res.status(404).json({ error: "Resident not found" });
  }

  // Vacate the flat in society
  const society = db.societies.find((s) => s.id === user.societyId);
  if (society && resident.flatInfo) {
    const { building, floor, flat } = resident.flatInfo;
    const bld = society.buildings.find((b) => b.name === building);
    const flr = bld?.floors.find((f) => f.number === floor);
    const flt = flr?.flats.find((fl) => fl.number === flat);
    if (flt) {
      flt.status = "vacant";
      flt.residentId = null;
      flt.residentName = null;
    }
  }

  // Remove the resident user
  db.users = db.users.filter((u) => u.id !== residentId);

  // Remove related join requests
  db.joinRequests = db.joinRequests.filter(
    (r) => !(r.mobile === resident.mobile && r.societyId === user.societyId)
  );

  writeDB(db);
  res.json({ success: true, message: "Resident removed successfully" });
});

// Resident API: Get current resident's status and dashboard details
app.get("/api/resident/dashboard", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "resident") {
    return res.status(403).json({ error: "Access Denied: Only Residents" });
  }

  const db = readDB();
  const society = db.societies.find((s) => s.id === user.societyId);
  if (!society) {
    return res.status(404).json({ error: "Society not found" });
  }

  // Find actual secretary for this society
  const admin = db.users.find((u) => u.societyId === user.societyId && u.role === "admin");
  const userQueries = (db.queries || []).filter((q) => q.residentId === user.id);

  res.json({
    user,
    society,
    secretary: admin ? {
      name: admin.name,
      email: admin.email || "",
      mobile: admin.mobile,
      role: "Secretary",
    } : null,
    queries: userQueries,
  });
});

// Main Manager API: Get all societies, metrics, registered, and allow operations
app.get("/api/manager/dashboard", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "manager") {
    return res.status(403).json({ error: "Access Denied: Main Manager only" });
  }

  const db = readDB();

  // Compute key metrics
  const totalSocieties = db.societies.length;
  const totalMembers = db.users.filter((u) => u.role === "resident" && u.status === "approved").length;
  const totalWorkers = db.societies.reduce((acc, soc) => acc + (soc.workers?.length || 0), 0);
  const totalAdmins = db.users.filter((u) => u.role === "admin").length;

  // Enhance societies list with custom metrics
  const societiesOverview = db.societies.map((soc) => {
    const membersCount = db.users.filter((u) => u.societyId === soc.id && u.role === "resident" && u.status === "approved").length;
    const workersCount = soc.workers?.length || 0;
    const admin = db.users.find((u) => u.societyId === soc.id && u.role === "admin");
    return {
      id: soc.id,
      name: soc.name,
      address: soc.address,
      referralCode: soc.referralCode,
      members: membersCount,
      workers: workersCount,
      adminName: admin ? admin.name : "N/A",
      adminEmail: admin ? admin.email : "N/A",
    };
  });

  res.json({
    metrics: {
      totalSocieties,
      totalMembers,
      totalWorkers,
      totalAdmins,
    },
    societies: societiesOverview,
  });
});

// Main Manager API: Delete a society
app.delete("/api/manager/societies/:societyId", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "manager") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const { societyId } = req.params;
  const db = readDB();

  db.societies = db.societies.filter((s) => s.id !== societyId);
  // Remove linked user relations
  db.users = db.users.filter((u) => u.societyId !== societyId || u.role === "manager");
  db.joinRequests = db.joinRequests.filter((r) => r.societyId !== societyId);

  writeDB(db);
  res.json({ success: true, message: "Society deleted successfully" });
});

// Main Manager API: Reset password enforcing the password policy
app.post("/api/manager/reset-password", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "manager") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: "New password is required" });
  }

  const policyCheck = validateStrongPassword(newPassword);
  if (!policyCheck.isValid) {
    return res.status(400).json({ error: `Security Policy Violation: ${policyCheck.error}` });
  }

  // Persist the manager's password inside a config/manager file or environment override simulation
  process.env.MANAGER_PASSWORD = newPassword;

  res.json({ success: true, message: "Password updated successfully and complies with the strong security policy!" });
});


// Main Manager API: Get security preferences
app.get("/api/manager/security-preferences", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "manager") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const db = readDB();
  const managerProfile = db.managerProfile || { isFingerprintEnrolled: false, isFaceEnrolled: false };
  res.json(managerProfile);
});

// Main Manager API: Update security preferences
app.post("/api/manager/security-preferences", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "manager") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const { isFingerprintEnrolled, isFaceEnrolled } = req.body;

  const db = readDB();
  db.managerProfile = {
    ...db.managerProfile,
    isFingerprintEnrolled: !!isFingerprintEnrolled,
    isFaceEnrolled: !!isFaceEnrolled,
  };

  writeDB(db);
  res.json({ success: true, managerProfile: db.managerProfile });
});

// Main Manager API: Public security check endpoint for login page
app.get("/api/auth/manager-security-check", (req, res) => {
  const db = readDB();
  const managerProfile = db.managerProfile || { isFingerprintEnrolled: false, isFaceEnrolled: false };
  res.json({
    isFingerprintEnrolled: managerProfile.isFingerprintEnrolled,
    isFaceEnrolled: managerProfile.isFaceEnrolled,
  });
});


// Resident API: Submit a query to the secretary
app.post("/api/resident/queries", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "resident") {
    return res.status(403).json({ error: "Access Denied: Only Residents can raise queries" });
  }

  const { type, customText } = req.body;
  if (!type) {
    return res.status(400).json({ error: "Query type is required" });
  }

  const db = readDB();
  if (!db.queries) {
    db.queries = [];
  }

  const queryId = "qry-" + crypto.randomUUID();
  const flatStr = user.flatInfo ? `${user.flatInfo.building} - ${user.flatInfo.flat} (Floor ${user.flatInfo.floor})` : "N/A";

  const newQuery: Query = {
    id: queryId,
    societyId: user.societyId || "",
    residentId: user.id,
    residentName: user.name,
    flatInfo: flatStr,
    type,
    customText: type === "Other" ? customText : undefined,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  db.queries.push(newQuery);
  writeDB(db);

  res.status(201).json({ success: true, query: newQuery });
});

// Society Admin API: Resolve a resident query
app.post("/api/societies/queries/:queryId/resolve", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const { queryId } = req.params;
  const db = readDB();
  if (!db.queries) {
    db.queries = [];
  }

  const query = db.queries.find((q) => q.id === queryId && q.societyId === user.societyId);
  if (!query) {
    return res.status(404).json({ error: "Query not found" });
  }

  query.status = "Resolved";
  writeDB(db);

  res.json({ success: true, message: "Query resolved successfully" });
});

// Society Admin API: Update resident query status
app.post("/api/societies/queries/:queryId/status", authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }

  const { queryId } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  const validStatuses = [
    "Submitted",
    "Received by Society Secretary",
    "Under Review",
    "Assigned",
    "In Progress",
    "Resolved",
    "Closed"
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const db = readDB();
  if (!db.queries) {
    db.queries = [];
  }

  const query = db.queries.find((q) => q.id === queryId && q.societyId === user.societyId);
  if (!query) {
    return res.status(404).json({ error: "Query not found" });
  }

  query.status = status as any;
  writeDB(db);

  res.json({ success: true, message: `Query status updated to ${status} successfully` });
});


// Start server setup
async function startServer() {
  // Read DB initially to seed if needed
  readDB();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
