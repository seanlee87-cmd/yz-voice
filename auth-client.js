import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCustomToken, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export async function authFetch(url, options={}) {
  const user = auth.currentUser;
  if (!user) throw new Error("NOT_LOGGED_IN");
  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type","application/json");
  return fetch(url,{...options,headers});
}
export function waitForAuth(){return new Promise(resolve=>{const u=onAuthStateChanged(auth,user=>{u();resolve(user);});});}
export async function requireUser(redirect="auth.html"){const u=await waitForAuth();if(!u){location.href=redirect;throw new Error("NOT_LOGGED_IN");}return u;}
export async function loginGoogle(){return signInWithPopup(auth,new GoogleAuthProvider());}
export async function loginCustomToken(token){return signInWithCustomToken(auth,token);}
export async function logout(){await signOut(auth);location.href="index.html";}
export async function uploadAvatar(file){const u=await requireUser();const target=ref(storage,`avatars/${u.uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g,"_")}`);await uploadBytes(target,file,{contentType:file.type});return getDownloadURL(target);}
export async function uploadRoomBackground(roomId,file){const u=await requireUser();const target=ref(storage,`room-backgrounds/${roomId}/${u.uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g,"_")}`);await uploadBytes(target,file,{contentType:file.type});return getDownloadURL(target);}
