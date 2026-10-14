import React from "react";
import { createRoot } from "react-dom/client";
import { Landing } from "./components/Landing";
import { EdgeOreApp } from "./components/EdgeOreApp";
import "./styles.css";
const base="/Ore-Voxel-Mining";
function currentRoute(){return location.pathname.replace(/\/$/,"").replace(new RegExp("^"+base),"") || "/";}
function App(){
 const [path,setPath]=React.useState(currentRoute);
 React.useEffect(()=>{const onPop=()=>setPath(currentRoute());window.addEventListener("popstate",onPop);return()=>window.removeEventListener("popstate",onPop)},[]);
 const launch=()=>{history.pushState(null,"",base+"/game");setPath("/game");scrollTo(0,0)};
 return path==="/game"?<EdgeOreApp autostart/>:<Landing onLaunch={launch}/>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
