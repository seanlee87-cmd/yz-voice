const {getAdmin}=require("./firebaseAdmin");
const {nick}=require("./http");
async function createProfile(uid,d={}){
 const admin=getAdmin(),db=admin.firestore(),userRef=db.collection("users").doc(uid),privRef=db.collection("user_private").doc(uid),counterRef=db.collection("meta").doc("counters");
 return db.runTransaction(async tx=>{
  const old=await tx.get(userRef); if(old.exists)return old.data();
  const nickname=String(d.nickname||"").trim(); if(nickname.length<2||nickname.length>20)throw new Error("INVALID_NICKNAME");
  if(!["male","female","other"].includes(d.gender))throw new Error("INVALID_GENDER");
  const m=Number(d.birthMonth),day=Number(d.birthDay),y=Number(d.birthYear),now=new Date().getFullYear();
  if(m<1||m>12||day<1||day>31||y<1900||y>now)throw new Error("INVALID_BIRTHDAY");
  const nk=encodeURIComponent(nick(nickname)),nref=db.collection("nicknames").doc(nk),ns=await tx.get(nref); if(ns.exists)throw new Error("NICKNAME_TAKEN");
  const cs=await tx.get(counterRef),seq=cs.exists&&Number.isInteger(cs.data().nextUserId)?cs.data().nextUserId:1000000,publicId=String(seq).padStart(8,"0");
  tx.set(counterRef,{nextUserId:seq+1},{merge:true}); tx.set(nref,{uid,nickname}); tx.set(db.collection("public_ids").doc(publicId),{uid});
  tx.set(userRef,{publicId,nickname,gender:d.gender,birthMonth:m,birthDay:day,avatarUrl:d.avatarUrl||"",createdAt:admin.firestore.FieldValue.serverTimestamp()});
  tx.set(privRef,{birthYear:y,coins:0,diamonds:0,termsAcceptedAt:admin.firestore.FieldValue.serverTimestamp()});
  return {publicId,nickname,gender:d.gender,birthMonth:m,birthDay:day,avatarUrl:d.avatarUrl||""};
 });
}
module.exports={createProfile};
