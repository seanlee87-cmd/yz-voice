const {getAdmin}=require("./firebaseAdmin");
function json(res,status,body){res.status(status).setHeader("Content-Type","application/json; charset=utf-8");return res.end(JSON.stringify(body));}
async function requireAuth(req){const h=req.headers.authorization||"";if(!h.startsWith("Bearer ")){const e=new Error("UNAUTHORIZED");e.status=401;throw e;}return getAdmin().auth().verifyIdToken(h.slice(7));}
function body(req){if(!req.body)return{};if(typeof req.body==="string"){try{return JSON.parse(req.body)}catch{return{}}}return req.body;}
function validatePassword(v){const s=String(v||"");return s.length>=8&&/[A-Za-z]/.test(s)&&/\d/.test(s);}
function nick(v){return String(v||"").trim().replace(/\s+/g," ").toLocaleLowerCase();}
module.exports={json,requireAuth,body,validatePassword,nick};
